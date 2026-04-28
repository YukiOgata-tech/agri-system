"use client";

import { useState } from "react";
import {
  Copy,
  Droplets,
  Eye,
  FlaskConical,
  Plus,
  Shield,
  Tractor,
} from "lucide-react";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { z } from "zod";
import { PageIntro } from "@/components/app/page-intro";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInputPanel, type GuidedStep } from "@/components/voice/voice-input-panel";
import { useAgriApp } from "@/components/providers/agri-app-provider";
import {
  createMockId,
  type CropId,
  type WorkLog,
} from "@/lib/agri-mock-data";
import { formatDate, getCurrentDateInputValue } from "@/lib/utils";
import {
  parseWorkLogVoice,
  workLogParseSummary,
  matchProductionUnit,
  matchWorkType,
  matchDurationMinutes,
  matchWorkerCount,
  matchWaterVolumeL,
  type ParseField,
} from "@/lib/voice-parsers";

const workSchema = z.object({
  productionUnitId: z.string().min(1, "生産エリアを選択してください"),
  cultivationCycleId: z.string().min(1, "作付を選択してください"),
  cropTypeId: z.string().min(1, "作物を選択してください"),
  workDate: z.string().min(1, "作業日を入力してください"),
  workType: z.enum([
    "irrigation",
    "fertigation",
    "pesticide",
    "harvest",
    "pruning",
    "inspection",
    "shipping",
    "other",
  ]),
  durationMinutes: z.coerce.number().min(1, "作業時間を入力してください"),
  workerCount: z.coerce.number().min(1, "人数を入力してください"),
  operatorName: z.string().min(1, "担当者を入力してください"),
  note: z.string().optional(),
  waterVolumeL: z.coerce.number().optional(),
  timingType: z.string().optional(),
  irrigationMethod: z.string().optional(),
  materialLotId: z.string().optional(),
  usageQuantityValue: z.coerce.number().optional(),
  usageQuantityUnit: z.string().optional(),
  targetPestOrDisease: z.string().optional(),
  dilutionRatio: z.string().optional(),
});

type WorkForm = z.infer<typeof workSchema>;
type WorkDialogMode = "single" | "multi";

function getDefaultWorkValues(): WorkForm {
  return {
    productionUnitId: "",
    cultivationCycleId: "",
    cropTypeId: "",
    workDate: getCurrentDateInputValue(),
    workType: "irrigation",
    durationMinutes: 30,
    workerCount: 1,
    operatorName: "",
    note: "",
    waterVolumeL: undefined,
    timingType: "",
    irrigationMethod: "",
    materialLotId: "",
    usageQuantityValue: undefined,
    usageQuantityUnit: "",
    targetPestOrDisease: "",
    dilutionRatio: "",
  };
}

const workLabels: Record<
  WorkForm["workType"],
  { label: string; icon: typeof Tractor }
> = {
  irrigation: { label: "潅水", icon: Droplets },
  fertigation: { label: "施肥・液肥", icon: FlaskConical },
  pesticide: { label: "防除", icon: Shield },
  harvest: { label: "収穫", icon: Tractor },
  pruning: { label: "摘葉・整枝", icon: Tractor },
  inspection: { label: "見回り", icon: Eye },
  shipping: { label: "出荷作業", icon: Tractor },
  other: { label: "その他", icon: Tractor },
};

function toWorkFormValues(log: WorkLog, materialLotId = ""): WorkForm {
  return {
    productionUnitId: log.productionUnitId,
    cultivationCycleId: log.cultivationCycleId,
    cropTypeId: log.cropTypeId,
    workDate: log.workDate,
    workType: log.workType,
    durationMinutes: log.durationMinutes,
    workerCount: log.workerCount,
    operatorName: log.operatorName,
    note: log.note ?? "",
    waterVolumeL: log.irrigation?.waterVolumeL,
    timingType: log.irrigation?.timingType ?? "",
    irrigationMethod: log.irrigation?.method ?? "",
    materialLotId,
    usageQuantityValue: undefined,
    usageQuantityUnit: "",
    targetPestOrDisease: "",
    dilutionRatio: "",
  };
}

