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
import { VoiceInputPanel, type GuidedStep } from "@/components/voice/voice-input-panel";
import { useAgriApp } from "@/components/providers/agri-app-provider";
import { formatDate, getCurrentDateInputValue } from "@/lib/utils";
import {
  parseDiseaseVoice,
  diseaseParseSummary,
  matchProductionUnit,
  matchDiseaseCategory,
  matchDiseaseName,
  matchSeverityLevel,
  matchAffectedAreaRatio,
  type ParseField,
} from "@/lib/voice-parsers";

const diseaseSchema = z.object({
  productionUnitId: z.string().min(1, "生産エリアを選択してください"),
  cultivationCycleId: z.string().min(1, "作付を選択してください"),
  cropTypeId: z.string().min(1, "作物を選択してください"),
  occurredOn: z.string().min(1, "発生日を入力してください"),
  category: z.enum(["disease", "pest"]),
  name: z.string().min(1, "名称を入力してください"),
  severityLevel: z.coerce.number().min(1).max(5),
  affectedAreaRatio: z.coerce.number().min(0).max(100),
  actionTaken: z.string().optional(),
  note: z.string().optional(),
});

type DiseaseForm = z.infer<typeof diseaseSchema>;

function getDefaultDiseaseValues(): Partial<DiseaseForm> {
  return {
    occurredOn: getCurrentDateInputValue(),
    category: "disease",
    severityLevel: 2,
    affectedAreaRatio: 5,
  };
}

