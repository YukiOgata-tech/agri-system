"use client";
import { useState, useRef, useCallback } from "react";

export interface UseVoiceInputReturn {
  transcript: string;
  isListening: boolean;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
  clear: () => void;
}

export function useVoiceInput(lang = "ja-JP"): UseVoiceInputReturn {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const start = useCallback(() => {
    if (!isSupported) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const full = Array.from(e.results)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r[0].transcript)
        .join("");
      setTranscript(full);
    };
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);

    recRef.current = rec;
    rec.start();
    setIsListening(true);
  }, [isSupported, lang]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setIsListening(false);
  }, []);

  const clear = useCallback(() => {
    recRef.current?.stop();
    setTranscript("");
    setIsListening(false);
  }, []);

  return { transcript, isListening, isSupported, start, stop, clear };
}
