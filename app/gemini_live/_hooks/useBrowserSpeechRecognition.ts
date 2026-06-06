"use client";

import { useEffect, useRef, useState } from "react";

type SpeechRecognitionResultItem = {
  transcript: string;
};

type SpeechRecognitionResult = {
  isFinal: boolean;
  [index: number]: SpeechRecognitionResultItem;
};

type SpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResult;
  };
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type SpeechWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

export function useBrowserSpeechRecognition(onText: (text: string) => void) {
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const [isSupported] = useState(() => {
    if (typeof window === "undefined") return false;
    const speechWindow = window as SpeechWindow;
    return Boolean(speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition);
  });
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      onText(transcript.trim());
    };
    recognition.onerror = () => {
      setError("Browser speech recognition stopped. Manual transcript still works.");
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [onText]);

  function start() {
    if (!recognitionRef.current) return;
    setError(null);
    recognitionRef.current.start();
    setIsListening(true);
  }

  function stop() {
    recognitionRef.current?.stop();
    setIsListening(false);
  }

  return { isSupported, isListening, error, start, stop };
}
