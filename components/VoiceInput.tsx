"use client";

import { Mic, MicOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import styles from "./point-ask.module.css";

type BrowserSpeechResult = {
  0: {
    transcript: string;
  };
  isFinal: boolean;
  length: number;
};

type BrowserSpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<BrowserSpeechResult>;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type BrowserSpeechWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };

type VoiceInputProps = {
  disabled?: boolean;
  onTranscript: (transcript: string) => void;
};

export function VoiceInput({ disabled = false, onTranscript }: VoiceInputProps) {
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const [isSupported] = useState(() => {
    if (typeof window === "undefined") return true;

    const speechWindow = window as BrowserSpeechWindow;
    return Boolean(speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition);
  });
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const speechWindow = window as BrowserSpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognition.onresult = (event) => {
      let transcript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }

      onTranscript(transcript.trim());
    };
    recognition.onerror = (event) => {
      setError(event.error ? `Voice input failed: ${event.error}` : "Voice input failed.");
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [onTranscript]);

  function toggleListening() {
    if (!recognitionRef.current || disabled) return;

    setError(null);

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      setError("Voice input is already starting. Try again in a moment.");
    }
  }

  if (!isSupported) {
    return <span className={styles.voiceNote}>Voice input unavailable in this browser.</span>;
  }

  return (
    <div className={styles.voiceWrap}>
      <button
        className={`${styles.iconButton} ${isListening ? styles.iconButtonActive : ""}`}
        disabled={disabled}
        onClick={toggleListening}
        title={isListening ? "Stop voice input" : "Start voice input"}
        type="button"
      >
        {isListening ? <MicOff aria-hidden="true" size={18} /> : <Mic aria-hidden="true" size={18} />}
        <span>{isListening ? "Listening" : "Voice"}</span>
      </button>
      {error ? <span className={styles.voiceError}>{error}</span> : null}
    </div>
  );
}
