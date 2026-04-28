"use client";

import { useState } from "react";
import { Download, Package, Plus, Truck } from "lucide-react";
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
import { useAgriApp } from "@/components/providers/agri-app-provider";
import { formatCurrency, formatDate, getCurrentDateInputValue } from "@/lib/utils";

const shipmentSchema = z.object({
  productionUnitId: z.string().min(1, "生産エリアを選択してください"),
  cultivationCycleId: z.string().min(1, "作付を選択してください"),
  cropTypeId: z.string().min(1, "作物を選択してください"),
  harvestRecordId: z.string().min(1, "収穫ロットを選択してください"),
  shipmentDate: z.string().min(1, "出荷日を入力してください"),
  shipmentLotCode: z.string().min(1, "出荷ロットを入力してください"),
  quantityValue: z.coerce.number().min(0.1, "数量を入力してください"),
  quantityUnit: z.string().min(1, "単位を入力してください"),
  normalizedWeightKg: z.coerce.number().min(0, "重量換算を入力してください"),
  packageCount: z.coerce.number().int().min(0, "荷姿数を入力してください"),
  packageUnit: z.string().min(1, "荷姿単位を入力してください"),
  averageUnitPrice: z.coerce.number().min(0, "単価を入力してください"),
  revenueAmount: z.coerce.number().min(0, "売上を入力してください"),
  destinationName: z.string().min(1, "出荷先を入力してください"),
  notes: z.string().optional(),
});

type ShipmentForm = z.infer<typeof shipmentSchema>;

function getDefaultShipmentValues(): Partial<ShipmentForm> {
  return {
    shipmentDate: getCurrentDateInputValue(),
    packageUnit: "箱",
  };
}