export default function DiseasesPage() {
  const {
    selectedCropId,
    productionUnits,
    cultivationCycles,
    diseaseIncidents,
    addDiseaseIncident,
    resolveDiseaseIncident,
    getCropLabel,
    matchesSelectedCrop,
    getUnitById,
  } = useAgriApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved">("all");
  const [voiceFields, setVoiceFields] = useState<ParseField[] | undefined>();
  const form = useForm<DiseaseForm>({
    resolver: zodResolver(diseaseSchema) as Resolver<DiseaseForm>,
    defaultValues: getDefaultDiseaseValues(),
  });

  const scopedCycles = cultivationCycles.filter((cycle) => matchesSelectedCrop(cycle.cropTypeId));
  const scopedIncidents = diseaseIncidents.filter((incident) => matchesSelectedCrop(incident.cropTypeId));
  const filteredIncidents = scopedIncidents.filter((incident) => {
    if (statusFilter === "open") return !incident.resolvedOn;
    if (statusFilter === "resolved") return Boolean(incident.resolvedOn);
    return true;
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
      key: "category",
      label: "カテゴリ",
      prompt: "病害か害虫か言ってください",
      example: "病害、灰色かび病 / 害虫、ハダニ",
      apply: (t) => {
        const cat = matchDiseaseCategory(t);
        if (cat) form.setValue("category", cat);
        return cat === "disease" ? "病害" : cat === "pest" ? "害虫" : undefined;
      },
    },
    {
      key: "name",
      label: "名称",
      prompt: "病害・害虫の名称を言ってください",
      example: "灰色かび病、うどんこ病、ハダニ",
      apply: (t) => {
        const name = matchDiseaseName(t);
        if (name) form.setValue("name", name);
        return name;
      },
    },
    {
      key: "severityLevel",
      label: "重症度",
      prompt: "重症度を1から5で言ってください",
      example: "重症度3、レベル2",
      optional: true,
      apply: (t) => {
        const level = matchSeverityLevel(t);
        if (level !== undefined) form.setValue("severityLevel", level);
        return level !== undefined ? `レベル${level}` : undefined;
      },
    },
    {
      key: "affectedAreaRatio",
      label: "被害率",
      prompt: "被害率をパーセントで言ってください",
      example: "10パーセント、被害率5%",
      optional: true,
      apply: (t) => {
        const ratio = matchAffectedAreaRatio(t);
        if (ratio !== undefined) form.setValue("affectedAreaRatio", ratio);
        return ratio !== undefined ? `${ratio}%` : undefined;
      },
    },
  ];

  const handleVoiceTranscript = (transcript: string) => {
    const parsed = parseDiseaseVoice(transcript);
    setVoiceFields(diseaseParseSummary(parsed, productionUnits));

    if (parsed.unitLetter) {
      const unit = productionUnits.find((u) =>
        u.name.toUpperCase().includes(parsed.unitLetter!) ||
        u.code.toUpperCase().endsWith(parsed.unitLetter!) ||
        u.code.toUpperCase().endsWith(`-${parsed.unitLetter!}`)
      );
      if (unit) form.setValue("productionUnitId", unit.id);
    }
    if (parsed.category) form.setValue("category", parsed.category);
    if (parsed.name) form.setValue("name", parsed.name);
    if (parsed.severityLevel !== undefined) form.setValue("severityLevel", parsed.severityLevel);
    if (parsed.affectedAreaRatio !== undefined) form.setValue("affectedAreaRatio", parsed.affectedAreaRatio);
    if (parsed.actionTaken) form.setValue("actionTaken", parsed.actionTaken);
    if (parsed.note) form.setValue("note", parsed.note);
  };

  const handleResolveIncident = async (incidentId: string) => {
    try {
      await resolveDiseaseIncident(incidentId);
      toast.success("病気・害虫記録を解決済みに更新しました");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "病気・害虫記録の更新に失敗しました"
      );
    }
  };

  const onSubmit = async (values: DiseaseForm) => {
    try {
      await addDiseaseIncident(values);
      toast.success("病気・害虫記録を保存しました");
      setDialogOpen(false);
      setVoiceFields(undefined);
      form.reset({
        ...getDefaultDiseaseValues(),
        category: values.category,
        severityLevel: 2,
        affectedAreaRatio: 5,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "病気・害虫記録の保存に失敗しました"
      );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        eyebrow="Incidents"
        title="病気・害虫記録"
        description="作物スコープに応じて病気・害虫の発生、対処、解決状態を追跡します。AI分析や環境ログと結びつける前提の履歴です。"
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
            <Button
              onClick={() => {
                form.reset(getDefaultDiseaseValues());
                setVoiceFields(undefined);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              発生を追加
            </Button>
          </>
        }
      />

      <div className="-mx-4 sm:mx-0 grid gap-3 sm:gap-4 md:grid-cols-3">
        <StatCard label="Open Incidents" value={`${scopedIncidents.filter((item) => !item.resolvedOn).length} 件`} detail="対応中の病気・害虫" icon={AlertTriangle} tone="danger" className="rounded-none sm:rounded-xl" />
        <StatCard label="Resolved" value={`${scopedIncidents.filter((item) => item.resolvedOn).length} 件`} detail="収束済み" icon={CheckCircle2} tone="leaf" className="rounded-none sm:rounded-xl" />
        <StatCard label="Scope Total" value={`${scopedIncidents.length} 件`} detail="選択作物に紐づく全履歴" icon={Bug} tone="earth" className="rounded-none sm:rounded-xl" />
      </div>

      <div className="-mx-4 sm:mx-0 grid gap-3 sm:gap-4">
        {filteredIncidents.map((incident) => {
          const unit = getUnitById(incident.productionUnitId);
          return (
            <Card key={incident.id} className="rounded-none sm:rounded-xl border-border/70 bg-white/75 shadow-sm backdrop-blur-sm">
              <CardContent className="p-3 sm:p-5">
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
                    <Button
                      variant="outline"
                      onClick={() => void handleResolveIncident(incident.id)}
                    >
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

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setVoiceFields(undefined); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>病気・害虫記録を追加</DialogTitle>
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

            <div className="grid gap-2 sm:gap-3 sm:grid-cols-2">
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

            <div className="grid gap-2 sm:gap-3 grid-cols-3">
              <div className="grid gap-1.5 col-span-2">
                <Label htmlFor="name">名称</Label>
                <Input id="name" placeholder="灰色かび病" {...form.register("name")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="severityLevel">重症度</Label>
                <Input id="severityLevel" type="number" min="1" max="5" {...form.register("severityLevel")} />
              </div>
            </div>

            <div className="grid gap-2 sm:gap-3 sm:grid-cols-2">
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
              <Textarea id="note" rows={2} {...form.register("note")} />
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
