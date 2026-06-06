"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";

import styles from "./point-ask.module.css";

type ImageUploadFallbackProps = {
  onImageReady: (imageDataUrl: string) => void;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read this image."));
    image.src = src;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read this image."));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read this image."));
    reader.readAsDataURL(file);
  });
}

async function resizeImageFile(file: File) {
  const rawDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(rawDataUrl);
  const maxWidth = 1024;
  const scale = Math.min(1, maxWidth / image.naturalWidth);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is not available in this browser.");
  }

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

export function ImageUploadFallback({ onImageReady }: ImageUploadFallbackProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }

    setError(null);
    setIsReading(true);

    try {
      onImageReady(await resizeImageFile(file));
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "Could not read this image.");
    } finally {
      setIsReading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className={styles.uploadControl}>
      <input
        ref={inputRef}
        accept="image/*"
        className={styles.fileInput}
        onChange={(event) => void handleFile(event.target.files?.[0])}
        type="file"
      />
      <button
        className={styles.secondaryButton}
        disabled={isReading}
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        <Upload aria-hidden="true" size={16} />
        {isReading ? "Loading..." : "Upload Image Instead"}
      </button>
      {error ? <span className={styles.uploadError}>{error}</span> : null}
    </div>
  );
}
