"use client";

import { BrainCircuit, Database, ScanLine, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AnswerPanel } from "@/components/AnswerPanel";
import { AskPanel } from "@/components/AskPanel";
import { CameraView, type CameraViewHandle } from "@/components/CameraView";
import { ChatHistory } from "@/components/ChatHistory";
import { clearChatItems, listChatItems, saveChatItem } from "@/lib/chat-storage";
import type { AskMode, AskResponse, ChatItem } from "@/lib/types";

import styles from "./point-ask.module.css";

const loadingLabels: Record<AskMode, string> = {
  general: "Looking at the scene...",
  extract: "Reading visible text...",
  catalog: "Extracting products..."
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toApiHistory(items: ChatItem[]) {
  return items
    .slice(0, 6)
    .reverse()
    .flatMap((item) => [
      { role: "user" as const, content: item.question },
      { role: "assistant" as const, content: item.answer }
    ]);
}

export function PointAskApp() {
  const cameraRef = useRef<CameraViewHandle | null>(null);
  const [mode, setMode] = useState<AskMode>("general");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  const [history, setHistory] = useState<ChatItem[]>([]);
  const [frameSource, setFrameSource] = useState<"camera" | "upload">("camera");
  const [isAsking, setIsAsking] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState(loadingLabels.general);
  const [error, setError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    listChatItems()
      .then((items) => {
        if (mounted) setHistory(items);
      })
      .catch(() => {
        if (mounted) {
          setStorageError("Local history could not be loaded in this browser.");
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function handleAsk() {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      setError("Please ask a question first.");
      return;
    }

    setError(null);
    setIsAsking(true);
    setLoadingLabel("Capturing frame...");

    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const frameBase64 = cameraRef.current?.captureFrame();
      if (!frameBase64) {
        setError("Start the camera or upload an image before asking.");
        return;
      }

      setLoadingLabel(loadingLabels[mode]);

      const response = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: trimmedQuestion,
          frameBase64,
          mode,
          chatHistory: toApiHistory(history)
        })
      });

      const data = (await response.json().catch(() => null)) as
        | (AskResponse & { error?: string })
        | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Could not analyze the frame. Try again with a clearer view.");
      }

      if (!data?.answer) {
        throw new Error("The answer was empty. Try again with a clearer frame.");
      }

      const askResponse: AskResponse = {
        answer: data.answer,
        observations: data.observations ?? [],
        extractedItems: data.extractedItems ?? []
      };

      setAnswer(askResponse);

      const item: ChatItem = {
        id: createId(),
        question: trimmedQuestion,
        answer: askResponse.answer,
        frameThumbnail: frameBase64,
        createdAt: new Date().toISOString(),
        mode,
        observations: askResponse.observations,
        extractedItems: askResponse.extractedItems,
        sourceType: frameSource
      };

      setHistory((current) => [item, ...current].slice(0, 25));
      setQuestion("");

      saveChatItem(item)
        .then((items) => setHistory(items))
        .catch(() => setStorageError("This answer was shown, but could not be saved locally."));
    } catch (unknownError) {
      setError(
        unknownError instanceof Error
          ? unknownError.message
          : "Could not analyze the frame. Try again with a clearer view."
      );
    } finally {
      setIsAsking(false);
      setLoadingLabel(loadingLabels[mode]);
    }
  }

  async function handleClearHistory() {
    setStorageError(null);
    setHistory([]);

    try {
      await clearChatItems();
    } catch {
      setStorageError("Local history could not be cleared in this browser.");
    }
  }

  return (
    <main className={styles.shell}>
      <section className={styles.hero} aria-labelledby="point-ask-title">
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>
            <ScanLine aria-hidden="true" size={16} />
            Live visual assistant
          </span>
          <h1 id="point-ask-title">Point & Ask AI</h1>
          <p>Ask questions about what your camera sees.</p>
        </div>
        <div className={styles.heroPills} aria-label="Feature notes">
          <span>
            <ShieldCheck aria-hidden="true" size={16} />
            Server-side API key
          </span>
          <span>
            <Database aria-hidden="true" size={16} />
            Local history
          </span>
          <span>
            <BrainCircuit aria-hidden="true" size={16} />
            Mock fallback
          </span>
        </div>
      </section>

      <section className={styles.workspace} aria-label="Point and ask workspace">
        <div className={styles.cameraColumn}>
          <CameraView ref={cameraRef} onSourceTypeChange={setFrameSource} />
        </div>

        <div className={styles.controlColumn}>
          <AskPanel
            disabled={isAsking}
            isAsking={isAsking}
            loadingLabel={loadingLabel}
            mode={mode}
            onAsk={() => void handleAsk()}
            onModeChange={setMode}
            onQuestionChange={setQuestion}
            onVoiceTranscript={setQuestion}
            question={question}
          />
          <AnswerPanel error={error} isLoading={isAsking} loadingLabel={loadingLabel} response={answer} />
        </div>
      </section>

      {storageError ? <p className={styles.storageWarning}>{storageError}</p> : null}

      <ChatHistory items={history.slice(0, 10)} onClear={() => void handleClearHistory()} />
    </main>
  );
}
