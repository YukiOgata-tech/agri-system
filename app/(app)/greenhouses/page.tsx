"use client";

import { useState } from "react";
import { Layers3, Map, MoreVertical, Plus, Power } from "lucide-react";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { PageIntro } from "@/components/app/page-intro";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAgriApp } from "@/components/providers/agri-app-provider";
import { getProductionUnitTypeLabel } from "@/lib/agri-mock-data";

const unitSchema = z.object({
  farmName: z.string().min(1, "農場名を入力してください"),
  parentUnitId: z.string().optional(),
  unitType: z.enum(["greenhouse", "open_field", "plot", "bed", "nursery_area"]),
  code: z.string().optional(),
  name: z.string().min(1, "名称を入力してください"),
  areaM2: z.coerce.number().min(1, "面積を入力してください"),
  notes: z.string().optional(),
});

type UnitForm = z.infer<typeof unitSchema>;

export default function ProductionUnitsPage() {
  const {
    selectedCropId,
    productionUnits,
    cultivationCycles,
    addProductionUnit,
    toggleProductionUnitActive,
    getCropLabel,
    matchesSelectedCrop,
    getUnitById,
  } = useAgriApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const form = useForm<UnitForm>({
    resolver: zodResolver(unitSchema) as Resolver<UnitForm>,
    defaultValues: { farmName: "静岡本園", unitType: "greenhouse" },
  });

  const filteredUnits = productionUnits.filter((unit) => {
    const cycleMatch =
      selectedCropId === "all" ||
      cultivationCycles.some(
        (cycle) => cycle.productionUnitId === unit.id && matchesSelectedCrop(cycle.cropTypeId)
      );
    const typeMatch = typeFilter === "all" || unit.unitType === typeFilter;
    return cycleMatch && typeMatch;
  });

  const onSubmit = async (values: UnitForm) => {
    try {
      await addProductionUnit(values);
      toast.success("生産エリアを追加しました");
      setDialogOpen(false);
      form.reset({ farmName: values.farmName, unitType: values.unitType });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "生産エリアの追加に失敗しました"
      );
    }
  };

  const handleToggleUnitActive = async (unitId: string) => {
    try {
      await toggleProductionUnitActive(unitId);
      toast.success("生産エリアの状態を更新しました");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "生産エリアの状態更新に失敗しました"
      );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        eyebrow="Production Units"
        title="生産エリア管理"
        description="ハウス、露地、区画、ベッドを同じ土台で管理します。作物切替に応じて関連するエリアだけを絞り込めます。"
        scopeLabel={getCropLabel(selectedCropId)}
        actions={
          <>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="タイプ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="greenhouse">ハウス</SelectItem>
                <SelectItem value="open_field">露地圃場</SelectItem>
                <SelectItem value="plot">区画</SelectItem>
                <SelectItem value="bed">ベッド</SelectItem>
                <SelectItem value="nursery_area">育苗</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              生産エリアを追加
            </Button>
          </>
        }
      />

      <div className="-mx-4 sm:mx-0 grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filteredUnits.map((unit) => {
          const cycle = cultivationCycles.find(
            (item) => item.productionUnitId === unit.id && item.status === "active"
          );
          const parent = unit.parentUnitId ? getUnitById(unit.parentUnitId) : undefined;
          return (
            <Card key={unit.id} className="rounded-none sm:rounded-xl">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      {unit.unitType === "greenhouse" ? (
                        <Layers3 className="h-5 w-5 text-primary" />
                      ) : (
                        <Map className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">{unit.name}</CardTitle>
                        <Badge variant={unit.isActive ? "success" : "secondary"}>
                          {unit.isActive ? "稼働中" : "停止中"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {unit.farmName} · {getProductionUnitTypeLabel(unit.unitType)}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => void handleToggleUnitActive(unit.id)}>
                        <Power className="mr-2 h-4 w-4" />
                        {unit.isActive ? "停止にする" : "再稼働にする"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">識別コード</span>
                  <span className="text-right font-medium">{unit.code}</span>
                  <span className="text-muted-foreground">面積</span>
                  <span className="text-right font-medium">{unit.areaM2.toLocaleString()} m²</span>
                  <span className="text-muted-foreground">親エリア</span>
                  <span className="text-right font-medium">{parent?.name ?? "-"}</span>
                  <span className="text-muted-foreground">潅水</span>
                  <span className="text-right font-medium">{unit.irrigationSystemType ?? "-"}</span>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Current Cycle
                  </p>
                  {cycle ? (
                    <div className="mt-2 space-y-1">
                      <p className="font-semibold">{cycle.cycleName}</p>
                      <p className="text-sm text-muted-foreground">{cycle.varietyName}</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Badge variant="outline">{cycle.primaryRecordUnit}</Badge>
                        <Badge variant="outline">{cycle.shipmentUnit}</Badge>
                        <Badge variant="outline">{cycle.plantedCount.toLocaleString()} 株</Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">現在の作付は未登録です。</p>
                  )}
                </div>

                {unit.notes ? <p className="text-sm text-muted-foreground">{unit.notes}</p> : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>生産エリアの追加</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="farmName">農場</Label>
                <Input id="farmName" {...form.register("farmName")} />
              </div>
              <div className="grid gap-1.5">
                <Label>タイプ</Label>
                <Select
                  defaultValue={form.getValues("unitType")}
                  onValueChange={(value) => form.setValue("unitType", value as UnitForm["unitType"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="greenhouse">ハウス</SelectItem>
                    <SelectItem value="open_field">露地圃場</SelectItem>
                    <SelectItem value="plot">区画</SelectItem>
                    <SelectItem value="bed">ベッド</SelectItem>
                    <SelectItem value="nursery_area">育苗</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="code">識別コード</Label>
                <Input id="code" placeholder="任意 / 例: GH-D" {...form.register("code")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="name">名称</Label>
                <Input id="name" placeholder="D棟" {...form.register("name")} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>親単位</Label>
                <Select onValueChange={(value) => form.setValue("parentUnitId", value === "none" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="なし" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">なし</SelectItem>
                    {productionUnits.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="areaM2">面積 (m²)</Label>
                <Input id="areaM2" type="number" {...form.register("areaM2")} />
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
              <Button type="submit">追加する</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
