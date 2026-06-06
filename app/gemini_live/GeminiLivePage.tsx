"use client";

import Link from "next/link";
import { ArrowLeft, Box, CheckCircle2, CircleAlert, ScanLine } from "lucide-react";
import { useCallback, useRef } from "react";

import { AssistantPanel } from "./_components/AssistantPanel";
import { CatalogReviewPanel } from "./_components/CatalogReviewPanel";
import { LiveCamera, type LiveCameraHandle } from "./_components/LiveCamera";
import { ProductCard } from "./_components/ProductCard";
import { ScanControls } from "./_components/ScanControls";
import { VoicePanel } from "./_components/VoicePanel";
import { useFrameScanner } from "./_hooks/useFrameScanner";
import type { AnalyzeFrameResponse } from "./_lib/types";
import { GeminiLiveProvider, useGeminiLiveStore } from "./_state/scan-store";
import styles from "./styles.module.css";

type GeminiLivePageProps = {
  access: "signed_out" | "wrong_role" | "merchant";
  userName: string | null;
};

export function GeminiLivePage(props: GeminiLivePageProps) {
  return (
    <GeminiLiveProvider>
      <GeminiLivePageContent {...props} />
    </GeminiLiveProvider>
  );
}

function GeminiLivePageContent({ access, userName }: GeminiLivePageProps) {
  const cameraRef = useRef<LiveCameraHandle | null>(null);
  const { state, dispatch } = useGeminiLiveStore();

  const handleResponse = useCallback(
    (response: AnalyzeFrameResponse) => {
      dispatch({
        type: "SET_ASSISTANT",
        message: response.assistantMessage,
        followUpQuestion: response.followUpQuestion,
        warnings: response.warnings
      });
      dispatch({ type: "MERGE_CANDIDATES", candidates: response.products });
    },
    [dispatch]
  );

  const handleError = useCallback(
    (message: string) => {
      dispatch({
        type: "SET_ASSISTANT",
        message,
        followUpQuestion: "Try demo shelf data, or move closer and analyze the current frame.",
        warnings: [message]
      });
    },
    [dispatch]
  );

  const scanner = useFrameScanner({
    cameraRef,
    scanId: state.scanId,
    catalog: state.catalog,
    transcriptSoFar: state.transcriptSoFar,
    merchantContext: state.merchantContext,
    onResponse: handleResponse,
    onError: handleError,
    onStatus: (status) => dispatch({ type: "SET_STATUS", status })
  });

  if (access !== "merchant") {
    return (
      <main className={styles.gateShell}>
        <section className={styles.gateCard}>
          <span className={styles.gateIcon}>
            <CircleAlert aria-hidden="true" size={24} />
          </span>
          <h1>{access === "signed_out" ? "Sign in to scan a shop." : "Merchant mode is required."}</h1>
          <p>
            {access === "signed_out"
              ? "The live shop scanner uses the Paytm Vision role setup before starting camera capture."
              : "Switch to a merchant role on the home screen before starting the catalog scanner."}
          </p>
          <Link className={styles.primaryAction} href="/">
            <ArrowLeft aria-hidden="true" size={17} />
            Back to home
          </Link>
        </section>
      </main>
    );
  }

  const confirmedCount = state.catalog.filter((item) => item.status === "confirmed").length;

  return (
    <main className={styles.scanShell}>
      <header className={styles.scanHeader}>
        <Link className={styles.backLink} href="/">
          <ArrowLeft aria-hidden="true" size={17} />
          Home
        </Link>
        <div>
          <p className={styles.eyebrow}>Gemini Live-like shop scan</p>
          <h1>Create catalog from camera + voice</h1>
          <p>
            {userName ? `${userName}, show one shelf at a time.` : "Show one shelf at a time."} Products
            appear live as the scanner reads frames and transcript context.
          </p>
        </div>
        <div className={styles.statusStack} aria-label="Scan stats">
          <span>
            <ScanLine aria-hidden="true" size={16} />
            {state.status.replace("_", " ")}
          </span>
          <span>
            <CheckCircle2 aria-hidden="true" size={16} />
            {confirmedCount}/{state.catalog.length} confirmed
          </span>
        </div>
      </header>

      <section className={styles.scanGrid}>
        <div className={styles.cameraColumn}>
          <LiveCamera ref={cameraRef} />
          <ScanControls
            hasCatalog={state.catalog.length > 0}
            isAnalyzing={scanner.isAnalyzing}
            isScanning={scanner.isScanning}
            onAnalyze={() => void scanner.analyzeCurrentFrame()}
            onConfirmAll={() => dispatch({ type: "CONFIRM_ALL" })}
            onStart={() => void scanner.startScan()}
            onStop={scanner.stopScan}
            onUseDemo={() => dispatch({ type: "LOAD_SAMPLE_DATA" })}
          />
        </div>

        <div className={styles.sidePanel}>
          <AssistantPanel />
          <VoicePanel />

          <section className={styles.detectedPanel} aria-label="Detected products">
            <div className={styles.sectionHeading}>
              <Box aria-hidden="true" size={18} />
              <div>
                <h2>Detected products</h2>
                <p>New candidates merge into the catalog without overwriting confirmed merchant edits.</p>
              </div>
            </div>
            <div className={styles.productList}>
              {state.catalog.length ? (
                state.catalog.map((item) => <ProductCard item={item} key={item.id} />)
              ) : (
                <p className={styles.emptyState}>No products yet. Start scan or load demo shelf data.</p>
              )}
            </div>
          </section>
        </div>
      </section>

      <CatalogReviewPanel />
    </main>
  );
}
