"use client";

import { useState } from "react";
import { Mic, MicOff, RotateCcw, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceInput } from "@/hooks/use-voice-input";
import type { ParseField } from "@/lib/voice-parsers";

interface VoiceInputPanelProps {
  onTranscriptReady: (transcript: string) => void;
  parseFields?: ParseField[];
  onClear?: () => void;
}

export function VoiceInputPanel({ onTranscriptReady, parseFields, onClear }: VoiceInputPanelProps) {
  const { transcript, isListening, isSupported, start, stop, clear } = useVoiceInput();
  const [applied, setApplied] = useState(false);

  const handleStop = () => {
    stop();
    if (transcript) {
      onTranscriptReady(transcript);
      setApplied(true);
    }
  };

  const handleClear = () => {
    clear();
    setApplied(false);
    onClear?.();
  };

  if (!isSupported) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
        このブラウザは音声入力に対応していません（Chrome をお試しください）
      </div>
    );
  }

  const hasRequiredMissing = parseFields?.some((f) => f.required && f.value === undefined);

  return (
    <div className="rounded-lg border border-dashed bg-muted/20 p-3 flex flex-col gap-3">
      {/* コントロール */}
      <div className="flex items-center gap-2">
        {!isListening ? (
          <Button
            type="button"
            size="sm"
            variant={applied ? "outline" : "secondary"}
            onClick={() => { setApplied(false); start(); }}
            className="gap-1.5 h-8 text-xs"
          >
            <Mic className="h-3.5 w-3.5" />
            {applied ? "再録音" : "録音開始"}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={handleStop}
            className="gap-1.5 h-8 text-xs"
          >
            <MicOff className="h-3.5 w-3.5" />
            <span className="animate-pulse">停止・解析</span>
          </Button>
        )}

        {(transcript || parseFields) && !isListening && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleClear}
            className="gap-1 h-8 text-xs text-muted-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            クリア
          </Button>
        )}

        {isListening && (
          <span className="text-xs text-muted-foreground animate-pulse">🎤 録音中...</span>
        )}
      </div>

      {/* 認識テキスト */}
      {transcript && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground">認識テキスト</p>
          <p className="rounded border bg-background px-3 py-2 text-sm leading-relaxed text-foreground">
            {transcript}
          </p>
        </div>
      )}

      {/* 解析結果 */}
      {parseFields && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">解析結果</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {parseFields.map((f) => (
              <div key={f.key} className="flex items-start gap-1.5 text-xs">
                {f.value !== undefined ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-zinc-500 mt-0.5 shrink-0" />
                ) : f.required ? (
                  <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                ) : (
                  <MinusCircle className="h-3.5 w-3.5 text-muted-foreground/25 mt-0.5 shrink-0" />
                )}
                <span className="min-w-0">
                  <span className="text-muted-foreground">{f.label}：</span>
                  {f.value !== undefined ? (
                    <span className="font-medium text-foreground">{f.value}</span>
                  ) : f.required ? (
                    <span className="font-medium text-red-500">読み解けませんでした</span>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </span>
              </div>
            ))}
          </div>

          {hasRequiredMissing && (
            <p className="rounded border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-600">
              ⚠ 赤い項目は認識できませんでした。手動で入力してください。
            </p>
          )}
        </div>
      )}
    </div>
  );
}
