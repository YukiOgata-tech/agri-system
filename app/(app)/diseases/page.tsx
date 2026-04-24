"use client";

import { useState } from "react";
import { AlertTriangle, Bug, CheckCircle2, Plus } from "lucide-react";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { PageIntro } from "@/components/app/page-intro";
import { StatCard } from "@/components/app/stat-card";
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

const diseaseSchema = z.object({
  productionUnitId: z.string().min(1, "生産単位を選択してください"),
  cultivationCycleId: z.string().min(1, "作付を選択してください"),
  cropTypeId: z.enum(["strawberry", "tomato", "komatsuna"]),
  occurredOn: z.string().min(1, "発生日を入力してください"),
  category: z.enum(["disease", "pest"]),
  name: z.string().min(1, "名称を入力してください"),
  severityLevel: z.coerce.number().min(1).max(5),
  affectedAreaRatio: z.coerce.number().min(0).max(100),
  actionTaken: z.string().optional(),
  note: z.string().optional(),
});

type DiseaseForm = z.infer<typeof diseaseSchema>;

export default function DiseasesPage() {
  const {
    selectedCropId,
    productionUnits,
    cultivationCycles,
    diseaseIncidents,
    addDiseaseIncident,
    resolveDiseaseIncident,
    matchesSelectedCrop,
    getUnitById,
  } = useAgriApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved">("all");
  const form = useForm<DiseaseForm>({
    resolver: zodResolver(diseaseSchema) as Resolver<DiseaseForm>,
    defaultValues: { occurredOn: "2026-04-24", category: "disease", severityLevel: 2, affectedAreaRatio: 5 },
  });

  const scopedCycles = cultivationCycles.filter((cycle) => matchesSelectedCrop(cycle.cropTypeId));
  const scopedIncidents = diseaseIncidents.filter((incident) => matchesSelectedCrop(incident.cropTypeId));
  const filteredIncidents = scopedIncidents.filter((incident) => {
    if (statusFilter === "open") return !incident.resolvedOn;
    if (statusFilter === "resolved") return Boolean(incident.resolvedOn);
    return true;
  });

  const onSubmit = (values: DiseaseForm) => {
    addDiseaseIncident(values);
    toast.success("病害虫記録を保存しました");
    setDialogOpen(false);
    form.reset({ occurredOn: "2026-04-24", category: values.category, severityLevel: 2, affectedAreaRatio: 5 });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        eyebrow="Incidents"
        title="病害虫記録"
        description="作物スコープに応じて病害虫の発生、対処、解決状態を追跡します。AI分析や環境ログと結びつける前提の履歴です。"
        scopeLabel={getCropLabel(selectedCropId)}
        actions={
          <>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger className="w-40 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="open">未解決</SelectItem>
                <SelectItem value="resolved">解決済み</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              発生を追加
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Open Incidents" value={`${scopedIncidents.filter((item) => !item.resolvedOn).length} 件`} detail="対応中の病害虫" icon={AlertTriangle} tone="danger" />
        <StatCard label="Resolved" value={`${scopedIncidents.filter((item) => item.resolvedOn).length} 件`} detail="収束済み" icon={CheckCircle2} tone="leaf" />
        <StatCard label="Scope Total" value={`${scopedIncidents.length} 件`} detail="選択作物に紐づく全履歴" icon={Bug} tone="earth" />
      </div>

      <div className="grid gap-4">
        {filteredIncidents.map((incident) => {
          const unit = getUnitById(incident.productionUnitId);
          return (
            <Card key={incident.id} className="border-border/70 bg-white/75 shadow-sm backdrop-blur-sm">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                      <Bug className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold">{incident.name}</p>
                        <Badge variant={incident.category === "disease" ? "destructive" : "info"}>
                          {incident.category === "disease" ? "病害" : "害虫"}
                        </Badge>
                        <Badge variant={incident.resolvedOn ? "success" : "warning"}>
                          {incident.resolvedOn ? "解決済み" : "対応中"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {unit?.name} / 発生日 {formatDate(incident.occurredOn)}
                      </p>
                    </div>
                  </div>
                  {!incident.resolvedOn ? (
                    <Button variant="outline" onClick={() => resolveDiseaseIncident(incident.id)}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      解決済みにする
                    </Button>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                  <span>重症度 {incident.severityLevel}</span>
                  <span>被害率 {incident.affectedAreaRatio}%</span>
                  <span>解決日 {incident.resolvedOn ? formatDate(incident.resolvedOn) : "-"}</span>
                  <span>対処 {incident.actionTaken || "未入力"}</span>
                </div>
                {incident.note ? <p className="mt-4 text-sm text-muted-foreground">{incident.note}</p> : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>病害虫記録を追加</DialogTitle>
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
                    const cycle = scopedCycles.find((item) => item.id === value);
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

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>カテゴリ</Label>
                <Select
                  defaultValue={form.getValues("category")}
                  onValueChange={(value) => form.setValue("category", value as DiseaseForm["category"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disease">病害</SelectItem>
                    <SelectItem value="pest">害虫</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="occurredOn">発生日</Label>
                <Input id="occurredOn" type="date" {...form.register("occurredOn")} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="name">名称</Label>
                <Input id="name" placeholder="灰色かび病" {...form.register("name")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="severityLevel">重症度</Label>
                <Input id="severityLevel" type="number" min="1" max="5" {...form.register("severityLevel")} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="affectedAreaRatio">被害率 (%)</Label>
                <Input id="affectedAreaRatio" type="number" {...form.register("affectedAreaRatio")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="actionTaken">対処</Label>
                <Input id="actionTaken" {...form.register("actionTaken")} />
              </div>
            </div>

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
