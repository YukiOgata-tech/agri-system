"use client";

import { useState } from "react";
import { Plus, Bug, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

const diseaseSchema = z.object({
  greenhouseId: z.string().min(1, "ハウスを選択してください"),
  occurredOn: z.string().min(1, "日付を入力してください"),
  category: z.enum(["disease", "pest"]),
  name: z.string().min(1, "名称を入力してください"),
  severityLevel: z.coerce.number().int().min(1).max(5),
  affectedAreaRatio: z.coerce.number().min(0).max(100).optional(),
  actionTaken: z.string().optional(),
  note: z.string().optional(),
});
type DiseaseForm = z.infer<typeof diseaseSchema>;

const mockGreenhouses = [
  { id: "gh-a", name: "A棟" },
  { id: "gh-b", name: "B棟" },
  { id: "gh-c", name: "C棟" },
  { id: "gh-d", name: "D棟" },
];

const diseaseMaster = {
  disease: ["灰色かび病（ボトリチス）", "うどんこ病", "炭疽病", "萎黄病", "青枯病", "その他病害"],
  pest: ["ハダニ", "アブラムシ", "コナジラミ", "アザミウマ（スリップス）", "ナメクジ", "その他害虫"],
};

type Incident = {
  id: string;
  greenhouseName: string;
  occurredOn: string;
  category: "disease" | "pest";
  name: string;
  severityLevel: number;
  affectedAreaRatio: number;
  actionTaken: string;
  resolvedOn: string | null;
  note: string;
};

const mockIncidents: Incident[] = [
  { id: "1", greenhouseName: "B棟", occurredOn: "2026-04-20", category: "disease", name: "灰色かび病（ボトリチス）", severityLevel: 3, affectedAreaRatio: 15, actionTaken: "アミスター散布", resolvedOn: null, note: "花房部に集中" },
  { id: "2", greenhouseName: "A棟", occurredOn: "2026-04-18", category: "pest", name: "ハダニ", severityLevel: 2, affectedAreaRatio: 8, actionTaken: "ダニ太郎散布", resolvedOn: "2026-04-22", note: "" },
  { id: "3", greenhouseName: "C棟", occurredOn: "2026-04-15", category: "disease", name: "うどんこ病", severityLevel: 1, affectedAreaRatio: 5, actionTaken: "カリグリーン散布", resolvedOn: "2026-04-20", note: "早期発見" },
];

const severityLabels = ["", "軽微", "低", "中", "高", "重大"];
const severityColors = ["", "bg-sky-100 text-sky-800", "bg-green-100 text-green-800", "bg-amber-100 text-amber-800", "bg-orange-100 text-orange-800", "bg-red-100 text-red-800"];

export default function DiseasesPage() {
  const [incidents, setIncidents] = useState<Incident[]>(mockIncidents);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "resolved">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<"disease" | "pest">("disease");

  const form = useForm<DiseaseForm>({
    resolver: zodResolver(diseaseSchema) as Resolver<DiseaseForm>,
    defaultValues: {
      occurredOn: new Date().toISOString().split("T")[0],
      category: "disease",
      severityLevel: 2,
    },
  });

  const filtered = incidents.filter((i) => {
    if (filterStatus === "active") return !i.resolvedOn;
    if (filterStatus === "resolved") return !!i.resolvedOn;
    return true;
  });

  const activeCount = incidents.filter((i) => !i.resolvedOn).length;
  const resolvedCount = incidents.filter((i) => !!i.resolvedOn).length;

  const onSubmit = (data: DiseaseForm) => {
    const newIncident: Incident = {
      id: Date.now().toString(),
      greenhouseName: mockGreenhouses.find((g) => g.id === data.greenhouseId)?.name ?? "",
      occurredOn: data.occurredOn,
      category: data.category,
      name: data.name,
      severityLevel: data.severityLevel,
      affectedAreaRatio: data.affectedAreaRatio ?? 0,
      actionTaken: data.actionTaken ?? "",
      resolvedOn: null,
      note: data.note ?? "",
    };
    setIncidents((prev) => [newIncident, ...prev]);
    toast.success("病害虫記録を保存しました");
    setDialogOpen(false);
    form.reset({ occurredOn: new Date().toISOString().split("T")[0], category: "disease", severityLevel: 2 });
  };

  const resolve = (id: string) => {
    setIncidents((prev) =>
      prev.map((i) => (i.id === id ? { ...i, resolvedOn: new Date().toISOString().split("T")[0] } : i))
    );
    toast.success("解決済みにしました");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">病害虫記録</h1>
          <p className="text-sm text-muted-foreground mt-1">発生から対処・解決まで一元管理</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          記録追加
        </Button>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-red-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{activeCount}</p>
              <p className="text-xs text-muted-foreground">対応中</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{resolvedCount}</p>
              <p className="text-xs text-muted-foreground">解決済み</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
              <Bug className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{incidents.length}</p>
              <p className="text-xs text-muted-foreground">今月合計</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* フィルター */}
      <div className="flex gap-2">
        {(["all", "active", "resolved"] as const).map((s) => (
          <Button
            key={s}
            variant={filterStatus === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus(s)}
          >
            {s === "all" ? "すべて" : s === "active" ? "対応中" : "解決済み"}
          </Button>
        ))}
      </div>

      {/* 記録リスト */}
      <div className="flex flex-col gap-3">
        {filtered.map((incident) => (
          <Card key={incident.id} className={!incident.resolvedOn ? "border-amber-200" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${incident.category === "disease" ? "bg-red-50" : "bg-purple-50"}`}>
                    <Bug className={`h-5 w-5 ${incident.category === "disease" ? "text-red-600" : "text-purple-600"}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm">{incident.name}</span>
                      <Badge variant="secondary">{incident.greenhouseName}</Badge>
                      <Badge variant={incident.category === "disease" ? "destructive" : "info"}>
                        {incident.category === "disease" ? "病害" : "害虫"}
                      </Badge>
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${severityColors[incident.severityLevel]}`}>
                        重症度: {severityLabels[incident.severityLevel]}
                      </span>
                      {incident.resolvedOn ? (
                        <Badge variant="success">解決済み</Badge>
                      ) : (
                        <Badge variant="warning">対応中</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>発生日: {formatDate(incident.occurredOn)}</span>
                      {incident.affectedAreaRatio > 0 && <span>被害面積率: {incident.affectedAreaRatio}%</span>}
                      {incident.resolvedOn && <span>解決日: {formatDate(incident.resolvedOn)}</span>}
                    </div>
                    {incident.actionTaken && (
                      <p className="text-xs mt-1.5 text-foreground">
                        <span className="font-medium">対処:</span> {incident.actionTaken}
                      </p>
                    )}
                    {incident.note && <p className="text-xs text-muted-foreground mt-0.5">{incident.note}</p>}
                  </div>
                </div>
                {!incident.resolvedOn && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resolve(incident.id)}
                    className="shrink-0 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    解決済み
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 入力ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>病害虫記録の追加</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>ハウス *</Label>
                <Select onValueChange={(v) => form.setValue("greenhouseId", v)}>
                  <SelectTrigger><SelectValue placeholder="選択..." /></SelectTrigger>
                  <SelectContent>
                    {mockGreenhouses.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.greenhouseId && (
                  <p className="text-xs text-destructive">{form.formState.errors.greenhouseId.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="occurredOn">発生日 *</Label>
                <Input id="occurredOn" type="date" {...form.register("occurredOn")} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>カテゴリ *</Label>
              <div className="flex gap-2">
                {(["disease", "pest"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { form.setValue("category", c); setSelectedCategory(c); }}
                    className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                      selectedCategory === c ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                    }`}
                  >
                    {c === "disease" ? "病害" : "害虫"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>名称 *</Label>
              <Select onValueChange={(v) => form.setValue("name", v)}>
                <SelectTrigger><SelectValue placeholder="選択または入力..." /></SelectTrigger>
                <SelectContent>
                  {diseaseMaster[selectedCategory].map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
              <Input placeholder="または手動入力..." {...form.register("name")} className="mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>重症度 (1-5) *</Label>
                <Select defaultValue="2" onValueChange={(v) => form.setValue("severityLevel", parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}: {severityLabels[n]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="affectedAreaRatio">被害面積率 (%)</Label>
                <Input id="affectedAreaRatio" type="number" min="0" max="100" placeholder="0" {...form.register("affectedAreaRatio")} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="actionTaken">対処内容</Label>
              <Textarea id="actionTaken" placeholder="散布農薬、対処法など..." rows={2} {...form.register("actionTaken")} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="diseaseNote">備考</Label>
              <Textarea id="diseaseNote" placeholder="観察内容など..." rows={2} {...form.register("note")} />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
              <Button type="submit">保存する</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
