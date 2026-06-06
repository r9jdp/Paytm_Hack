"use client";

import { Mic, Radio } from "lucide-react";

import styles from "./point-ask.module.css";

type VoiceSessionProps = {
  error: string | null;
  status: "idle" | "connecting" | "connected" | "fallback" | "error";
};

const labels = {
  idle: "Voice idle",
  connecting: "Connecting voice",
  connected: "Realtime voice",
  fallback: "Browser voice fallback",
  error: "Voice error"
};

export function VoiceSession({ error, status }: VoiceSessionProps) {
  return (
    <div className={styles.voiceSession} aria-label="Voice session status">
      <span>
        {status === "connected" ? <Radio aria-hidden="true" size={16} /> : <Mic aria-hidden="true" size={16} />}
        {labels[status]}
      </span>
      {error ? <span className={styles.voiceSessionError}>{error}</span> : null}
    </div>
  );
}
