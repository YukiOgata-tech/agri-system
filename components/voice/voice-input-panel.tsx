"use client";

import { useState } from "react";
import {
  Check,
  CheckCircle2,
  Mic,
  MicOff,
  MinusCircle,
  RotateCcw,
  SkipForward,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceInput } from "@/hooks/use-voice-input";
import type { ParseField } from "@/lib/voice-parsers";

/**
 * ガイドモード用のステップ定義
 * 各ページで useMemo を使わず定義してもよい（VoiceInputPanel が参照を追わないため）
 *
 * apply(transcript) はフォームへの setValue を副作用として行い、
 * 表示用の文字列（確定値）を返す。認識失敗時は undefined を返す。
 */
export interface GuidedStep {
  key: string;
  label: string;
  /** 録音前にユーザーへ表示するプロンプト */
  prompt: string;
  /** 入力例（省略可） */
  example?: string;
  /** true の場合、スキップボタンを表示する */
  optional?: boolean;
  /** 音声テキストを解析してフォームに反映し、表示用文字列を返す */
  apply: (transcript: string) => string | undefined;
}

interface VoiceInputPanelProps {
  /** クイックモード: 録音停止時に呼ばれる（全文を一括解析するページ側のハンドラ） */
  onTranscriptReady: (transcript: string) => void;
  /** クイックモード: 解析結果フィールド一覧（VoiceInputPanel はこれを表示するだけ） */
  parseFields?: ParseField[];
  /** クイックモード: クリア時のコールバック */
  onClear?: () => void;
  /** ガイドモード: 定義があるとモード切り替えタブを表示する */
  guidedSteps?: GuidedStep[];
}

type PanelMode = "quick" | "guided";

