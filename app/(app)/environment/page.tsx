"use client";

import { useState } from "react";
import { Copy, Plus, Thermometer, Waves, Wind } from "lucide-react";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { z } from "zod";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageIntro } from "@/components/app/page-intro";
import { StatCard } from "@/components/app/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInputPanel, type GuidedStep } from "@/components/voice/voice-input-panel";
import { useAgriApp } from "@/components/providers/agri-app-provider";
import { createMockId, type EnvironmentLog } from "@/lib/agri-mock-data";
import {
  formatDateTime,
  formatTime,
  getCurrentDateTimeInputValue,
  toDateTimeInputValue,
} from "@/lib/utils";
import {
  environmentParseSummary,
  parseEnvironmentVoice,
  matchProductionUnit,
  matchTemperatureC,
  matchHumidityPct,
  matchCo2Ppm,
  matchSoilMoisturePct,
  matchLightLux,
  type ParseField,
} from "@/lib/voice-parsers";

const envSchema = z.object({
  productionUnitId: z.string().min(1, "生産エリアを選択してください"),
  cultivationCycleId: z.string().min(1, "作付を選択してください"),
  cropTypeId: z.string().min(1, "作物を選択してください"),
  observedAt: z.string().min(1, "観測日時を入力してください"),
  temperatureC: z.coerce.number(),
  humidityPct: z.coerce.number().min(0).max(100),
  co2Ppm: z.coerce.number().min(0),
  soilTemperatureC: z.coerce.number(),
  soilMoisturePct: z.coerce.number().min(0).max(100),
  ecDsM: z.coerce.number().min(0),
  ph: z.coerce.number().min(0),
  lightLux: z.coerce.number().min(0),
  notes: z.string().optional(),
});

type EnvForm = z.infer<typeof envSchema>;

function getDefaultEnvironmentValues(): EnvForm {
  return {
    productionUnitId: "",
    cultivationCycleId: "",
    cropTypeId: "",
    observedAt: getCurrentDateTimeInputValue(),
    temperatureC: 0,
    humidityPct: 0,
    co2Ppm: 0,
    soilTemperatureC: 0,
    soilMoisturePct: 0,
    ecDsM: 0,
    ph: 0,
    lightLux: 0,
    notes: "",
  };
}

function toEnvironmentFormValues(log: EnvironmentLog): EnvForm {
  return {
    productionUnitId: log.productionUnitId,
    cultivationCycleId: log.cultivationCycleId,
    cropTypeId: log.cropTypeId,
    observedAt: toDateTimeInputValue(log.observedAt),
    temperatureC: log.temperatureC,
    humidityPct: log.humidityPct,
    co2Ppm: log.co2Ppm,
    soilTemperatureC: log.soilTemperatureC,
    soilMoisturePct: log.soilMoisturePct,
    ecDsM: log.ecDsM,
    ph: log.ph,
    lightLux: log.lightLux,
    notes: log.notes ?? "",
  };
}