export default function WorkLogsPage() {
  const {
    selectedCropId,
    productionUnits,
    cultivationCycles,
    workLogs,
    materialLots,
    workMaterialUsages,
    addWorkLog,
    getCropLabel,
    matchesSelectedCrop,
    getUnitById,
    getCycleById,
    getCycleForUnitAndCrop,
    getMaterialLotById,
  } = useAgriApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<WorkDialogMode>("single");
  const [selectedType, setSelectedType] =
    useState<WorkForm["workType"]>("irrigation");
  const [voiceFields, setVoiceFields] = useState<ParseField[] | undefined>();
  const [selectedTargetUnitIds, setSelectedTargetUnitIds] = useState<string[]>(
    []
  );
  const [duplicateSourceLog, setDuplicateSourceLog] = useState<WorkLog | null>(
    null
  );
  const form = useForm<WorkForm>({
    resolver: zodResolver(workSchema) as Resolver<WorkForm>,
    defaultValues: getDefaultWorkValues(),
  });

  const selectedUnitId = useWatch({
    control: form.control,
    name: "productionUnitId",
  });
  const selectedCycleId = useWatch({
    control: form.control,
    name: "cultivationCycleId",
  });
  const selectedCropTypeId = useWatch({
    control: form.control,
    name: "cropTypeId",
  });
  const selectedMaterialLotId = useWatch({
    control: form.control,
    name: "materialLotId",
  });

  const scopedCycles = cultivationCycles.filter((cycle) =>
    matchesSelectedCrop(cycle.cropTypeId)
  );
  const scopedLogs = workLogs.filter((log) => matchesSelectedCrop(log.cropTypeId));
  const selectedCycle = getCycleById(selectedCycleId);
  const referenceCropId = (duplicateSourceLog?.cropTypeId ??
    selectedCropTypeId ??
    selectedCycle?.cropTypeId ??
    "") as CropId | "";
  const eligibleTargetUnits = productionUnits.filter((unit) => {
    if (!unit.isActive) return false;
    if (!referenceCropId) return false;
    if (duplicateSourceLog && unit.id === duplicateSourceLog.productionUnitId) {
      return false;
    }
    if (!duplicateSourceLog && unit.id === selectedUnitId) {
      return false;
    }
    return Boolean(getCycleForUnitAndCrop(unit.id, referenceCropId));
  });

  const activeTargetUnitIds = selectedTargetUnitIds.filter((unitId) =>
    eligibleTargetUnits.some((unit) => unit.id === unitId)
  );

  const closeDialog = () => {
    setDialogOpen(false);
    setDialogMode("single");
    setSelectedType("irrigation");
    setVoiceFields(undefined);
    setSelectedTargetUnitIds([]);
    setDuplicateSourceLog(null);
    form.reset(getDefaultWorkValues());
  };

  const openNewDialog = () => {
    setDialogMode("single");
    setSelectedType("irrigation");
    setSelectedTargetUnitIds([]);
    setDuplicateSourceLog(null);
    setVoiceFields(undefined);
    form.reset(getDefaultWorkValues());
    setDialogOpen(true);
  };

  const openDuplicateDialog = (log: WorkLog) => {
    const firstUsage = (log.materialUsageIds ?? [])
      .map((id) => workMaterialUsages.find((usage) => usage.id === id))
      .find(Boolean);
    setDialogMode("multi");
    setSelectedType(log.workType);
    setSelectedTargetUnitIds([]);
    setDuplicateSourceLog(log);
    setVoiceFields(undefined);
    form.reset(toWorkFormValues(log, firstUsage?.materialLotId ?? ""));
    if (firstUsage) {
      form.setValue("usageQuantityValue", firstUsage.usageQuantityValue);
      form.setValue("usageQuantityUnit", firstUsage.usageQuantityUnit);
      form.setValue("targetPestOrDisease", firstUsage.targetPestOrDisease ?? "");
      form.setValue("dilutionRatio", firstUsage.dilutionRatio ?? "");
    }
    setDialogOpen(true);
  };

  const toggleTargetUnit = (unitId: string) => {
    setSelectedTargetUnitIds((current) =>
      current.includes(unitId)
        ? current.filter((id) => id !== unitId)
        : [...current, unitId]
    );
  };

  const buildUsageInputs = (values: WorkForm) =>
    values.materialLotId && values.usageQuantityValue && values.usageQuantityUnit
      ? [
          {
            materialLotId: values.materialLotId,
            materialName:
              getMaterialLotById(values.materialLotId)?.materialName ?? "",
            lotCode: getMaterialLotById(values.materialLotId)?.lotCode ?? "",
            usageQuantityValue: values.usageQuantityValue,
            usageQuantityUnit: values.usageQuantityUnit,
            targetPestOrDisease: values.targetPestOrDisease,
            dilutionRatio: values.dilutionRatio,
          },
        ]
      : [];

  const createWorkLogInput = (
    values: WorkForm,
    productionUnitId: string,
    cultivationCycleId: string,
    copiedFromWorkLogId?: string,
    inputBatchId?: string
  ) => ({
    productionUnitId,
    cultivationCycleId,
    cropTypeId: values.cropTypeId,
    copiedFromWorkLogId,
    inputBatchId,
    workDate: values.workDate,
    workType: values.workType,
    durationMinutes: values.durationMinutes,
    workerCount: values.workerCount,
    operatorName: values.operatorName,
    sourceType: "manual" as const,
    note: values.note,
    irrigation:
      values.workType === "irrigation" || values.workType === "fertigation"
        ? {
            waterVolumeL: values.waterVolumeL ?? 0,
            timingType: values.timingType ?? "未設定",
            method: values.irrigationMethod ?? "未設定",
          }
        : undefined,
  });

  const guidedSteps: GuidedStep[] = [
    {
      key: "productionUnitId",
      label: "生産エリア",
      prompt: "生産エリアを言ってください",
      example: "A棟、B棟、C棟",
      apply: (t) => {
        const unit = matchProductionUnit(t, productionUnits);
        if (unit) form.setValue("productionUnitId", unit.id);
        return unit?.name;
      },
    },
    {
      key: "workType",
      label: "作業種別",
      prompt: "作業種別を言ってください",
      example: "潅水、施肥、防除、収穫、見回り",
      apply: (t) => {
        const wt = matchWorkType(t);
        if (wt) {
          form.setValue("workType", wt as WorkForm["workType"]);
          setSelectedType(wt as WorkForm["workType"]);
        }
        return wt ? workLabels[wt as WorkForm["workType"]]?.label : undefined;
      },
    },
    {
      key: "durationMinutes",
      label: "作業時間",
      prompt: "作業時間を分で言ってください",
      example: "30分、1時間、45分",
      apply: (t) => {
        const mins = matchDurationMinutes(t);
        if (mins !== undefined) form.setValue("durationMinutes", mins);
        return mins !== undefined ? `${mins} 分` : undefined;
      },
    },
    {
      key: "workerCount",
      label: "人数",
      prompt: "作業人数を言ってください",
      example: "2人、3名",
      optional: true,
      apply: (t) => {
        const count = matchWorkerCount(t);
        if (count !== undefined) form.setValue("workerCount", count);
        return count !== undefined ? `${count} 人` : undefined;
      },
    },
    {
      key: "waterVolumeL",
      label: "水量",
      prompt: "使用水量をリットルで言ってください",
      example: "200リットル、50L",
      optional: true,
      apply: (t) => {
        const vol = matchWaterVolumeL(t);
        if (vol !== undefined) form.setValue("waterVolumeL", vol);
        return vol !== undefined ? `${vol} L` : undefined;
      },
    },
  ];

  const handleVoiceTranscript = (transcript: string) => {
    const parsed = parseWorkLogVoice(transcript);
    setVoiceFields(workLogParseSummary(parsed, productionUnits));

    if (parsed.unitLetter) {
      const unit = productionUnits.find(
        (u) =>
          u.name.toUpperCase().includes(parsed.unitLetter!) ||
          u.code.toUpperCase().endsWith(parsed.unitLetter!) ||
          u.code.toUpperCase().endsWith(`-${parsed.unitLetter!}`)
      );
      if (unit) form.setValue("productionUnitId", unit.id);
    }
    if (parsed.workType) {
      form.setValue("workType", parsed.workType as WorkForm["workType"]);
      setSelectedType(parsed.workType as WorkForm["workType"]);
    }
    if (parsed.durationMinutes !== undefined) {
      form.setValue("durationMinutes", parsed.durationMinutes);
    }
    if (parsed.workerCount !== undefined) {
      form.setValue("workerCount", parsed.workerCount);
    }
    if (parsed.waterVolumeL !== undefined) {
      form.setValue("waterVolumeL", parsed.waterVolumeL);
    }
    if (parsed.note) form.setValue("note", parsed.note);
  };

  const onSubmit = async (values: WorkForm) => {
    const usages = buildUsageInputs(values);

    if (dialogMode === "single") {
      try {
        await addWorkLog(
          createWorkLogInput(
            values,
            values.productionUnitId,
            values.cultivationCycleId,
            duplicateSourceLog?.id
          ),
          usages
        );
        toast.success("作業記録を保存しました");
        closeDialog();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "作業記録の保存に失敗しました"
        );
      }
      return;
    }

    if (activeTargetUnitIds.length === 0 && duplicateSourceLog) {
      toast.error("複製先の生産エリアを選択してください");
      return;
    }

    const inputBatchId = createMockId("work-batch");

    if (duplicateSourceLog) {
      let createdCount = 0;
      const skippedUnits: string[] = [];
      try {
        for (const unitId of activeTargetUnitIds) {
          const cycle = getCycleForUnitAndCrop(unitId, values.cropTypeId);
          if (!cycle) {
            skippedUnits.push(getUnitById(unitId)?.name ?? unitId);
            continue;
          }
          await addWorkLog(
            createWorkLogInput(
              values,
              unitId,
              cycle.id,
              duplicateSourceLog.id,
              inputBatchId
            ),
            usages
          );
          createdCount += 1;
        }
        if (createdCount === 0) {
          toast.error("複製できる生産エリアが見つかりませんでした");
          return;
        }
        toast.success(`${createdCount}件の作業記録を複製しました`);
        if (skippedUnits.length > 0) {
          toast.message(
            `作付が見つからず未作成: ${skippedUnits
              .slice(0, 3)
              .join("、")}`
          );
        }
        closeDialog();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "作業記録の複製に失敗しました"
        );
      }
      return;
    }

    try {
      const baseCreated = await addWorkLog(
        createWorkLogInput(
          values,
          values.productionUnitId,
          values.cultivationCycleId,
          undefined,
          inputBatchId
        ),
        usages
      );

      let duplicateCount = 0;
      const skippedUnits: string[] = [];
      for (const unitId of activeTargetUnitIds) {
        const cycle = getCycleForUnitAndCrop(unitId, values.cropTypeId);
        if (!cycle) {
          skippedUnits.push(getUnitById(unitId)?.name ?? unitId);
          continue;
        }
        await addWorkLog(
          createWorkLogInput(
            values,
            unitId,
            cycle.id,
            baseCreated?.id,
            inputBatchId
          ),
          usages
        );
        duplicateCount += 1;
      }

      toast.success(
        duplicateCount > 0
          ? `${duplicateCount + 1}件の作業記録を一括保存しました`
          : "作業記録を保存しました"
      );
      if (skippedUnits.length > 0) {
        toast.message(
          `作付が見つからず未作成: ${skippedUnits.slice(0, 3).join("、")}`
        );
      }
      closeDialog();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "一括作業記録の保存に失敗しました"
      );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        eyebrow="Operations"
        title="作業記録"
        description="作物スコープに応じて日々の作業を整理し、必要に応じて資材ロットを紐づけます。同じ内容を他エリアへ複製しやすい導線もこの画面にまとめます。"
        scopeLabel={getCropLabel(selectedCropId)}
        actions={
          <Button onClick={openNewDialog}>
            <Plus className="mr-2 h-4 w-4" />
            作業を記録
          </Button>
        }
      />

      <div className="-mx-4 sm:mx-0 grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {scopedLogs.slice(0, 6).map((log) => {
          const unit = getUnitById(log.productionUnitId);
          const cycle = getCycleById(log.cultivationCycleId);
          const usages = (log.materialUsageIds ?? [])
            .map((id) => workMaterialUsages.find((usage) => usage.id === id))
            .filter(Boolean);
          const Icon = workLabels[log.workType].icon;
          return (
            <Card
              key={log.id}
              className="rounded-none border-border/70 bg-white/75 shadow-sm backdrop-blur-sm sm:rounded-xl"
            >
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--surface-sand)] text-[color:var(--accent-earth)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{workLabels[log.workType].label}</p>
                      <p className="text-sm text-muted-foreground">
                        {unit?.name} / {cycle?.varietyName}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{formatDate(log.workDate)}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <span>担当</span>
                  <span className="text-right">{log.operatorName}</span>
                  <span>作業時間</span>
                  <span className="text-right">{log.durationMinutes} 分</span>
                  <span>人数</span>
                  <span className="text-right">{log.workerCount} 人</span>
                </div>
                {log.irrigation ? (
                  <div className="mt-4 rounded-2xl border border-border/70 bg-background/85 p-3 text-sm text-muted-foreground">
                    {log.irrigation.method} / {log.irrigation.waterVolumeL} L /{" "}
                    {log.irrigation.timingType}
                  </div>
                ) : null}
                {usages.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {usages.map((usage) => (
                      <Badge key={usage?.id} className="bg-amber-100 text-amber-900">
                        {usage?.materialName} {usage?.usageQuantityValue}
                        {usage?.usageQuantityUnit} / {usage?.lotCode}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                {log.copiedFromWorkLogId || log.inputBatchId ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {log.copiedFromWorkLogId ? (
                      <Badge variant="info">複製記録</Badge>
                    ) : null}
                    {log.inputBatchId ? <Badge variant="outline">一括入力</Badge> : null}
                  </div>
                ) : null}
                {log.note ? (
                  <p className="mt-4 text-sm text-muted-foreground">{log.note}</p>
                ) : null}
                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openDuplicateDialog(log)}
                  >
                    <Copy className="h-4 w-4" />
                    他エリアへ複製
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDialog();
            return;
          }
          setDialogOpen(open);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {duplicateSourceLog
                ? "作業記録を他エリアへ複製"
                : dialogMode === "multi"
                  ? "複数エリアへ一括記録"
                  : "作業を記録"}
            </DialogTitle>
          </DialogHeader>
          <form className="grid gap-3 sm:gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/80 p-3 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">入力モード</p>
                  <p className="text-xs text-muted-foreground">
                    単票入力と複数エリア一括入力を切り替えられます。
                  </p>
                </div>
                <Tabs
                  value={dialogMode}
                  onValueChange={(value) => {
                    const nextMode = value as WorkDialogMode;
                    setDialogMode(nextMode);
                    setSelectedTargetUnitIds([]);
                    if (nextMode === "single") {
                      setDuplicateSourceLog(null);
                    }
                  }}
                >
                  <TabsList>
                    <TabsTrigger value="single">単一記録</TabsTrigger>
                    <TabsTrigger value="multi">複数エリア</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              {duplicateSourceLog ? (
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                  複製元: {getUnitById(duplicateSourceLog.productionUnitId)?.name} /{" "}
                  {workLabels[duplicateSourceLog.workType].label} /{" "}
                  {formatDate(duplicateSourceLog.workDate)}
                </div>
              ) : null}
            </div>

            <VoiceInputPanel
              onTranscriptReady={handleVoiceTranscript}
              parseFields={voiceFields}
              onClear={() => setVoiceFields(undefined)}
              guidedSteps={guidedSteps}
            />

            <div className="grid gap-2 sm:gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>{dialogMode === "multi" ? "基準エリア" : "生産エリア"}</Label>
                <Select
                  value={selectedUnitId || undefined}
                  onValueChange={(value) => form.setValue("productionUnitId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {productionUnits
                      .filter((unit) => unit.isActive)
                      .map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>{dialogMode === "multi" ? "基準作付" : "作付"}</Label>
                <Select
                  value={selectedCycleId || undefined}
                  onValueChange={(value) => {
                    const cycle = getCycleById(value);
                    if (!cycle) return;
                    form.setValue("cultivationCycleId", value);
                    form.setValue("cropTypeId", cycle.cropTypeId);
                    form.setValue("productionUnitId", cycle.productionUnitId);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {scopedCycles.map((cycle) => (
                      <SelectItem key={cycle.id} value={cycle.id}>
                        {cycle.cycleName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {dialogMode === "multi" ? (
              <div className="grid gap-2 rounded-2xl border border-border/70 bg-background/80 p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {duplicateSourceLog ? "複製先エリア" : "追加対象エリア"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      同じ作物の作付が見つかるエリアだけを候補に出しています。
                    </p>
                  </div>
                  <Badge variant="outline">{activeTargetUnitIds.length} 件選択</Badge>
                </div>
                {eligibleTargetUnits.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {eligibleTargetUnits.map((unit) => {
                      const cycle = referenceCropId
                        ? getCycleForUnitAndCrop(unit.id, referenceCropId)
                        : undefined;
                      const selected = activeTargetUnitIds.includes(unit.id);
                      return (
                        <button
                          key={unit.id}
                          type="button"
                          onClick={() => toggleTargetUnit(unit.id)}
                          className={`rounded-2xl border px-4 py-3 text-left transition ${
                            selected
                              ? "border-primary bg-primary/10"
                              : "border-border/70 bg-white/70"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium">{unit.name}</span>
                            <Badge variant={selected ? "info" : "outline"}>
                              {selected ? "追加対象" : "未選択"}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {cycle?.cycleName ?? "対応する作付なし"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/70 px-4 py-5 text-sm text-muted-foreground">
                    対応する作付がある生産エリアがまだありません。基準作付を選ぶと候補が表示されます。
                  </div>
                )}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
              <div className="col-span-2 grid gap-1.5">
                <Label>作業種別</Label>
                <Select
                  value={selectedType}
                  onValueChange={(value) => {
                    form.setValue("workType", value as WorkForm["workType"]);
                    setSelectedType(value as WorkForm["workType"]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(workLabels).map(([value, item]) => (
                      <SelectItem key={value} value={value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="workDate">作業日</Label>
                <Input id="workDate" type="date" {...form.register("workDate")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="operatorName">担当者</Label>
                <Input id="operatorName" {...form.register("operatorName")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="durationMinutes">作業時間 (分)</Label>
                <Input
                  id="durationMinutes"
                  type="number"
                  {...form.register("durationMinutes")}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="workerCount">人数</Label>
                <Input id="workerCount" type="number" {...form.register("workerCount")} />
              </div>
            </div>

            {selectedType === "irrigation" || selectedType === "fertigation" ? (
              <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border/70 bg-background/80 p-3 sm:gap-3 sm:p-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="waterVolumeL">水量 (L)</Label>
                  <Input
                    id="waterVolumeL"
                    type="number"
                    {...form.register("waterVolumeL")}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="timingType">タイミング</Label>
                  <Input
                    id="timingType"
                    placeholder="朝 / 夕方"
                    {...form.register("timingType")}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="irrigationMethod">方法</Label>
                  <Input
                    id="irrigationMethod"
                    placeholder="点滴潅水"
                    {...form.register("irrigationMethod")}
                  />
                </div>
              </div>
            ) : null}

            {selectedType === "fertigation" || selectedType === "pesticide" ? (
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/70 bg-background/80 p-3 sm:gap-3 sm:p-4 lg:grid-cols-4">
                <div className="col-span-2 grid gap-1.5">
                  <Label>資材ロット</Label>
                  <Select
                    value={selectedMaterialLotId || undefined}
                    onValueChange={(value) => form.setValue("materialLotId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {materialLots.map((lot) => (
                        <SelectItem key={lot.id} value={lot.id}>
                          {lot.materialName} / {lot.lotCode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="usageQuantityValue">使用量</Label>
                  <Input
                    id="usageQuantityValue"
                    type="number"
                    step="0.1"
                    {...form.register("usageQuantityValue")}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="usageQuantityUnit">単位</Label>
                  <Input
                    id="usageQuantityUnit"
                    placeholder="L / mL"
                    {...form.register("usageQuantityUnit")}
                  />
                </div>
                <div className="col-span-2 grid gap-1.5">
                  <Label htmlFor="targetPestOrDisease">対象の病気・害虫</Label>
                  <Input
                    id="targetPestOrDisease"
                    {...form.register("targetPestOrDisease")}
                  />
                </div>
                <div className="col-span-2 grid gap-1.5">
                  <Label htmlFor="dilutionRatio">希釈倍率</Label>
                  <Input
                    id="dilutionRatio"
                    placeholder="1000倍"
                    {...form.register("dilutionRatio")}
                  />
                </div>
              </div>
            ) : null}

            <div className="grid gap-1.5">
              <Label htmlFor="note">備考</Label>
              <Textarea id="note" rows={2} {...form.register("note")} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                キャンセル
              </Button>
              <Button type="submit">
                {duplicateSourceLog
                  ? "複製する"
                  : dialogMode === "multi"
                    ? "一括保存する"
                    : "保存する"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
