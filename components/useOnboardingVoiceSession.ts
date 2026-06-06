"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type VoiceStatus = "idle" | "connecting" | "connected" | "fallback" | "error";

type VoiceSessionOptions = {
  onAssistantTranscript: (text: string) => void;
  onUserTranscript: (text: string) => void;
};

type RealtimeEvent = {
  type?: string;
  delta?: string;
  transcript?: string;
  error?: {
    message?: string;
  };
};

type RealtimeTokenResponse = {
  value?: string;
  error?: string;
  details?: {
    error?: {
      message?: string;
    };
  };
};

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

function speakWithBrowser(text: string) {
  if (typeof speechSynthesis === "undefined") return;

  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.96;
  utterance.pitch = 1;
  speechSynthesis.speak(utterance);
}

export function useOnboardingVoiceSession({
  onAssistantTranscript,
  onUserTranscript
}: VoiceSessionOptions) {
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const activeRef = useRef(false);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const stopBrowserRecognition = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
  }, []);

  const startBrowserRecognition = useCallback(() => {
    if (typeof window === "undefined") return;

    const speechWindow = window as BrowserSpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) return;

    stopBrowserRecognition();

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-IN";
    recognition.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript?.trim();
        if (result.isFinal && transcript) {
          onUserTranscript(transcript);
        }
      }
    };
    recognition.onerror = () => {
      // Realtime audio still works without browser transcripts, so keep this quiet.
    };
    recognition.onend = () => {
      if (!activeRef.current) return;
      window.setTimeout(() => {
        try {
          recognition.start();
        } catch {
          // Some browsers need a moment before restarting recognition.
        }
      }, 350);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
    }
  }, [onUserTranscript, stopBrowserRecognition]);

  const stop = useCallback(() => {
    activeRef.current = false;
    stopBrowserRecognition();
    channelRef.current?.close();
    channelRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current.remove();
      audioRef.current = null;
    }
    setStatus("idle");
  }, [stopBrowserRecognition]);

  const handleRealtimeEvent = useCallback(
    (event: RealtimeEvent) => {
      if (event.type === "conversation.item.input_audio_transcription.completed" && event.transcript) {
        onUserTranscript(event.transcript);
      }

      if (event.type === "response.output_audio_transcript.done" && event.transcript) {
        onAssistantTranscript(event.transcript);
      }

      if (event.type === "error") {
        setError(event.error?.message ?? "Realtime voice session error.");
      }
    },
    [onAssistantTranscript, onUserTranscript]
  );

  const start = useCallback(async () => {
    activeRef.current = true;
    setStatus("connecting");
    setError(null);
    startBrowserRecognition();

    if (typeof RTCPeerConnection === "undefined") {
      setStatus("fallback");
      return;
    }

    try {
      const tokenResponse = await fetch("/api/onboarding/realtime");
      const tokenData = (await tokenResponse.json().catch(() => null)) as RealtimeTokenResponse | null;
      const ephemeralKey = tokenData?.value;

      if (!tokenResponse.ok || !ephemeralKey) {
        throw new Error(tokenData?.details?.error?.message ?? tokenData?.error ?? "Realtime token was not returned.");
      }

      const peer = new RTCPeerConnection();
      peerRef.current = peer;

      const audio = document.createElement("audio");
      audio.autoplay = true;
      audioRef.current = audio;
      document.body.appendChild(audio);

      peer.ontrack = (event) => {
        if (audioRef.current) {
          audioRef.current.srcObject = event.streams[0];
        }
      };

      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;
      micStream.getAudioTracks().forEach((track) => peer.addTrack(track, micStream));

      const channel = peer.createDataChannel("oai-events");
      channelRef.current = channel;
      channel.onopen = () => setStatus("connected");
      channel.onmessage = (event) => {
        try {
          handleRealtimeEvent(JSON.parse(event.data) as RealtimeEvent);
        } catch {
          // Ignore malformed diagnostic events.
        }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp"
        }
      });

      if (!sdpResponse.ok) {
        throw new Error("Realtime WebRTC handshake failed.");
      }

      await peer.setRemoteDescription({
        type: "answer",
        sdp: await sdpResponse.text()
      });
    } catch (unknownError) {
      console.warn("Realtime voice unavailable, using browser voice fallback.", unknownError);
      setStatus("fallback");
      setError(
        unknownError instanceof Error ? unknownError.message : "Realtime voice unavailable."
      );
    }
  }, [handleRealtimeEvent, startBrowserRecognition]);

  const speak = useCallback(
    (text: string) => {
      onAssistantTranscript(text);

      const channel = channelRef.current;
      if (channel?.readyState === "open") {
        channel.send(
          JSON.stringify({
            type: "response.create",
            response: {
              output_modalities: ["audio"],
              instructions: `Say exactly this sentence and nothing else: ${JSON.stringify(text)}`
            }
          })
        );
        return;
      }

      speakWithBrowser(text);
    },
    [onAssistantTranscript]
  );

  useEffect(() => stop, [stop]);

  return {
    error,
    speak,
    start,
    status,
    stop
  };
}
