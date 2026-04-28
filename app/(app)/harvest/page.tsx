"use client";

import { useState } from "react";
import { Download, Mic, Package2, Plus, Scale, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { PageIntro } from "@/components/app/page-intro";
import { StatCard } from "@/components/app/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInputPanel, type GuidedStep } from "@/components/voice/voice-input-panel";
import { useAgriApp } from "@/components/providers/agri-app-provider";
import { formatDate, getCurrentDateInputValue } from "@/lib/utils";
import {
  parseHarvestVoice,
  harvestParseSummary,
  matchProductionUnit,
  matchQuantityKg,
  matchWasteKg,
  matchQualityGrade,
  type ParseField,
} from "@/lib/voice-parsers";

const harvestSchema = z.object({
  productionUnitId: z.string().min(1, "生産エリアを選択してください"),
  cultivationCycleId: z.string().min(1, "作付を選択してください"),
  cropTypeId: z.string().min(1, "作物を選択してください"),
  lotCode: z.string().min(1, "ロットコードを入力してください"),
  harvestDate: z.string().min(1, "収穫日を入力してください"),
  quantityValue: z.coerce.number().min(0.1, "数量を入力してください"),
  quantityUnit: z.string().min(1, "単位を入力してください"),
  normalizedWeightKg: z.coerce.number().min(0, "重量換算を入力してください"),
  packageCount: z.coerce.number().int().min(0, "荷姿数を入力してください"),
  packageUnit: z.string().min(1, "荷姿単位を入力してください"),
  qualityGrade: z.string().min(1, "等級を入力してください"),
  wasteWeightKg: z.coerce.number().min(0, "廃棄重量を入力してください"),
  notes: z.string().optional(),
});

type HarvestForm = z.infer<typeof harvestSchema>;

function getDefaultHarvestValues(): Partial<HarvestForm> {
  return {
    harvestDate: getCurrentDateInputValue(),
    qualityGrade: "A",
    packageUnit: "箱",
  };
}

export default function HarvestPage() {
  const {
    selectedCropId,
    productionUnits,
    cultivationCycles,
    harvestRecords,
    addHarvestRecord,
    getCropLabel,
    matchesSelectedCrop,
    getUnitById,
    getCycleById,
  } = useAgriApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [unitFilter, setUnitFilter] = useState("all");
  const [voiceFields, setVoiceFields] = useState<ParseField[] | undefined>();
  const form = useForm<HarvestForm>({
    resolver: zodResolver(harvestSchema) as Resolver<HarvestForm>,
    defaultValues: getDefaultHarvestValues(),
  });

  const scopedCycles = cultivationCycles.filter((cycle) => matchesSelectedCrop(cycle.cropTypeId));
  const scopedRecords = harvestRecords
    .filter((record) => matchesSelectedCrop(record.cropTypeId))
    .filter((record) => unitFilter === "all" || record.productionUnitId === unitFilter);

  const totalWeight = scopedRecords.reduce((sum, record) => sum + record.normalizedWeightKg, 0);
  const totalPackages = scopedRecords.reduce((sum, record) => sum + record.packageCount, 0);
  const gradeACount = scopedRecords.filter((record) => ["A", "秀", "良"].includes(record.qualityGrade)).length;

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
      key: "quantityValue",
      label: "収穫量",
      prompt: "収穫量をキログラムで言ってください",
      example: "12.5キロ、三十五キロ",
      apply: (t) => {
        const kg = matchQuantityKg(t);
        if (kg !== undefined) {
          form.setValue("quantityValue", kg);
          form.setValue("normalizedWeightKg", kg);
        }
        return kg !== undefined ? `${kg} kg` : undefined;
      },
    },
    {
      key: "wasteWeightKg",
      label: "廃棄重量",
      prompt: "廃棄重量をキログラムで言ってください",
      example: "廃棄2キロ、ロス1.5キロ",
      optional: true,
      apply: (t) => {
        const kg = matchWasteKg(t);
        if (kg !== undefined) form.setValue("wasteWeightKg", kg);
        return kg !== undefined ? `${kg} kg` : undefined;
      },
    },
    {
      key: "qualityGrade",
      label: "等級",
      prompt: "等級を言ってください",
      example: "A等級、B等級、秀",
      optional: true,
      apply: (t) => {
        const grade = matchQualityGrade(t);
        if (grade) form.setValue("qualityGrade", grade);
        return grade;
      },
    },
  ];

  const handleVoiceTranscript = (transcript: string) => {
    const parsed = parseHarvestVoice(transcript);
    setVoiceFields(harvestParseSummary(parsed, productionUnits));

    if (parsed.unitLetter) {
      const unit = productionUnits.find((u) =>
        u.name.toUpperCase().includes(parsed.unitLetter!) ||
        u.code.toUpperCase().endsWith(parsed.unitLetter!) ||
        u.code.toUpperCase().endsWith(`-${parsed.unitLetter!}`)
      );
      if (unit) form.setValue("productionUnitId", unit.id);
    }
    if (parsed.quantityKg !== undefined) {
      form.setValue("quantityValue", parsed.quantityKg);
      form.setValue("normalizedWeightKg", parsed.quantityKg);
    }
    if (parsed.wasteKg !== undefined) form.setValue("wasteWeightKg", parsed.wasteKg);
    if (parsed.gradeAKg !== undefined) form.setValue("qualityGrade", "A");
    else if (parsed.gradeBKg !== undefined) form.setValue("qualityGrade", "B");
    else if (parsed.gradeCKg !== undefined) form.setValue("qualityGrade", "C");
    if (parsed.notes) form.setValue("notes", parsed.notes);
  };

  const onSubmit = async (values: HarvestForm) => {
    try {
      await addHarvestRecord(values);
      toast.success("収穫記録を保存しました");
      setDialogOpen(false);
      setVoiceFields(undefined);
      form.reset({
        ...getDefaultHarvestValues(),
        qualityGrade: values.qualityGrade,
        packageUnit: values.packageUnit,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "収穫記録の保存に失敗しました"
      );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        eyebrow="Harvest"
        title="収穫記録"
        description="作付設定で決めた記録単位を基準に、収穫ロットを作成します。スマホではカード、PCでは一覧表で確認できます。"
        scopeLabel={getCropLabel(selectedCropId)}
        actions={
          <>
            <Select value={unitFilter} onValueChange={setUnitFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="生産エリア" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての単位</SelectItem>
                {productionUnits.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button
              onClick={() => {
                form.reset(getDefaultHarvestValues());
                setVoiceFields(undefined);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              記録追加
            </Button>
          </>
        }
      />

      <div className="-mx-4 sm:mx-0 grid gap-3 sm:gap-4 md:grid-cols-3">
        <StatCard label="Harvest Weight" value={`${totalWeight.toFixed(1)} kg`} detail="重量換算合計" icon={Scale} tone="leaf" className="rounded-none sm:rounded-xl" />
        <StatCard label="Packages" value={`${totalPackages.toLocaleString()} 件`} detail="荷姿数の合計" icon={Package2} tone="earth" className="rounded-none sm:rounded-xl" />
        <StatCard label="Grade Mix" value={`${gradeACount} ロット`} detail="上位等級のロット数" icon={Sparkles} tone="sun" className="rounded-none sm:rounded-xl" />
      </div>

      <Card className="-mx-4 sm:mx-0 rounded-none sm:rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">収穫ロット一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {scopedRecords.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              条件に一致する収穫記録はありません。
            </div>
          ) : (
            <>
              <div className="space-y-3 sm:hidden">
                {scopedRecords.map((record) => {
                  const unit = getUnitById(record.productionUnitId);
                  const cycle = getCycleById(record.cultivationCycleId);
                  return (
                    <div key={record.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{record.lotCode}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(record.harvestDate)} · {unit?.name}
                          </p>
                        </div>
                        <Badge variant="secondary">{record.qualityGrade}</Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">作付</span>
                        <span className="text-right">{cycle?.cycleName ?? "-"}</span>
                        <span className="text-muted-foreground">数量</span>
                        <span className="text-right">{record.quantityValue} {record.quantityUnit}</span>
                        <span className="text-muted-foreground">重量換算</span>
                        <span className="text-right">{record.normalizedWeightKg.toFixed(1)} kg</span>
                        <span className="text-muted-foreground">荷姿</span>
                        <span className="text-right">{record.packageCount} {record.packageUnit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[920px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                      <th className="px-3 py-3">収穫日</th>
                      <th className="px-3 py-3">生産エリア</th>
                      <th className="px-3 py-3">作付</th>
                      <th className="px-3 py-3">ロット</th>
                      <th className="px-3 py-3 text-right">数量</th>
                      <th className="px-3 py-3 text-right">重量換算</th>
                      <th className="px-3 py-3 text-right">荷姿</th>
                      <th className="px-3 py-3">等級</th>
                      <th className="px-3 py-3 text-right">廃棄</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scopedRecords.map((record) => {
                      const unit = getUnitById(record.productionUnitId);
                      const cycle = getCycleById(record.cultivationCycleId);
                      return (
                        <tr key={record.id} className="border-b border-border last:border-0">
                          <td className="px-3 py-3 font-medium">{formatDate(record.harvestDate)}</td>
                          <td className="px-3 py-3"><Badge variant="outline">{unit?.name}</Badge></td>
                          <td className="px-3 py-3 text-muted-foreground">{cycle?.cycleName}</td>
                          <td className="px-3 py-3 font-medium">{record.lotCode}</td>
                          <td className="px-3 py-3 text-right">{record.quantityValue} {record.quantityUnit}</td>
                          <td className="px-3 py-3 text-right">{record.normalizedWeightKg.toFixed(1)} kg</td>
                          <td className="px-3 py-3 text-right">{record.packageCount} {record.packageUnit}</td>
                          <td className="px-3 py-3"><Badge variant="secondary">{record.qualityGrade}</Badge></td>
                          <td className="px-3 py-3 text-right">{record.wasteWeightKg.toFixed(1)} kg</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setVoiceFields(undefined); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <DialogTitle>収穫ロットを追加</DialogTitle>
              <Mic className="h-4 w-4 text-muted-foreground" />
            </div>
          </DialogHeader>
          <form className="grid gap-3 sm:gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <VoiceInputPanel
              onTranscriptReady={handleVoiceTranscript}
              parseFields={voiceFields}
              onClear={() => setVoiceFields(undefined)}
              guidedSteps={guidedSteps}
            />

            <div className="grid gap-2 sm:gap-3 sm:grid-cols-2">
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
                <Label>作付</Label>
                <Select
                  onValueChange={(value) => {
                    const cycle = getCycleById(value);
                    if (!cycle) return;
                    form.setValue("cultivationCycleId", value);
                    form.setValue("cropTypeId", cycle.cropTypeId);
                    form.setValue("quantityUnit", cycle.primaryRecordUnit);
                    form.setValue("packageUnit", cycle.shipmentUnit);
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

            <div className="grid gap-2 sm:gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="lotCode">ロットコード</Label>
                <Input id="lotCode" placeholder="ST-A-0424-AM" {...form.register("lotCode")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="harvestDate">収穫日</Label>
                <Input id="harvestDate" type="date" {...form.register("harvestDate")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
              <div className="grid gap-1.5">
                <Label htmlFor="quantityValue">数量</Label>
                <Input id="quantityValue" type="number" step="0.1" {...form.register("quantityValue")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="quantityUnit">数量単位</Label>
                <Input id="quantityUnit" {...form.register("quantityUnit")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="normalizedWeightKg">重量換算 (kg)</Label>
                <Input id="normalizedWeightKg" type="number" step="0.1" {...form.register("normalizedWeightKg")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="qualityGrade">等級</Label>
                <Input id="qualityGrade" {...form.register("qualityGrade")} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="packageCount">荷姿数</Label>
                <Input id="packageCount" type="number" {...form.register("packageCount")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="packageUnit">荷姿単位</Label>
                <Input id="packageUnit" {...form.register("packageUnit")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="wasteWeightKg">廃棄重量 (kg)</Label>
                <Input id="wasteWeightKg" type="number" step="0.1" {...form.register("wasteWeightKg")} />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="notes">備考</Label>
              <Textarea id="notes" rows={2} {...form.register("notes")} />
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
