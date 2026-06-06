export type TranscriptEvent = {
  text: string;
  isFinal: boolean;
  languageCode?: string;
  confidence?: number;
  source: "manual" | "browser" | "sarvam";
};

export type SarvamSession = {
  stop: () => Promise<void>;
  onTranscript: (callback: (event: TranscriptEvent) => void) => void;
  onError: (callback: (error: Error) => void) => void;
};

export async function startSarvamStreamingSTT(): Promise<SarvamSession> {
  let transcriptCallback: ((event: TranscriptEvent) => void) | null = null;

  return {
    async stop() {
      transcriptCallback = null;
    },
    onTranscript(callback) {
      transcriptCallback = callback;
      transcriptCallback({
        text: "",
        isFinal: true,
        source: "sarvam"
      });
    },
    onError() {
      // Placeholder for a future server-side Sarvam bridge.
    }
  };
}

export async function stopSarvamStreamingSTT(session?: SarvamSession | null) {
  await session?.stop();
}

export async function synthesizeWithSarvam(text: string): Promise<{ source: "mock"; audioBase64?: string }> {
  void text;
  return { source: "mock" };
}
