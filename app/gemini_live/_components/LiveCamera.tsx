"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { CameraOff, Video } from "lucide-react";

import styles from "../styles.module.css";

export type LiveCameraHandle = {
  start: () => Promise<void>;
  stop: () => void;
  captureFrame: () => string | null;
};

export const LiveCamera = forwardRef<LiveCameraHandle>(function LiveCamera(_props, ref) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  async function start() {
    setPermissionError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionError("Camera is not available in this browser.");
      throw new Error("Camera is not available in this browser.");
    }

    const stream = await navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Camera permission was denied.";
        setPermissionError(message);
        throw new Error(message);
      });

    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }

    setIsActive(true);
  }

  function stop() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsActive(false);
  }

  function captureFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return null;

    const maxWidth = 768;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const width = Math.round(video.videoWidth * scale);
    const height = Math.round(video.videoHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return null;

    context.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.72);
  }

  useImperativeHandle(ref, () => ({ start, stop, captureFrame }));

  return (
    <div className={styles.cameraFrame}>
      <video ref={videoRef} playsInline muted className={styles.cameraVideo} aria-label="Live camera preview" />
      {!isActive ? (
        <div className={styles.cameraEmpty}>
          <Video aria-hidden="true" size={34} />
          <span>Camera preview appears here</span>
        </div>
      ) : null}
      {permissionError ? (
        <div className={styles.cameraError}>
          <CameraOff aria-hidden="true" size={18} />
          <span>{permissionError}</span>
        </div>
      ) : null}
    </div>
  );
});
