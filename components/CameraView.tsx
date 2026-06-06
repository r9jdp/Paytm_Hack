"use client";

import { Camera, CameraOff, ImagePlus, RotateCcw, Square } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from "react";

import { ImageUploadFallback } from "@/components/ImageUploadFallback";

import styles from "./point-ask.module.css";

export type CameraViewHandle = {
  captureFrame: () => string | null;
  start: () => Promise<void>;
  stop: () => void;
};

type CameraStatus = "idle" | "starting" | "active" | "error";

type CameraViewProps = {
  onSourceTypeChange?: (sourceType: "camera" | "upload") => void;
};

export const CameraView = forwardRef<CameraViewHandle, CameraViewProps>(function CameraView(
  { onSourceTypeChange },
  ref
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStatus((current) => (current === "active" || current === "starting" ? "idle" : current));
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setUploadedImage(null);
    setStatus("starting");
    onSourceTypeChange?.("camera");

    if (!navigator.mediaDevices?.getUserMedia) {
      const message = "Camera is not available in this browser. Upload an image instead.";
      setStatus("error");
      setError(message);
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

      setStatus("active");
    } catch (unknownError) {
      const message =
        unknownError instanceof Error && unknownError.message
          ? unknownError.message
          : "Camera permission was blocked. Please allow camera access or upload an image.";
      setStatus("error");
      setError(message);
      throw new Error(message);
    }
  }, [onSourceTypeChange, stop]);

  const captureFrame = useCallback(() => {
    if (uploadedImage) {
      return uploadedImage;
    }

    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      return null;
    }

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
  }, [uploadedImage]);

  function handleUploadedImage(imageDataUrl: string) {
    stop();
    setUploadedImage(imageDataUrl);
    setError(null);
    setStatus("idle");
    onSourceTypeChange?.("upload");
  }

  useImperativeHandle(ref, () => ({ captureFrame, start, stop }), [captureFrame, start, stop]);

  useEffect(() => stop, [stop]);

  const statusLabel =
    status === "active"
      ? "Camera is live"
      : uploadedImage
        ? "Uploaded image ready"
        : status === "starting"
          ? "Starting camera..."
          : "Camera is idle";

  return (
    <section className={styles.card} aria-label="Live camera preview">
      <div className={styles.cardHeader}>
        <div>
          <p className={styles.cardEyebrow}>Camera Card</p>
          <h2>Live camera preview</h2>
        </div>
        <span className={`${styles.statusDot} ${status === "active" ? styles.statusLive : ""}`}>
          {statusLabel}
        </span>
      </div>

      <div className={styles.cameraStage}>
        {uploadedImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.uploadPreview} src={uploadedImage} alt="Uploaded fallback preview" />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            className={styles.cameraVideo}
            aria-label="Live camera feed"
          />
        )}

        {status !== "active" && !uploadedImage ? (
          <div className={styles.cameraEmpty}>
            {status === "error" ? (
              <CameraOff aria-hidden="true" size={42} />
            ) : (
              <Camera aria-hidden="true" size={42} />
            )}
            <span>{status === "starting" ? "Starting camera..." : "Point your camera at anything"}</span>
          </div>
        ) : null}
      </div>

      {error ? <p className={styles.inlineError}>{error}</p> : null}

      <div className={styles.cameraActions}>
        <button className={styles.primaryButton} disabled={status === "starting"} onClick={() => void start()} type="button">
          <Camera aria-hidden="true" size={18} />
          {status === "active" ? "Restart Camera" : "Start Camera"}
        </button>
        {status === "active" ? (
          <button className={styles.secondaryButton} onClick={stop} type="button">
            <Square aria-hidden="true" size={16} />
            Stop
          </button>
        ) : null}
        {uploadedImage ? (
          <button
            className={styles.secondaryButton}
            onClick={() => {
              setUploadedImage(null);
              onSourceTypeChange?.("camera");
            }}
            type="button"
          >
            <RotateCcw aria-hidden="true" size={16} />
            Reset Image
          </button>
        ) : null}
      </div>

      <div className={styles.uploadBand}>
        <span>
          <ImagePlus aria-hidden="true" size={17} />
          Camera blocked or testing on desktop?
        </span>
        <ImageUploadFallback onImageReady={handleUploadedImage} />
      </div>
    </section>
  );
});
