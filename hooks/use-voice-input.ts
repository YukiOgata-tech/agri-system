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

// 農業ドメインのキーワード — 複数の認識候補からより適切なものを選ぶために使う
const DOMAIN_KEYWORDS = [
  "潅水", "施肥", "防除", "収穫", "摘葉", "見回り", "出荷",
  "A棟", "B棟", "C棟", "ハウス", "圃場",
  "気温", "湿度", "地温", "土壌", "照度",
  "灰色かび病", "うどんこ病", "ハダニ", "アブラムシ",
  "キロ", "リットル", "パーセント",
];

// 複数の認識候補の中からドメインキーワードに最も多くマッチするものを選ぶ
function pickBestAlternative(alternatives: string[]): string {
  if (alternatives.length <= 1) return alternatives[0] ?? "";
  return alternatives.reduce((best, current) => {
    const bestScore = DOMAIN_KEYWORDS.filter((kw) => best.includes(kw)).length;
    const currentScore = DOMAIN_KEYWORDS.filter((kw) => current.includes(kw)).length;
    return currentScore > bestScore ? current : best;
  });
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
    rec.maxAlternatives = 3; // 複数候補を受け取ってドメインキーワードで最良を選ぶ

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let full = "";
      for (let i = 0; i < e.results.length; i++) {
        const result = e.results[i];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const alternatives = Array.from(result).map((r: any) => r.transcript as string);
        // 確定済み結果は最良候補を採用、暫定結果は先頭をそのまま使う
        full += result.isFinal ? pickBestAlternative(alternatives) : alternatives[0];
      }
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