export default function ShipmentsPage() {
  const {
    selectedCropId,
    productionUnits,
    cultivationCycles,
    harvestRecords,
    shipmentRecords,
    addShipmentRecord,
    getCropLabel,
    matchesSelectedCrop,
    getUnitById,
    getCycleById,
  } = useAgriApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const form = useForm<ShipmentForm>({
    resolver: zodResolver(shipmentSchema) as Resolver<ShipmentForm>,
    defaultValues: getDefaultShipmentValues(),
  });

  const scopedCycles = cultivationCycles.filter((cycle) => matchesSelectedCrop(cycle.cropTypeId));
  const scopedHarvests = harvestRecords.filter((record) => matchesSelectedCrop(record.cropTypeId));
  const scopedShipments = shipmentRecords.filter((record) => matchesSelectedCrop(record.cropTypeId));
  const totalRevenue = scopedShipments.reduce((sum, record) => sum + record.revenueAmount, 0);
  const totalWeight = scopedShipments.reduce((sum, record) => sum + record.normalizedWeightKg, 0);

  const onSubmit = async (values: ShipmentForm) => {
    try {
      await addShipmentRecord(values);
      toast.success("出荷記録を保存しました");
      setDialogOpen(false);
      form.reset({ ...getDefaultShipmentValues(), packageUnit: values.packageUnit });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "出荷記録の保存に失敗しました"
      );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        eyebrow="Shipments"
        title="出荷記録"
        description="収穫ロットを参照しながら出荷ロットを作成します。スマホではカード、PCでは一覧表で確認できます。"
        scopeLabel={getCropLabel(selectedCropId)}
        actions={
          <>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button
              onClick={() => {
                form.reset(getDefaultShipmentValues());
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              記録追加
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Shipment Revenue" value={formatCurrency(totalRevenue)} detail="作物スコープ内の売上" icon={Truck} tone="sun" />
        <StatCard label="Shipment Weight" value={`${totalWeight.toFixed(1)} kg`} detail="重量換算ベース" icon={Package} tone="leaf" />
        <StatCard
          label="Average Price"
          value={formatCurrency(totalWeight > 0 ? totalRevenue / totalWeight : 0)}
          detail="重量換算あたりの平均単価"
          icon={Truck}
          tone="earth"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">出荷ロット一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {scopedShipments.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              条件に一致する出荷記録はありません。
            </div>
          ) : (
            <>
              <div className="space-y-3 sm:hidden">
                {scopedShipments.map((shipment) => {
                  const unit = getUnitById(shipment.productionUnitId);
                  const harvest = harvestRecords.find((record) => record.id === shipment.harvestRecordId);
                  return (
                    <div key={shipment.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{shipment.shipmentLotCode}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(shipment.shipmentDate)} · {unit?.name}
                          </p>
                        </div>
                        <span className="text-sm font-semibold">{formatCurrency(shipment.revenueAmount)}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">収穫ロット</span>
                        <span className="text-right">{harvest?.lotCode ?? "-"}</span>
                        <span className="text-muted-foreground">数量</span>
                        <span className="text-right">{shipment.quantityValue} {shipment.quantityUnit}</span>
                        <span className="text-muted-foreground">重量換算</span>
                        <span className="text-right">{shipment.normalizedWeightKg.toFixed(1)} kg</span>
                        <span className="text-muted-foreground">出荷先</span>
                        <span className="text-right">{shipment.destinationName}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[940px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                      <th className="px-3 py-3">出荷日</th>
                      <th className="px-3 py-3">生産エリア</th>
                      <th className="px-3 py-3">出荷ロット</th>
                      <th className="px-3 py-3">収穫ロット</th>
                      <th className="px-3 py-3 text-right">数量</th>
                      <th className="px-3 py-3 text-right">重量換算</th>
                      <th className="px-3 py-3 text-right">単価</th>
                      <th className="px-3 py-3 text-right">売上</th>
                      <th className="px-3 py-3">出荷先</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scopedShipments.map((shipment) => {
                      const unit = getUnitById(shipment.productionUnitId);
                      const harvest = harvestRecords.find((record) => record.id === shipment.harvestRecordId);
                      return (
                        <tr key={shipment.id} className="border-b border-border last:border-0">
                          <td className="px-3 py-3 font-medium">{formatDate(shipment.shipmentDate)}</td>
                          <td className="px-3 py-3"><Badge variant="outline">{unit?.name}</Badge></td>
                          <td className="px-3 py-3 font-medium">{shipment.shipmentLotCode}</td>
                          <td className="px-3 py-3 text-muted-foreground">{harvest?.lotCode}</td>
                          <td className="px-3 py-3 text-right">{shipment.quantityValue} {shipment.quantityUnit}</td>
                          <td className="px-3 py-3 text-right">{shipment.normalizedWeightKg.toFixed(1)} kg</td>
                          <td className="px-3 py-3 text-right">{formatCurrency(shipment.averageUnitPrice)}</td>
                          <td className="px-3 py-3 text-right font-semibold">{formatCurrency(shipment.revenueAmount)}</td>
                          <td className="px-3 py-3">{shipment.destinationName}</td>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>出荷ロットを追加</DialogTitle>
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
                <Label>作付</Label>
                <Select
                  onValueChange={(value) => {
                    const cycle = getCycleById(value);
                    if (!cycle) return;
                    form.setValue("cultivationCycleId", value);
                    form.setValue("cropTypeId", cycle.cropTypeId);
                    form.setValue("quantityUnit", cycle.shipmentUnit);
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

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>参照する収穫ロット</Label>
                <Select
                  onValueChange={(value) => {
                    const harvest = harvestRecords.find((record) => record.id === value);
                    if (!harvest) return;
                    form.setValue("harvestRecordId", value);
                    form.setValue("quantityValue", harvest.packageCount);
                    form.setValue("quantityUnit", harvest.packageUnit);
                    form.setValue("normalizedWeightKg", harvest.normalizedWeightKg);
                    form.setValue("packageCount", harvest.packageCount);
                    form.setValue("packageUnit", harvest.packageUnit);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {scopedHarvests.map((harvest) => (
                      <SelectItem key={harvest.id} value={harvest.id}>
                        {harvest.lotCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="shipmentLotCode">出荷ロット</Label>
                <Input id="shipmentLotCode" placeholder="OUT-ST-A-0424-02" {...form.register("shipmentLotCode")} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-1.5">
                <Label htmlFor="shipmentDate">出荷日</Label>
                <Input id="shipmentDate" type="date" {...form.register("shipmentDate")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="quantityValue">数量</Label>
                <Input id="quantityValue" type="number" step="0.1" {...form.register("quantityValue")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="quantityUnit">単位</Label>
                <Input id="quantityUnit" {...form.register("quantityUnit")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="normalizedWeightKg">重量換算 (kg)</Label>
                <Input id="normalizedWeightKg" type="number" step="0.1" {...form.register("normalizedWeightKg")} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-1.5">
                <Label htmlFor="packageCount">荷姿数</Label>
                <Input id="packageCount" type="number" {...form.register("packageCount")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="packageUnit">荷姿単位</Label>
                <Input id="packageUnit" {...form.register("packageUnit")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="averageUnitPrice">平均単価</Label>
                <Input id="averageUnitPrice" type="number" {...form.register("averageUnitPrice")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="revenueAmount">売上</Label>
                <Input id="revenueAmount" type="number" {...form.register("revenueAmount")} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="destinationName">出荷先</Label>
                <Input id="destinationName" placeholder="JA集荷場" {...form.register("destinationName")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="notes">備考</Label>
                <Textarea id="notes" rows={3} {...form.register("notes")} />
              </div>
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