export function VoiceInputPanel({
  onTranscriptReady,
  parseFields,
  onClear,
  guidedSteps,
}: VoiceInputPanelProps) {
  const { transcript, isListening, isSupported, start, stop, clear } = useVoiceInput();

  // クイックモード状態
  const [applied, setApplied] = useState(false);

  // モード（guidedSteps が渡されない場合は常に "quick"）
  const [mode, setMode] = useState<PanelMode>(guidedSteps ? "guided" : "quick");

  // ガイドモード状態
  const [stepIndex, setStepIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [stepResults, setStepResults] = useState<(string | undefined)[]>(
    () => (guidedSteps ? new Array(guidedSteps.length).fill(undefined) : [])
  );
  const [pendingValue, setPendingValue] = useState<string | undefined>();
  const [guidedDone, setGuidedDone] = useState(false);

  if (!isSupported) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
        このブラウザは音声入力に対応していません（Chrome をお試しください）
      </div>
    );
  }

  // ---- クイックモード ----

  const handleQuickStop = () => {
    stop();
    if (transcript) {
      onTranscriptReady(transcript);
      setApplied(true);
    }
  };

  const handleQuickClear = () => {
    clear();
    setApplied(false);
    onClear?.();
  };

  // ---- ガイドモード ----

  const currentStep = guidedSteps?.[stepIndex];
  const completedCount = stepResults.filter((r, i) => i < stepIndex && r !== undefined).length;

  const advanceStep = (result: string | undefined) => {
    if (!guidedSteps) return;
    const newResults = [...stepResults];
    newResults[stepIndex] = result;
    setStepResults(newResults);
    setConfirming(false);
    setPendingValue(undefined);
    clear();
    if (stepIndex + 1 >= guidedSteps.length) {
      setGuidedDone(true);
    } else {
      setStepIndex(stepIndex + 1);
    }
  };

  const handleGuidedStop = () => {
    stop();
    if (!transcript || !currentStep) return;
    const value = currentStep.apply(transcript);
    setPendingValue(value);
    setConfirming(true);
  };

  const handleGuidedConfirm = () => advanceStep(pendingValue);
  const handleGuidedSkip = () => advanceStep(undefined);

  const handleGuidedRetry = () => {
    setConfirming(false);
    setPendingValue(undefined);
    clear();
  };

  const handleGuidedReset = () => {
    setStepIndex(0);
    setConfirming(false);
    setPendingValue(undefined);
    setGuidedDone(false);
    setStepResults(guidedSteps ? new Array(guidedSteps.length).fill(undefined) : []);
    clear();
  };

  const switchMode = (newMode: PanelMode) => {
    clear();
    setApplied(false);
    setConfirming(false);
    setPendingValue(undefined);
    setMode(newMode);
  };

  const hasRequiredMissing = parseFields?.some((f) => f.required && f.value === undefined);

  return (
    <div className="rounded-lg border border-dashed bg-muted/20 p-3 flex flex-col gap-3">

      {/* モード切り替えタブ（guidedSteps がある場合のみ表示） */}
      {guidedSteps && (
        <div className="flex gap-0.5 rounded-md bg-muted p-0.5 w-fit text-xs">
          <button
            type="button"
            onClick={() => switchMode("quick")}
            className={`px-2.5 py-1 rounded transition-colors ${
              mode === "quick"
                ? "bg-background shadow-sm font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            クイック
          </button>
          <button
            type="button"
            onClick={() => switchMode("guided")}
            className={`px-2.5 py-1 rounded transition-colors ${
              mode === "guided"
                ? "bg-background shadow-sm font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ガイド
          </button>
        </div>
      )}

      {/* ========== クイックモード ========== */}
      {mode === "quick" && (
        <>
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
                onClick={handleQuickStop}
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
                onClick={handleQuickClear}
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

          {transcript && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-muted-foreground">認識テキスト</p>
              <p className="rounded border bg-background px-3 py-2 text-sm leading-relaxed text-foreground">
                {transcript}
              </p>
            </div>
          )}

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
                        <span className="font-medium text-red-500">読み取れませんでした</span>
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
        </>
      )}

      {/* ========== ガイドモード ========== */}
      {mode === "guided" && guidedSteps && (
        <>
          {/* 完了画面 */}
          {guidedDone && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-green-700 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                音声入力完了 — 必要に応じてフォームを確認・修正してください
              </p>
              <div className="space-y-1">
                {guidedSteps.map((step, i) => (
                  <div key={step.key} className="flex items-center gap-2 text-xs">
                    {stepResults[i] !== undefined ? (
                      <Check className="h-3 w-3 text-green-600 shrink-0" />
                    ) : (
                      <MinusCircle className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                    )}
                    <span className="text-muted-foreground">{step.label}：</span>
                    <span className="font-medium text-foreground">{stepResults[i] ?? "—"}</span>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleGuidedReset}
                className="gap-1 h-7 text-xs text-muted-foreground w-fit mt-1"
              >
                <RotateCcw className="h-3 w-3" />
                最初からやり直す
              </Button>
            </div>
          )}

          {/* 確認画面 */}
          {!guidedDone && confirming && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">
                ステップ {stepIndex + 1} / {guidedSteps.length} — {currentStep?.label}
              </p>
              <div className="rounded-md border bg-background p-2.5 text-sm">
                <p className="text-xs text-muted-foreground mb-1">認識テキスト</p>
                <p className="leading-relaxed">{transcript}</p>
                {pendingValue !== undefined ? (
                  <p className="text-sm font-medium text-green-700 mt-2 flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    {currentStep?.label}: {pendingValue}
                  </p>
                ) : (
                  <p className="text-sm font-medium text-red-600 mt-2">
                    読み取れませんでした
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleGuidedConfirm}
                  className="h-8 text-xs gap-1"
                >
                  <Check className="h-3.5 w-3.5" />
                  {pendingValue !== undefined ? "確定して次へ" : "スキップして次へ"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleGuidedRetry}
                  className="h-8 text-xs gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  もう一度
                </Button>
                {currentStep?.optional && pendingValue === undefined && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleGuidedSkip}
                    className="h-8 text-xs gap-1 text-muted-foreground"
                  >
                    <SkipForward className="h-3.5 w-3.5" />
                    スキップ
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* 録音画面 */}
          {!guidedDone && !confirming && (
            <div className="flex flex-col gap-2.5">
              {/* プログレス + プロンプト */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">
                    ステップ {stepIndex + 1} / {guidedSteps.length}
                    {currentStep?.optional && (
                      <span className="ml-1.5 text-muted-foreground/60">（省略可）</span>
                    )}
                  </p>
                  {completedCount > 0 && (
                    <p className="text-xs text-green-600">{completedCount} 件確定済み</p>
                  )}
                </div>
                {/* プログレスバー */}
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(stepIndex / guidedSteps.length) * 100}%` }}
                  />
                </div>
                <p className="text-sm font-medium mt-2">{currentStep?.prompt}</p>
                {currentStep?.example && (
                  <p className="text-xs text-muted-foreground mt-0.5">例: {currentStep.example}</p>
                )}
              </div>

              {/* 録音ボタン */}
              <div className="flex items-center gap-2 flex-wrap">
                {!isListening ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={start}
                    className="gap-1.5 h-8 text-xs"
                  >
                    <Mic className="h-3.5 w-3.5" />
                    録音開始
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={handleGuidedStop}
                    className="gap-1.5 h-8 text-xs"
                  >
                    <MicOff className="h-3.5 w-3.5" />
                    <span className="animate-pulse">停止・確認</span>
                  </Button>
                )}
                {isListening && (
                  <span className="text-xs text-muted-foreground animate-pulse">🎤 録音中...</span>
                )}
                {!isListening && currentStep?.optional && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleGuidedSkip}
                    className="h-8 text-xs gap-1 text-muted-foreground"
                  >
                    <SkipForward className="h-3.5 w-3.5" />
                    スキップ
                  </Button>
                )}
              </div>

              {/* 録音後・停止前の暫定テキスト */}
              {transcript && (
                <p className="rounded border bg-background px-3 py-1.5 text-sm">{transcript}</p>
              )}

              {/* 完了済みステップの一覧 */}
              {stepIndex > 0 && (
                <div className="space-y-1 pt-1 border-t border-border/50">
                  {guidedSteps.slice(0, stepIndex).map((step, i) => (
                    <div key={step.key} className="flex items-center gap-2 text-xs text-muted-foreground">
                      {stepResults[i] !== undefined ? (
                        <Check className="h-3 w-3 text-green-600 shrink-0" />
                      ) : (
                        <MinusCircle className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                      )}
                      <span>
                        {step.label}:{" "}
                        <span className="font-medium text-foreground">{stepResults[i] ?? "—"}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
