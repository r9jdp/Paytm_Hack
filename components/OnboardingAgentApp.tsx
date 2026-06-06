"use client";

import { PackageCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { OnboardingStatusOverlay } from "@/components/OnboardingStatusOverlay";
import { StorefrontJsonPanel } from "@/components/StorefrontJsonPanel";
import { useOnboardingVoiceSession } from "@/components/useOnboardingVoiceSession";
import { VideoStage, type VideoStageHandle } from "@/components/VideoStage";
import { VoiceSession } from "@/components/VoiceSession";
import { saveStorefrontExport } from "@/lib/onboarding-storage";
import type {
  InventoryItem,
  OnboardingExtractionResponse,
  OnboardingStage,
  SourceFrame,
  StorefrontExport,
  TranscriptEntry
} from "@/lib/types";

import styles from "./point-ask.module.css";

const INVENTORY_PROMPT =
  "Let's get your product inventory. Please show me the products and tell me what inventory you have and in what quantity.";
const EXPORT_PROMPT = "Ok, creating your storefront.";

async function saveProductsToDatabase(payload: StorefrontExport) {
  if (!payload.inventory.length) return;

  const response = await fetch("/api/onboarding/products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      exportId: payload.id,
      products: payload.inventory
    })
  });

  const data = (await response.json().catch(() => null)) as { error?: string } | null;

  if (!response.ok) {
    throw new Error(data?.error ?? "Could not save products to the database.");
  }
}

function createId(prefix = "id") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mergeInventoryItems(current: InventoryItem[], incoming: InventoryItem[]) {
  const byName = new Map(current.map((item) => [item.name.trim().toLowerCase(), item]));

  for (const item of incoming) {
    const key = item.name.trim().toLowerCase();
    const existing = byName.get(key);

    if (!existing || item.confidence >= existing.confidence) {
      byName.set(key, {
        ...existing,
        ...item,
        id: existing?.id ?? item.id ?? createId("item"),
        evidence: {
          visual: item.evidence.visual ?? existing?.evidence.visual ?? null,
          voice: item.evidence.voice ?? existing?.evidence.voice ?? null
        }
      });
    }
  }

  return Array.from(byName.values());
}

function userSaidDone(transcript: string) {
  return /\b(done|finished|that's all|that is all|complete|create storefront|create the storefront|ho gaya|bas)\b/i.test(
    transcript
  );
}

