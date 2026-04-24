"use client";

import { useState } from "react";
import {
  Droplets,
  Eye,
  FlaskConical,
  Plus,
  Shield,
  Tractor,
} from "lucide-react";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { PageIntro } from "@/components/app/page-intro";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAgriApp } from "@/components/providers/agri-app-provider";
import { formatDate } from "@/lib/utils";
import { getCropLabel } from "@/lib/agri-mock-data";

const workSchema = z.object({
  productionUnitId: z.string().min(1, "生産単位を選択してください"),
  cultivationCycleId: z.string().min(1, "作付を選択してください"),
  cropTypeId: z.enum(["strawberry", "tomato", "komatsuna"]),
  workDate: z.string().min(1, "作業日を入力してください"),
  workType: z.enum(["irrigation", "fertigation", "pesticide", "harvest", "pruning", "inspection", "shipping", "other"]),
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

const workLabels: Record<WorkForm["workType"], { label: string; icon: typeof Tractor }> = {
  irrigation: { label: "潅水", icon: Droplets },
  fertigation: { label: "施肥・液肥", icon: FlaskConical },
  pesticide: { label: "防除", icon: Shield },
  harvest: { label: "収穫", icon: Tractor },
  pruning: { label: "摘葉・整枝", icon: Tractor },
  inspection: { label: "見回り", icon: Eye },
  shipping: { label: "出荷作業", icon: Tractor },
  other: { label: "その他", icon: Tractor },
};

export default function WorkLogsPage() {
  const {
    selectedCropId,
    productionUnits,
    cultivationCycles,
    workLogs,
    materialLots,
    workMaterialUsages,
    addWorkLog,
    matchesSelectedCrop,
    getUnitById,
    getCycleById,
    getMaterialLotById,
  } = useAgriApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<WorkForm["workType"]>("irrigation");
  const form = useForm<WorkForm>({
    resolver: zodResolver(workSchema) as Resolver<WorkForm>,
    defaultValues: {
      workDate: "2026-04-24",
      workType: "irrigation",
      workerCount: 1,
      durationMinutes: 30,
    },
  });

  const scopedCycles = cultivationCycles.filter((cycle) => matchesSelectedCrop(cycle.cropTypeId));
  const scopedLogs = workLogs.filter((log) => matchesSelectedCrop(log.cropTypeId));

  const onSubmit = (values: WorkForm) => {
    const usages =
      values.materialLotId && values.usageQuantityValue && values.usageQuantityUnit
        ? [
            {
              materialLotId: values.materialLotId,
              materialName: getMaterialLotById(values.materialLotId)?.materialName ?? "",
              lotCode: getMaterialLotById(values.materialLotId)?.lotCode ?? "",
              usageQuantityValue: values.usageQuantityValue,
              usageQuantityUnit: values.usageQuantityUnit,
              targetPestOrDisease: values.targetPestOrDisease,
              dilutionRatio: values.dilutionRatio,
            },
          ]
        : [];

    addWorkLog(
      {
        productionUnitId: values.productionUnitId,
        cultivationCycleId: values.cultivationCycleId,
        cropTypeId: values.cropTypeId,
        workDate: values.workDate,
        workType: values.workType,
        durationMinutes: values.durationMinutes,
        workerCount: values.workerCount,
        operatorName: values.operatorName,
        sourceType: "manual",
        note: values.note,
        irrigation:
          values.workType === "irrigation" || values.workType === "fertigation"
            ? {
                waterVolumeL: values.waterVolumeL ?? 0,
                timingType: values.timingType ?? "未設定",
                method: values.irrigationMethod ?? "未設定",
              }
            : undefined,
      },
      usages
    );
    toast.success("作業記録を保存しました");
    setDialogOpen(false);
    form.reset({ workDate: "2026-04-24", workType: values.workType, workerCount: 1, durationMinutes: 30 });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        eyebrow="Operations"
        title="作業記録"
        description="作物スコープに応じて日々の作業を整理し、必要に応じて資材ロットを紐づけます。施肥・防除のトレーサビリティはここから積み上げます。"
        scopeLabel={getCropLabel(selectedCropId)}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            作業を記録
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {scopedLogs.slice(0, 6).map((log) => {
          const unit = getUnitById(log.productionUnitId);
          const cycle = getCycleById(log.cultivationCycleId);
          const usages = (log.materialUsageIds ?? [])
            .map((id) => workMaterialUsages.find((usage) => usage.id === id))
            .filter(Boolean);
          const Icon = workLabels[log.workType].icon;
          return (
            <Card key={log.id} className="border-border/70 bg-white/75 shadow-sm backdrop-blur-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--surface-sand)] text-[color:var(--accent-earth)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{workLabels[log.workType].label}</p>
                      <p className="text-sm text-muted-foreground">{unit?.name} / {cycle?.varietyName}</p>
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
                    {log.irrigation.method} / {log.irrigation.waterVolumeL} L / {log.irrigation.timingType}
                  </div>
                ) : null}
                {usages.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {usages.map((usage) => (
                      <Badge key={usage?.id} className="bg-amber-100 text-amber-900">
                        {usage?.materialName} {usage?.usageQuantityValue}{usage?.usageQuantityUnit} / {usage?.lotCode}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                {log.note ? <p className="mt-4 text-sm text-muted-foreground">{log.note}</p> : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>作業を記録</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>生産単位</Label>
                <Select onValueChange={(value) => form.setValue("productionUnitId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {productionUnits.filter((unit) => unit.isActive).map((unit) => (
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
                  onValueChange={(value) => {
                    const cycle = getCycleById(value);
                    if (!cycle) return;
                    form.setValue("cultivationCycleId", value);
                    form.setValue("cropTypeId", cycle.cropTypeId);
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

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-1.5 lg:col-span-2">
                <Label>作業種別</Label>
                <Select
                  defaultValue={selectedType}
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

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="durationMinutes">作業時間 (分)</Label>
                <Input id="durationMinutes" type="number" {...form.register("durationMinutes")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="workerCount">人数</Label>
                <Input id="workerCount" type="number" {...form.register("workerCount")} />
              </div>
            </div>

            {(selectedType === "irrigation" || selectedType === "fertigation") ? (
              <div className="grid gap-3 rounded-2xl border border-border/70 bg-background/80 p-4 sm:grid-cols-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="waterVolumeL">水量 (L)</Label>
                  <Input id="waterVolumeL" type="number" {...form.register("waterVolumeL")} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="timingType">タイミング</Label>
                  <Input id="timingType" placeholder="朝 / 夕方" {...form.register("timingType")} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="irrigationMethod">方法</Label>
                  <Input id="irrigationMethod" placeholder="点滴潅水" {...form.register("irrigationMethod")} />
                </div>
              </div>
            ) : null}

            {(selectedType === "fertigation" || selectedType === "pesticide") ? (
              <div className="grid gap-3 rounded-2xl border border-border/70 bg-background/80 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="grid gap-1.5 lg:col-span-2">
                  <Label>資材ロット</Label>
                  <Select onValueChange={(value) => form.setValue("materialLotId", value)}>
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
                  <Input id="usageQuantityValue" type="number" step="0.1" {...form.register("usageQuantityValue")} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="usageQuantityUnit">単位</Label>
                  <Input id="usageQuantityUnit" placeholder="L / mL" {...form.register("usageQuantityUnit")} />
                </div>
                <div className="grid gap-1.5 lg:col-span-2">
                  <Label htmlFor="targetPestOrDisease">対象病害虫</Label>
                  <Input id="targetPestOrDisease" {...form.register("targetPestOrDisease")} />
                </div>
                <div className="grid gap-1.5 lg:col-span-2">
                  <Label htmlFor="dilutionRatio">希釈倍率</Label>
                  <Input id="dilutionRatio" placeholder="1000倍" {...form.register("dilutionRatio")} />
                </div>
              </div>
            ) : null}

            <div className="grid gap-1.5">
              <Label htmlFor="note">備考</Label>
              <Textarea id="note" rows={3} {...form.register("note")} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit">保存する</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