export default function EnvironmentPage() {
  const {
    selectedCropId,
    productionUnits,
    cultivationCycles,
    environmentLogs,
    addEnvironmentLog,
    getCropLabel,
    matchesSelectedCrop,
    getUnitById,
    getCycleById,
    getCycleForUnitAndCrop,
  } = useAgriApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [voiceFields, setVoiceFields] = useState<ParseField[] | undefined>();
  const [continueToNextUnit, setContinueToNextUnit] = useState(false);
  const [prefillSourceLog, setPrefillSourceLog] = useState<EnvironmentLog | null>(
    null
  );
  const [sequenceBatchId, setSequenceBatchId] = useState<string | null>(null);
  const form = useForm<EnvForm>({
    resolver: zodResolver(envSchema) as Resolver<EnvForm>,
    defaultValues: getDefaultEnvironmentValues(),
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
  const selectedCycle = getCycleById(selectedCycleId);

  const scopedCycles = cultivationCycles.filter((cycle) =>
    matchesSelectedCrop(cycle.cropTypeId)
  );
  const scopedLogs = environmentLogs
    .filter((log) => matchesSelectedCrop(log.cropTypeId))
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  const latestLogs = scopedLogs.slice(0, 4);
  const latestLogForSelectedUnit = selectedUnitId
    ? scopedLogs.find(
        (log) =>
          log.productionUnitId === selectedUnitId &&
          (!selectedCropTypeId || log.cropTypeId === selectedCropTypeId)
      )
    : undefined;

  const chartData = [...scopedLogs]
    .filter((log) => getUnitById(log.productionUnitId)?.unitType === "greenhouse")
    .slice(0, 6)
    .reverse()
    .map((log) => ({
      observedAt: formatTime(log.observedAt),
      temperatureC: log.temperatureC,
      humidityPct: log.humidityPct,
      ecDsM: log.ecDsM,
    }));

  const averageHumidity =
    scopedLogs.reduce((sum, log) => sum + log.humidityPct, 0) /
    Math.max(scopedLogs.length, 1);
  const averageEC =
    scopedLogs.reduce((sum, log) => sum + log.ecDsM, 0) /
    Math.max(scopedLogs.length, 1);

  const closeDialog = () => {
    setDialogOpen(false);
    setVoiceFields(undefined);
    setContinueToNextUnit(false);
    setPrefillSourceLog(null);
    setSequenceBatchId(null);
    form.reset(getDefaultEnvironmentValues());
  };

  const openNewDialog = () => {
    setVoiceFields(undefined);
    setContinueToNextUnit(false);
    setPrefillSourceLog(null);
    setSequenceBatchId(null);
    form.reset(getDefaultEnvironmentValues());
    setDialogOpen(true);
  };

  const openCarryDialog = (log: EnvironmentLog) => {
    setVoiceFields(undefined);
    setContinueToNextUnit(false);
    setSequenceBatchId(null);
    setPrefillSourceLog(log);
    form.reset({
      ...toEnvironmentFormValues(log),
      observedAt: getCurrentDateTimeInputValue(),
    });
    setDialogOpen(true);
  };

  const applyCarryValues = (log: EnvironmentLog) => {
    const currentObservedAt = form.getValues("observedAt") || getCurrentDateTimeInputValue();
    form.reset({
      ...toEnvironmentFormValues(log),
      observedAt: currentObservedAt,
      productionUnitId: form.getValues("productionUnitId") || log.productionUnitId,
      cultivationCycleId:
        form.getValues("cultivationCycleId") || log.cultivationCycleId,
    });
    setPrefillSourceLog(log);
    toast.success("前回値を引き継ぎました");
  };

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
      key: "temperatureC",
      label: "気温",
      prompt: "気温を摂氏で言ってください",
      example: "25度、28.5℃",
      apply: (t) => {
        const val = matchTemperatureC(t);
        if (val !== undefined) form.setValue("temperatureC", val);
        return val !== undefined ? `${val}℃` : undefined;
      },
    },
    {
      key: "humidityPct",
      label: "湿度",
      prompt: "湿度をパーセントで言ってください",
      example: "70パーセント、85%",
      apply: (t) => {
        const val = matchHumidityPct(t);
        if (val !== undefined) form.setValue("humidityPct", val);
        return val !== undefined ? `${val}%` : undefined;
      },
    },
    {
      key: "co2Ppm",
      label: "CO2濃度",
      prompt: "CO2濃度をppmで言ってください",
      example: "800ppm、1200ppm",
      optional: true,
      apply: (t) => {
        const val = matchCo2Ppm(t);
        if (val !== undefined) form.setValue("co2Ppm", val);
        return val !== undefined ? `${val} ppm` : undefined;
      },
    },
    {
      key: "soilMoisturePct",
      label: "土壌水分",
      prompt: "土壌水分をパーセントで言ってください",
      example: "60パーセント、土壌水分40",
      optional: true,
      apply: (t) => {
        const val = matchSoilMoisturePct(t);
        if (val !== undefined) form.setValue("soilMoisturePct", val);
        return val !== undefined ? `${val}%` : undefined;
      },
    },
    {
      key: "lightLux",
      label: "光量",
      prompt: "光量をルクスで言ってください",
      example: "5000ルクス、光量3000",
      optional: true,
      apply: (t) => {
        const val = matchLightLux(t);
        if (val !== undefined) form.setValue("lightLux", val);
        return val !== undefined ? `${val} lux` : undefined;
      },
    },
  ];

  const handleVoiceTranscript = (transcript: string) => {
    const parsed = parseEnvironmentVoice(transcript);
    setVoiceFields(environmentParseSummary(parsed, productionUnits));

    if (parsed.unitLetter) {
      const unit = productionUnits.find(
        (u) =>
          u.name.toUpperCase().includes(parsed.unitLetter!) ||
          u.code.toUpperCase().endsWith(parsed.unitLetter!) ||
          u.code.toUpperCase().endsWith(`-${parsed.unitLetter!}`)
      );
      if (unit) form.setValue("productionUnitId", unit.id);
    }
    if (parsed.temperatureC !== undefined) {
      form.setValue("temperatureC", parsed.temperatureC);
    }
    if (parsed.humidityPct !== undefined) {
      form.setValue("humidityPct", parsed.humidityPct);
    }
    if (parsed.co2Ppm !== undefined) form.setValue("co2Ppm", parsed.co2Ppm);
    if (parsed.soilTemperatureC !== undefined) {
      form.setValue("soilTemperatureC", parsed.soilTemperatureC);
    }
    if (parsed.soilMoisturePct !== undefined) {
      form.setValue("soilMoisturePct", parsed.soilMoisturePct);
    }
    if (parsed.lightLux !== undefined) form.setValue("lightLux", parsed.lightLux);
  };

  const onSubmit = async (values: EnvForm) => {
    const sequenceCropId =
      values.cropTypeId || selectedCycle?.cropTypeId || prefillSourceLog?.cropTypeId;
    const batchId =
      continueToNextUnit ? sequenceBatchId ?? createMockId("env-batch") : undefined;

    try {
      const created = await addEnvironmentLog({
        ...values,
        copiedFromEnvironmentLogId: prefillSourceLog?.id,
        inputBatchId: batchId,
      });

      if (!continueToNextUnit || !sequenceCropId) {
        toast.success("環境記録を保存しました");
        closeDialog();
        return;
      }

      const candidateUnits = productionUnits.filter(
        (unit) => unit.isActive && Boolean(getCycleForUnitAndCrop(unit.id, sequenceCropId))
      );
      const currentIndex = candidateUnits.findIndex(
        (unit) => unit.id === values.productionUnitId
      );
      const nextUnit =
        currentIndex >= 0 ? candidateUnits[currentIndex + 1] : undefined;

      if (!nextUnit) {
        toast.success("環境記録を保存しました。対象エリアを一巡しました");
        closeDialog();
        return;
      }

      const nextCycle = getCycleForUnitAndCrop(nextUnit.id, sequenceCropId);
      if (!nextCycle) {
        toast.success("環境記録を保存しました");
        closeDialog();
        return;
      }

      setSequenceBatchId(batchId ?? null);
      setPrefillSourceLog(created);
      form.reset({
        ...values,
        productionUnitId: nextUnit.id,
        cultivationCycleId: nextCycle.id,
        cropTypeId: nextCycle.cropTypeId,
      });
      toast.success(`環境記録を保存しました。次は ${nextUnit.name} です`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "環境記録の保存に失敗しました"
      );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        eyebrow="Environment"
        title="環境記録"
        description="作物スコープに応じて温湿度、土壌、EC、pH を表示します。前回値の引継ぎと次エリアへの連続入力で、巡回観測を軽くします。"
        scopeLabel={getCropLabel(selectedCropId)}
        actions={
          <Button onClick={openNewDialog}>
            <Plus className="mr-2 h-4 w-4" />
            観測を追加
          </Button>
        }
      />

      <div className="-mx-4 grid gap-3 sm:mx-0 sm:gap-4 md:grid-cols-3">
        <StatCard
          label="Average Humidity"
          value={`${averageHumidity.toFixed(1)}%`}
          detail="作物スコープ内の平均"
          icon={Waves}
          tone="sky"
          className="rounded-none sm:rounded-xl"
        />
        <StatCard
          label="Average EC"
          value={`${averageEC.toFixed(2)} dS/m`}
          detail="肥培管理の基準"
          icon={Wind}
          tone="earth"
          className="rounded-none sm:rounded-xl"
        />
        <StatCard
          label="Observations"
          value={`${scopedLogs.length} 件`}
          detail="環境ログ総数"
          icon={Thermometer}
          tone="leaf"
          className="rounded-none sm:rounded-xl"
        />
      </div>

      <div className="-mx-4 grid gap-3 sm:mx-0 sm:gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card className="rounded-none border-border/70 bg-white/75 shadow-sm backdrop-blur-sm sm:rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">直近の環境推移</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px] sm:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#d8ceb8" strokeDasharray="4 4" />
                <XAxis dataKey="observedAt" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "18px",
                    border: "1px solid #d8ceb8",
                    background: "#fffaf2",
                  }}
                />
                <Line dataKey="temperatureC" type="monotone" stroke="#d58a3f" strokeWidth={2.5} />
                <Line dataKey="humidityPct" type="monotone" stroke="#3b82f6" strokeWidth={2.5} />
                <Line
                  dataKey="ecDsM"
                  type="monotone"
                  stroke="#2f5d50"
                  strokeWidth={2.5}
                  strokeDasharray="6 6"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-none border-border/70 bg-white/75 shadow-sm backdrop-blur-sm sm:rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">最新観測</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestLogs.map((log) => {
              const unit = getUnitById(log.productionUnitId);
              return (
                <div key={log.id} className="rounded-2xl border border-border/70 bg-background/85 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{unit?.name}</p>
                    <Badge variant={log.humidityPct > 80 ? "warning" : "success"}>
                      {log.humidityPct > 80 ? "要観察" : "安定"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(log.observedAt)}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <span>気温 {log.temperatureC.toFixed(1)}℃</span>
                    <span>湿度 {log.humidityPct}%</span>
                    <span>土壌水分 {log.soilMoisturePct}%</span>
                    <span>EC {log.ecDsM.toFixed(1)}</span>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => openCarryDialog(log)}>
                      <Copy className="h-4 w-4" />
                      この値を引き継ぐ
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="-mx-4 rounded-none border-border/70 bg-white/75 shadow-sm backdrop-blur-sm sm:mx-0 sm:rounded-xl">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">環境ログ一覧</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-3 sm:pt-0">
          <div className="divide-y divide-border sm:hidden">
            {scopedLogs.map((log) => {
              const unit = getUnitById(log.productionUnitId);
              return (
                <div key={log.id} className="px-4 py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <Badge variant="outline">{unit?.name}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(log.observedAt)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>
                      気温 <span className="font-medium text-foreground">{log.temperatureC.toFixed(1)}℃</span>
                    </span>
                    <span>
                      湿度 <span className="font-medium text-foreground">{log.humidityPct}%</span>
                    </span>
                    <span>
                      土壌水分 <span className="font-medium text-foreground">{log.soilMoisturePct}%</span>
                    </span>
                    <span>
                      EC <span className="font-medium text-foreground">{log.ecDsM.toFixed(1)}</span>
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      {log.copiedFromEnvironmentLogId ? <Badge variant="info">引継ぎ</Badge> : null}
                      {log.inputBatchId ? <Badge variant="outline">連続入力</Badge> : null}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => openCarryDialog(log)}>
                      引き継ぐ
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[1080px] text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-muted-foreground">
                  <th className="px-3 py-3">日時</th>
                  <th className="px-3 py-3">生産エリア</th>
                  <th className="px-3 py-3 text-right">気温</th>
                  <th className="px-3 py-3 text-right">湿度</th>
                  <th className="px-3 py-3 text-right">土壌水分</th>
                  <th className="px-3 py-3 text-right">EC</th>
                  <th className="px-3 py-3 text-right">pH</th>
                  <th className="px-3 py-3 text-right">光量</th>
                  <th className="px-3 py-3">入力</th>
                </tr>
              </thead>
              <tbody>
                {scopedLogs.map((log) => {
                  const unit = getUnitById(log.productionUnitId);
                  return (
                    <tr key={log.id} className="border-b border-border/50 last:border-0">
                      <td className="px-3 py-3 font-medium">{formatDateTime(log.observedAt)}</td>
                      <td className="px-3 py-3">
                        <Badge variant="outline">{unit?.name}</Badge>
                      </td>
                      <td className="px-3 py-3 text-right">{log.temperatureC.toFixed(1)}℃</td>
                      <td className="px-3 py-3 text-right">{log.humidityPct}%</td>
                      <td className="px-3 py-3 text-right">{log.soilMoisturePct}%</td>
                      <td className="px-3 py-3 text-right">{log.ecDsM.toFixed(1)}</td>
                      <td className="px-3 py-3 text-right">{log.ph.toFixed(1)}</td>
                      <td className="px-3 py-3 text-right">{log.lightLux.toLocaleString()}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {log.copiedFromEnvironmentLogId ? <Badge variant="info">引継ぎ</Badge> : null}
                          {log.inputBatchId ? <Badge variant="outline">連続</Badge> : null}
                          <Button size="sm" variant="outline" onClick={() => openCarryDialog(log)}>
                            引き継ぐ
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
              {prefillSourceLog ? "前回値を引き継いで環境記録" : "環境ログを追加"}
            </DialogTitle>
          </DialogHeader>
          <form className="grid gap-3 sm:gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="rounded-2xl border border-border/70 bg-background/80 p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">入力補助</p>
                  <p className="text-xs text-muted-foreground">
                    同時刻に巡回する場合は、前回値を引き継ぎながら次のエリアへ進めます。
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="continue-sequence" className="text-sm">
                    次エリアへ連続入力
                  </Label>
                  <Switch
                    id="continue-sequence"
                    checked={continueToNextUnit}
                    onCheckedChange={setContinueToNextUnit}
                  />
                </div>
              </div>
              {prefillSourceLog ? (
                <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                  引継ぎ元: {getUnitById(prefillSourceLog.productionUnitId)?.name} /{" "}
                  {formatDateTime(prefillSourceLog.observedAt)}
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
                <Label>生産エリア</Label>
                <Select
                  value={selectedUnitId || undefined}
                  onValueChange={(value) => {
                    form.setValue("productionUnitId", value);
                    const cropId =
                      form.getValues("cropTypeId") || selectedCycle?.cropTypeId;
                    if (!cropId) return;
                    const cycle = getCycleForUnitAndCrop(value, cropId);
                    if (cycle) {
                      form.setValue("cultivationCycleId", cycle.id);
                      form.setValue("cropTypeId", cycle.cropTypeId);
                    }
                  }}
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
                <Label>作付</Label>
                <Select
                  value={selectedCycleId || undefined}
                  onValueChange={(value) => {
                    const cycle = scopedCycles.find((item) => item.id === value);
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

            {latestLogForSelectedUnit ? (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyCarryValues(latestLogForSelectedUnit)}
                >
                  <Copy className="h-4 w-4" />
                  このエリアの前回値を引き継ぐ
                </Button>
              </div>
            ) : null}

            <div className="grid gap-1.5">
              <Label htmlFor="observedAt">観測日時</Label>
              <Input
                id="observedAt"
                type="datetime-local"
                {...form.register("observedAt")}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
              <div className="grid gap-1.5">
                <Label htmlFor="temperatureC">気温</Label>
                <Input
                  id="temperatureC"
                  type="number"
                  step="0.1"
                  {...form.register("temperatureC")}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="humidityPct">湿度</Label>
                <Input id="humidityPct" type="number" {...form.register("humidityPct")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="co2Ppm">CO2</Label>
                <Input id="co2Ppm" type="number" {...form.register("co2Ppm")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="lightLux">光量</Label>
                <Input id="lightLux" type="number" {...form.register("lightLux")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
              <div className="grid gap-1.5">
                <Label htmlFor="soilTemperatureC">地温</Label>
                <Input
                  id="soilTemperatureC"
                  type="number"
                  step="0.1"
                  {...form.register("soilTemperatureC")}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="soilMoisturePct">土壌水分</Label>
                <Input
                  id="soilMoisturePct"
                  type="number"
                  {...form.register("soilMoisturePct")}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ecDsM">EC</Label>
                <Input id="ecDsM" type="number" step="0.1" {...form.register("ecDsM")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ph">pH</Label>
                <Input id="ph" type="number" step="0.1" {...form.register("ph")} />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="notes">備考</Label>
              <Textarea id="notes" rows={2} {...form.register("notes")} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                キャンセル
              </Button>
              <Button type="submit">
                {continueToNextUnit ? "保存して次へ" : "保存する"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
