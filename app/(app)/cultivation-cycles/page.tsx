"use client";

import { useState } from "react";
import { CalendarRange, Plus, Sprout } from "lucide-react";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { PageIntro } from "@/components/app/page-intro";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAgriApp } from "@/components/providers/agri-app-provider";
import { formatDate } from "@/lib/utils";

const cycleSchema = z.object({
  productionUnitId: z.string().min(1, "生産エリアを選択してください"),
  cropTypeId: z.string().min(1, "作物を選択してください"),
  varietyName: z.string().min(1, "品種名を入力してください"),
  cycleName: z.string().min(1, "作付名を入力してください"),
  startDate: z.string().min(1, "開始日を入力してください"),
  plantingDate: z.string().min(1, "定植日を入力してください"),
  expectedHarvestStartDate: z.string().min(1, "収穫開始予定を入力してください"),
  expectedHarvestEndDate: z.string().min(1, "収穫終了予定を入力してください"),
  primaryRecordUnit: z.string().min(1, "主単位を入力してください"),
  secondaryRecordUnit: z.string().optional(),
  shipmentUnit: z.string().min(1, "出荷単位を入力してください"),
  plantedCount: z.coerce.number().min(1, "定植母数を入力してください"),
  plantedAreaM2: z.coerce.number().min(1, "作付面積を入力してください"),
  sourceBatchCode: z.string().optional(),
  notes: z.string().optional(),
});

type CycleForm = z.infer<typeof cycleSchema>;

export default function CultivationCyclesPage() {
  const {
    selectedCropId,
    crops,
    productionUnits,
    cultivationCycles,
    addCultivationCycle,
    getCropLabel,
    matchesSelectedCrop,
    getUnitById,
  } = useAgriApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const form = useForm<CycleForm>({
    resolver: zodResolver(cycleSchema) as Resolver<CycleForm>,
    defaultValues: {
      cropTypeId: selectedCropId === "all" ? crops[0]?.id ?? "" : selectedCropId,
      primaryRecordUnit: "kg",
      shipmentUnit: "箱",
    },
  });

  const filteredCycles = cultivationCycles.filter((cycle) => matchesSelectedCrop(cycle.cropTypeId));

  const onSubmit = async (values: CycleForm) => {
    try {
      await addCultivationCycle(values);
      toast.success("作付サイクルを追加しました");
      setDialogOpen(false);
      form.reset({
        cropTypeId: values.cropTypeId,
        primaryRecordUnit: values.primaryRecordUnit,
        shipmentUnit: values.shipmentUnit,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "作付サイクルの追加に失敗しました"
      );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        eyebrow="Cultivation"
        title="作付設定"
        description="生産エリアと作物を結ぶ中心画面です。ここで記録単位、出荷単位、定植母数を決め、後続の収穫・出荷・分析の既定値に使います。"
        scopeLabel={getCropLabel(selectedCropId)}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            作付を追加
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {crops.map((crop) => {
          const count = cultivationCycles.filter((cycle) => cycle.cropTypeId === crop.id && cycle.status === "active").length;
          return (
            <Card key={crop.id} className="border-border/70 bg-white/75 shadow-sm backdrop-blur-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Active Cycles</p>
                    <p className="mt-3 text-3xl font-bold tracking-tight">{count}</p>
                  </div>
                  <Badge className={crop.surfaceClass}>{crop.name}</Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  主単位 {crop.defaultYieldUnit} / 出荷単位 {crop.defaultShipmentUnit}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border/70 bg-white/75 shadow-sm backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="h-4 w-4 text-primary" />
            作付サイクル一覧
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {filteredCycles.map((cycle) => {
            const unit = getUnitById(cycle.productionUnitId);
            return (
              <div key={cycle.id} className="rounded-2xl border border-border/70 bg-background/85 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold">{cycle.cycleName}</p>
                      <Badge variant={cycle.status === "active" ? "success" : "secondary"}>
                        {cycle.status === "active" ? "進行中" : cycle.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {unit?.name} / {cycle.varietyName}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{cycle.primaryRecordUnit}</Badge>
                    <Badge variant="outline">{cycle.shipmentUnit}</Badge>
                    <Badge variant="outline">{cycle.plantedCount.toLocaleString()} 株</Badge>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                  <span>開始: {formatDate(cycle.startDate)}</span>
                  <span>定植: {formatDate(cycle.plantingDate)}</span>
                  <span>収穫開始: {formatDate(cycle.expectedHarvestStartDate)}</span>
                  <span>収穫終了: {formatDate(cycle.expectedHarvestEndDate)}</span>
                  <span>作付面積: {cycle.plantedAreaM2.toLocaleString()} m²</span>
                  <span>苗ロット: {cycle.sourceBatchCode || "-"}</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>作付サイクルを追加</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>生産エリア</Label>
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
                <Label>作物</Label>
                <Select
                  defaultValue={form.getValues("cropTypeId")}
                  onValueChange={(value) => {
                    const crop = crops.find((item) => item.id === value);
                    form.setValue("cropTypeId", value as CycleForm["cropTypeId"]);
                    if (crop) {
                      form.setValue("primaryRecordUnit", crop.defaultYieldUnit);
                      form.setValue("shipmentUnit", crop.defaultShipmentUnit);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {crops.map((crop) => (
                      <SelectItem key={crop.id} value={crop.id}>
                        {crop.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="cycleName">作付名</Label>
                <Input id="cycleName" placeholder="2026 夏トマト" {...form.register("cycleName")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="varietyName">品種</Label>
                <Input id="varietyName" placeholder="麗夏" {...form.register("varietyName")} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-1.5">
                <Label htmlFor="startDate">開始日</Label>
                <Input id="startDate" type="date" {...form.register("startDate")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="plantingDate">定植日</Label>
                <Input id="plantingDate" type="date" {...form.register("plantingDate")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="expectedHarvestStartDate">収穫開始</Label>
                <Input id="expectedHarvestStartDate" type="date" {...form.register("expectedHarvestStartDate")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="expectedHarvestEndDate">収穫終了</Label>
                <Input id="expectedHarvestEndDate" type="date" {...form.register("expectedHarvestEndDate")} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-1.5">
                <Label htmlFor="primaryRecordUnit">主単位</Label>
                <Input id="primaryRecordUnit" {...form.register("primaryRecordUnit")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="secondaryRecordUnit">補助単位</Label>
                <Input id="secondaryRecordUnit" {...form.register("secondaryRecordUnit")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="shipmentUnit">出荷単位</Label>
                <Input id="shipmentUnit" {...form.register("shipmentUnit")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="sourceBatchCode">苗ロット</Label>
                <Input id="sourceBatchCode" {...form.register("sourceBatchCode")} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="plantedCount">定植母数</Label>
                <Input id="plantedCount" type="number" {...form.register("plantedCount")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="plantedAreaM2">作付面積 (m²)</Label>
                <Input id="plantedAreaM2" type="number" {...form.register("plantedAreaM2")} />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="notes">備考</Label>
              <Textarea id="notes" rows={3} {...form.register("notes")} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit">
                <Sprout className="mr-2 h-4 w-4" />
                作付を保存
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
