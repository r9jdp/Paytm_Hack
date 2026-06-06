"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";

import { analyzeFrame } from "../_lib/analyze-client";
import type { AnalyzeFrameResponse, CatalogItem, MerchantContext } from "../_lib/types";
import type { LiveCameraHandle } from "../_components/LiveCamera";

type UseFrameScannerOptions = {
  cameraRef: RefObject<LiveCameraHandle | null>;
  scanId: string;
  catalog: CatalogItem[];
  transcriptSoFar: string;
  merchantContext: MerchantContext;
  onResponse: (response: AnalyzeFrameResponse) => void;
  onError: (message: string) => void;
  onStatus: (status: "requesting_permission" | "scanning" | "analyzing" | "paused" | "permission_denied" | "error") => void;
};

export function useFrameScanner({
  cameraRef,
  scanId,
  catalog,
  transcriptSoFar,
  merchantContext,
  onResponse,
  onError,
  onStatus
}: UseFrameScannerOptions) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlightRef = useRef(false);
  const latestRef = useRef({ catalog, transcriptSoFar, merchantContext });
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    latestRef.current = { catalog, transcriptSoFar, merchantContext };
  }, [catalog, transcriptSoFar, merchantContext]);

  const stopScan = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    cameraRef.current?.stop();
    setIsScanning(false);
    setIsAnalyzing(false);
    inFlightRef.current = false;
    onStatus("paused");
  }, [cameraRef, onStatus]);

  const analyzeCurrentFrame = useCallback(async () => {
    if (inFlightRef.current) return;

    const frameBase64 = cameraRef.current?.captureFrame();
    if (!frameBase64) {
      onError("No camera frame is ready yet. Start the camera or use demo shelf data.");
      return;
    }

    inFlightRef.current = true;
    setIsAnalyzing(true);
    onStatus("analyzing");

    try {
      const latest = latestRef.current;
      const response = await analyzeFrame({
        scanId,
        frameBase64,
        transcriptSoFar: latest.transcriptSoFar,
        currentCatalog: latest.catalog,
        merchantContext: latest.merchantContext
      });
      onResponse(response);
      onStatus("scanning");
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not analyze the frame.");
      onStatus("error");
    } finally {
      inFlightRef.current = false;
      setIsAnalyzing(false);
    }
  }, [cameraRef, onError, onResponse, onStatus, scanId]);

  const startScan = useCallback(async () => {
    onStatus("requesting_permission");

    try {
      await cameraRef.current?.start();
    } catch {
      onStatus("permission_denied");
      onError("Camera permission is blocked. You can still use manual transcript and demo shelf data.");
      return;
    }

    setIsScanning(true);
    onStatus("scanning");
    void analyzeCurrentFrame();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      void analyzeCurrentFrame();
    }, 2000);
  }, [analyzeCurrentFrame, cameraRef, onError, onStatus]);

  useEffect(() => stopScan, [stopScan]);

  return { isScanning, isAnalyzing, startScan, stopScan, analyzeCurrentFrame };
}
