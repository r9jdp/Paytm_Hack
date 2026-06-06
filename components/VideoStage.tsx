"use client";

import { Camera, Loader2, RotateCcw, Square } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from "react";

import styles from "./point-ask.module.css";

export type VideoStageHandle = {
  captureFrame: () => string | null;
  start: () => Promise<void>;
  stop: () => void;
};

type VideoStageProps = {
  isRunning: boolean;
  onReset: () => void;
  onStart: () => void;
  onStop: () => void;
  statusText: string;
};

export const VideoStage = forwardRef<VideoStageHandle, VideoStageProps>(function VideoStage(
  { isRunning, onReset, onStart, onStop, statusText },
  ref
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const start = useCallback(async () => {
    setIsStarting(true);
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      const message = "Camera is not available in this browser.";
      setError(message);
      setIsStarting(false);
      throw new Error(message);
    }

    try {
      stop();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (unknownError) {
      const message =
        unknownError instanceof Error && unknownError.message
          ? unknownError.message
          : "Camera permission was blocked.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsStarting(false);
    }
  }, [stop]);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return null;

    const maxWidth = 1024;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const width = Math.round(video.videoWidth * scale);
    const height = Math.round(video.videoHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return null;

    context.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.78);
  }, []);

  useImperativeHandle(ref, () => ({ captureFrame, start, stop }), [captureFrame, start, stop]);
  useEffect(() => stop, [stop]);

  return (
    <section className={styles.videoShell} aria-label="Live onboarding video">
      <video ref={videoRef} playsInline muted className={styles.onboardingVideo} />

      {!isRunning ? (
        <div className={styles.videoIdle}>
          <Camera aria-hidden="true" size={42} />
          <span>One video frame for product inventory</span>
        </div>
      ) : null}

      <div className={styles.videoTopBar}>
        <span className={styles.liveBadge}>{isRunning ? "Live" : "Ready"}</span>
        <span>{statusText}</span>
      </div>

      {error ? <p className={styles.videoError}>{error}</p> : null}

      <div className={styles.videoControls}>
        <button className={styles.primaryButton} disabled={isStarting || isRunning} onClick={onStart} type="button">
          {isStarting ? <Loader2 aria-hidden="true" size={18} /> : <Camera aria-hidden="true" size={18} />}
          {isStarting ? "Starting..." : "Start"}
        </button>
        <button className={styles.secondaryButton} disabled={!isRunning} onClick={onStop} type="button">
          <Square aria-hidden="true" size={16} />
          Stop
        </button>
        <button className={styles.secondaryButton} onClick={onReset} type="button">
          <RotateCcw aria-hidden="true" size={16} />
          Reset
        </button>
      </div>
    </section>
  );
});