export function OnboardingAgentApp() {
  const videoRef = useRef<VideoStageHandle | null>(null);
  const extractionInFlightRef = useRef(false);
  const inventoryStartedAtRef = useRef<number | null>(null);
  const inventoryScansRef = useRef(0);
  const exportCreatedRef = useRef(false);
  const draftSaveFailedRef = useRef(false);
  const sessionIdRef = useRef(createId("storefront"));
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const sourceFramesRef = useRef<SourceFrame[]>([]);
  const inventoryRef = useRef<InventoryItem[]>([]);

  const [stage, setStage] = useState<OnboardingStage>("idle");
  const [isRunning, setIsRunning] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [sourceFrames, setSourceFrames] = useState<SourceFrame[]>([]);
  const [exportPayload, setExportPayload] = useState<StorefrontExport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const appendTranscript = useCallback((role: TranscriptEntry["role"], text: string) => {
    const cleaned = text.trim();
    if (!cleaned) return;

    setTranscript((current) => {
      const last = current.at(-1);
      if (last?.role === role && last.text.trim().toLowerCase() === cleaned.toLowerCase()) {
        return current;
      }

      const next = [
        ...current,
        {
          id: createId("transcript"),
          role,
          text: cleaned,
          createdAt: new Date().toISOString()
        }
      ].slice(-60);

      transcriptRef.current = next;
      return next;
    });
  }, []);

  const voice = useOnboardingVoiceSession({
    onAssistantTranscript: (text) => appendTranscript("assistant", text),
    onUserTranscript: (text) => appendTranscript("user", text)
  });

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    sourceFramesRef.current = sourceFrames;
  }, [sourceFrames]);

  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  function rememberFrame(stageName: SourceFrame["stage"], frameBase64: string) {
    setSourceFrames((current) => {
      const frame: SourceFrame = {
        id: createId("frame"),
        stage: stageName,
        frameBase64,
        capturedAt: new Date().toISOString()
      };

      const next = [...current, frame].filter((item) => item.stage === "inventory").slice(-7);

      sourceFramesRef.current = next;
      return next;
    });
  }

  const buildExport = useCallback((finalInventory: InventoryItem[]) => {
    return {
      id: sessionIdRef.current,
      createdAt: new Date().toISOString(),
      inventory: finalInventory,
      transcript: transcriptRef.current,
      sourceFrames: sourceFramesRef.current
    } satisfies StorefrontExport;
  }, []);

  const finalizeExport = useCallback(
    async (finalInventory: InventoryItem[]) => {
      if (exportCreatedRef.current) return;

      exportCreatedRef.current = true;
      setStage("export_ready");
      const payload = buildExport(finalInventory);
      await saveStorefrontExport(payload).catch(() => {
        setError("Export was generated, but local IndexedDB storage failed.");
      });
      try {
        await saveProductsToDatabase(payload);
      } catch (unknownError) {
        setError(
          unknownError instanceof Error
            ? unknownError.message
            : "Export was generated, but product database storage failed."
        );
        return;
      }
      setExportPayload(payload);
      voice.speak(EXPORT_PROMPT);
    },
    [buildExport, voice]
  );

  useEffect(() => {
    if (!isRunning && stage !== "export_ready") return undefined;
    if (!inventory.length && !transcript.length && !sourceFrames.length) return undefined;

    const timer = window.setTimeout(() => {
      void saveStorefrontExport(buildExport(inventoryRef.current)).catch(() => {
        if (draftSaveFailedRef.current) return;

        draftSaveFailedRef.current = true;
        setError("Local IndexedDB autosave failed.");
      });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [buildExport, inventory.length, isRunning, sourceFrames.length, stage, transcript.length]);

  async function extractFrame(stageName: "inventory", frameBase64: string) {
    const response = await fetch("/api/onboarding/extract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        stage: stageName,
        frameBase64,
        transcript: transcriptRef.current.map((entry) => `${entry.role}: ${entry.text}`).join("\n"),
        previousState: {
          inventory: inventoryRef.current
        }
      })
    });

    const data = (await response.json().catch(() => null)) as
      | (OnboardingExtractionResponse & { error?: string })
      | null;

    if (!response.ok || !data) {
      throw new Error(data?.error ?? "Could not extract onboarding data from the frame.");
    }

    return data;
  }

  const runInventoryScan = useCallback(async () => {
    if (extractionInFlightRef.current || stage !== "inventory_scanning") return;

    const frameBase64 = videoRef.current?.captureFrame();
    if (!frameBase64) return;

    extractionInFlightRef.current = true;
    setIsExtracting(true);

    try {
      const data = await extractFrame("inventory", frameBase64);
      inventoryScansRef.current += 1;

      if (data.inventory) {
        const nextInventory = mergeInventoryItems(inventoryRef.current, data.inventory.items);
        setInventory(nextInventory);
        inventoryRef.current = nextInventory;

        if (data.inventory.items.length) {
          rememberFrame("inventory", frameBase64);
        }

        const shouldFinish =
          nextInventory.length > 0 && userSaidDone(transcriptRef.current.map((entry) => entry.text).join(" "));

        if (shouldFinish) {
          await finalizeExport(nextInventory);
        }
      }
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "Inventory extraction failed.");
    } finally {
      extractionInFlightRef.current = false;
      setIsExtracting(false);
    }
  }, [finalizeExport, stage]);

  useEffect(() => {
    if (stage !== "inventory_scanning") return undefined;

    const interval = window.setInterval(() => void runInventoryScan(), 2000);
    void runInventoryScan();

    return () => window.clearInterval(interval);
  }, [runInventoryScan, stage]);

  async function startOnboarding() {
    setError(null);
    setStage("idle");
    setInventory([]);
    setTranscript([]);
    setSourceFrames([]);
    setExportPayload(null);
    sessionIdRef.current = createId("storefront");
    exportCreatedRef.current = false;
    draftSaveFailedRef.current = false;
    inventoryRef.current = [];
    transcriptRef.current = [];
    sourceFramesRef.current = [];

    try {
      await videoRef.current?.start();
      setIsRunning(true);
      await voice.start();
      setStage("inventory_prompt");
      voice.speak(INVENTORY_PROMPT);
      window.setTimeout(() => {
        inventoryStartedAtRef.current = Date.now();
        inventoryScansRef.current = 0;
        setStage("inventory_scanning");
      }, 1200);
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "Could not start camera or voice.");
      setIsRunning(false);
      setStage("idle");
    }
  }

  function stopOnboarding() {
    videoRef.current?.stop();
    voice.stop();
    setIsRunning(false);
    setStage((current) => (current === "export_ready" ? current : "idle"));
  }

  function finishInventory() {
    const finalInventory = inventoryRef.current;
    if (!finalInventory.length || stage === "export_ready") return;

    void finalizeExport(finalInventory);
  }

  function resetOnboarding() {
    stopOnboarding();
    setStage("idle");
    setInventory([]);
    setTranscript([]);
    setSourceFrames([]);
    setExportPayload(null);
    setError(null);
    sessionIdRef.current = createId("storefront");
    exportCreatedRef.current = false;
    draftSaveFailedRef.current = false;
    inventoryRef.current = [];
    transcriptRef.current = [];
    sourceFramesRef.current = [];
  }

  const statusText =
    stage === "inventory_scanning"
      ? "Show products and speak quantities"
      : stage === "export_ready"
        ? "Export ready"
        : "Voice-led inventory capture";

  return (
    <main className={styles.onboardingShell}>
      <section className={styles.onboardingHeader} aria-labelledby="onboarding-title">
        <div>
          <span className={styles.eyebrow}>Merchant inventory agent</span>
          <h1 id="onboarding-title">Product inventory, captured by voice and video.</h1>
        </div>
        <VoiceSession error={voice.error} status={voice.status} />
      </section>

      <section className={styles.onboardingWorkspace}>
        <div className={styles.stageStack}>
          <VideoStage
            ref={videoRef}
            isRunning={isRunning}
            onReset={resetOnboarding}
            onStart={() => void startOnboarding()}
            onStop={stopOnboarding}
            statusText={statusText}
          />
          <OnboardingStatusOverlay
            inventory={inventory}
            isExtracting={isExtracting}
            stage={stage}
            transcript={transcript}
          />
        </div>

        <aside className={styles.captureSummary} aria-label="Captured data summary">
          <div className={styles.privacyNotice}>
            <PackageCheck aria-hidden="true" size={18} />
            <span>Prototype only. Inventory exports are stored locally in this browser.</span>
          </div>

          <section>
            <h2>Inventory</h2>
            {inventory.length ? (
              <>
                <div className={styles.inventoryList}>
                  {inventory.map((item) => (
                    <article key={item.id}>
                      <strong>{item.name}</strong>
                      <span>
                        {item.quantity ?? "?"} {item.unit || "units"}
                        {item.price ? ` · ${item.price}` : ""}
                      </span>
                    </article>
                  ))}
                </div>
                {stage !== "export_ready" ? (
                  <button
                    className={styles.primaryButton}
                    disabled={isExtracting}
                    onClick={finishInventory}
                    type="button"
                  >
                    <PackageCheck aria-hidden="true" size={16} />
                    Finish inventory
                  </button>
                ) : null}
              </>
            ) : (
              <p className={styles.emptyCopy}>Waiting for inventory capture.</p>
            )}
          </section>
        </aside>
      </section>

      {error ? <p className={styles.inlineError}>{error}</p> : null}

      <StorefrontJsonPanel payload={exportPayload} />
    </main>
  );
}
