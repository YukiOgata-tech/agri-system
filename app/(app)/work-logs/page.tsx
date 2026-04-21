"use client";

import { useState } from "react";
import { Plus, Search, Droplets, Sprout, Shield, Scissors, PackageCheck, Eye } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";

const workTypes = [
  { value: "irrigation", label: "潅水", icon: Droplets, color: "text-blue-600 bg-blue-50" },
  { value: "fertilization", label: "施肥", icon: Sprout, color: "text-green-600 bg-green-50" },
  { value: "pesticide", label: "防除", icon: Shield, color: "text-amber-600 bg-amber-50" },
  { value: "pruning", label: "摘花・摘葉", icon: Scissors, color: "text-purple-600 bg-purple-50" },
  { value: "harvest", label: "収穫", icon: PackageCheck, color: "text-emerald-600 bg-emerald-50" },
  { value: "inspection", label: "見回り", icon: Eye, color: "text-slate-600 bg-slate-50" },
  { value: "other", label: "その他", icon: null, color: "text-gray-600 bg-gray-50" },
];

const baseSchema = z.object({
  greenhouseId: z.string().min(1, "ハウスを選択してください"),
  workDate: z.string().min(1, "日付を入力してください"),
  workType: z.string().min(1, "作業種別を選択してください"),
  durationMinutes: z.coerce.number().int().min(0).optional(),
  workerCount: z.coerce.number().int().min(1).default(1),
  note: z.string().optional(),
  // 潅水
  waterVolumeL: z.coerce.number().min(0).optional(),
  irrigationMethod: z.string().optional(),
  timingType: z.string().optional(),
  // 施肥
  fertilizerName: z.string().optional(),
  amountKg: z.coerce.number().min(0).optional(),
  amountL: z.coerce.number().min(0).optional(),
  nitrogenN: z.coerce.number().min(0).optional(),
  phosphorusP: z.coerce.number().min(0).optional(),
  potassiumK: z.coerce.number().min(0).optional(),
  applicationMethod: z.string().optional(),
  // 防除
  pesticideName: z.string().optional(),
  targetPest: z.string().optional(),
  pestAmount: z.coerce.number().min(0).optional(),
  pestUnit: z.string().optional(),
  dilutionRatio: z.string().optional(),
  preharvestDays: z.coerce.number().int().min(0).optional(),
});
type WorkForm = z.infer<typeof baseSchema>;

const mockGreenhouses = [
  { id: "gh-a", name: "A棟" },
  { id: "gh-b", name: "B棟" },
  { id: "gh-c", name: "C棟" },
  { id: "gh-d", name: "D棟" },
];

type WorkLog = {
  id: string;
  greenhouseName: string;
  workDate: string;
  workType: string;
  durationMinutes: number;
  workerCount: number;
  note: string;
  detail?: string;
};

const mockLogs: WorkLog[] = [
  { id: "1", greenhouseName: "A棟", workDate: "2026-04-22", workType: "irrigation", durationMinutes: 30, workerCount: 1, note: "", detail: "水量: 150L / タイミング: 朝" },
  { id: "2", greenhouseName: "B棟", workDate: "2026-04-22", workType: "fertilization", durationMinutes: 45, workerCount: 2, note: "液肥追加", detail: "液体肥料A / 20L" },
  { id: "3", greenhouseName: "C棟", workDate: "2026-04-21", workType: "pesticide", durationMinutes: 60, workerCount: 2, note: "", detail: "アミスター / 灰色かび病対策" },
  { id: "4", greenhouseName: "A棟", workDate: "2026-04-21", workType: "pruning", durationMinutes: 90, workerCount: 3, note: "下葉整理", detail: "" },
  { id: "5", greenhouseName: "D棟", workDate: "2026-04-20", workType: "inspection", durationMinutes: 20, workerCount: 1, note: "異常なし", detail: "" },
];

function WorkTypeIcon({ type }: { type: string }) {
  const wt = workTypes.find((w) => w.value === type);
  if (!wt || !wt.icon) return <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${wt?.color ?? "bg-gray-50"}`} />;
  const Icon = wt.icon;
  return (
    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${wt.color}`}>
      <Icon className="h-4 w-4" />
    </div>
  );
}

export default function WorkLogsPage() {
  const [logs, setLogs] = useState<WorkLog[]>(mockLogs);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("irrigation");

  const form = useForm<WorkForm>({
    resolver: zodResolver(baseSchema) as Resolver<WorkForm>,
    defaultValues: {
      workDate: new Date().toISOString().split("T")[0],
      workerCount: 1,
      workType: "irrigation",
    },
  });

  const filtered = logs.filter((l) => {
    const matchType = filterType === "all" || l.workType === filterType;
    const matchSearch = !search || l.greenhouseName.includes(search) || l.note.includes(search);
    return matchType && matchSearch;
  });

  const onSubmit = (data: WorkForm) => {
    const wt = workTypes.find((w) => w.value === data.workType);
    let detail = "";
    if (data.workType === "irrigation") detail = `水量: ${data.waterVolumeL ?? "-"}L / ${data.irrigationMethod ?? ""}`;
    if (data.workType === "fertilization") detail = `${data.fertilizerName ?? ""} / ${data.amountKg ? data.amountKg + "kg" : data.amountL ? data.amountL + "L" : ""}`;
    if (data.workType === "pesticide") detail = `${data.pesticideName ?? ""} / ${data.targetPest ?? ""}`;

    const newLog: WorkLog = {
      id: Date.now().toString(),
      greenhouseName: mockGreenhouses.find((g) => g.id === data.greenhouseId)?.name ?? "",
      workDate: data.workDate,
      workType: data.workType,
      durationMinutes: data.durationMinutes ?? 0,
      workerCount: data.workerCount,
      note: data.note ?? "",
      detail,
    };
    setLogs((prev) => [newLog, ...prev]);
    toast.success("作業記録を保存しました");
    setDialogOpen(false);
    form.reset({ workDate: new Date().toISOString().split("T")[0], workerCount: 1, workType: "irrigation" });
  };

  const workTypeCounts = workTypes.map((wt) => ({
    ...wt,
    count: logs.filter((l) => l.workType === wt.value).length,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">作業記録</h1>
          <p className="text-sm text-muted-foreground mt-1">潅水・施肥・防除・その他作業を記録</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          作業記録追加
        </Button>
      </div>

      {/* 作業タイプサマリー */}
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
        {workTypeCounts.map((wt) => {
          const Icon = wt.icon;
          return (
            <button
              key={wt.value}
              onClick={() => setFilterType(filterType === wt.value ? "all" : wt.value)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors ${
                filterType === wt.value ? "border-primary bg-primary/5" : "hover:bg-muted/40"
              }`}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${wt.color}`}>
                {Icon ? <Icon className="h-5 w-5" /> : <span className="text-xs">他</span>}
              </div>
              <p className="text-xs font-medium leading-tight">{wt.label}</p>
              <p className="text-lg font-bold leading-none">{wt.count}</p>
            </button>
          );
        })}
      </div>

      {/* フィルター */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="検索..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* リスト */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{filtered.length} 件の作業記録</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filtered.map((log) => {
              const wt = workTypes.find((w) => w.value === log.workType);
              return (
                <div key={log.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <WorkTypeIcon type={log.workType} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{log.greenhouseName}</span>
                      <Badge variant="secondary" className="text-xs">{wt?.label ?? log.workType}</Badge>
                      {log.detail && <span className="text-xs text-muted-foreground truncate max-w-48">{log.detail}</span>}
                    </div>
                    {log.note && <p className="text-xs text-muted-foreground mt-0.5">{log.note}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">{formatDate(log.workDate)}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.durationMinutes}分 · {log.workerCount}人
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 入力ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>作業記録の追加</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 pt-2">
            {/* 基本情報 */}
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
                <Label htmlFor="workDate">作業日 *</Label>
                <Input id="workDate" type="date" {...form.register("workDate")} />
              </div>
            </div>

            {/* 作業種別 */}
            <div className="flex flex-col gap-1.5">
              <Label>作業種別 *</Label>
              <div className="grid grid-cols-4 gap-2">
                {workTypes.map((wt) => {
                  const Icon = wt.icon;
                  return (
                    <button
                      key={wt.value}
                      type="button"
                      onClick={() => { form.setValue("workType", wt.value); setSelectedType(wt.value); }}
                      className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors ${
                        selectedType === wt.value ? "border-primary bg-primary/5 font-semibold" : "hover:bg-muted/40"
                      }`}
                    >
                      <div className={`flex h-7 w-7 items-center justify-center rounded-md ${wt.color}`}>
                        {Icon ? <Icon className="h-4 w-4" /> : <span>他</span>}
                      </div>
                      {wt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="durationMinutes">作業時間 (分)</Label>
                <Input id="durationMinutes" type="number" placeholder="30" {...form.register("durationMinutes")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="workerCount">作業人数</Label>
                <Input id="workerCount" type="number" min="1" placeholder="1" {...form.register("workerCount")} />
              </div>
            </div>

            {/* 種別別詳細 */}
            {selectedType === "irrigation" && (
              <div className="rounded-lg bg-blue-50 p-3 flex flex-col gap-3">
                <p className="text-xs font-semibold text-blue-700">潅水詳細</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="waterVolumeL">水量 (L)</Label>
                    <Input id="waterVolumeL" type="number" step="0.1" placeholder="0.0" {...form.register("waterVolumeL")} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>タイミング</Label>
                    <Select onValueChange={(v) => form.setValue("timingType", v)}>
                      <SelectTrigger><SelectValue placeholder="選択..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">朝</SelectItem>
                        <SelectItem value="afternoon">昼</SelectItem>
                        <SelectItem value="evening">夕方</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>方法</Label>
                    <Select onValueChange={(v) => form.setValue("irrigationMethod", v)}>
                      <SelectTrigger><SelectValue placeholder="選択..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="drip">点滴</SelectItem>
                        <SelectItem value="overhead">頭上散水</SelectItem>
                        <SelectItem value="flood">湛水</SelectItem>
                        <SelectItem value="manual">手潅水</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {selectedType === "fertilization" && (
              <div className="rounded-lg bg-green-50 p-3 flex flex-col gap-3">
                <p className="text-xs font-semibold text-green-700">施肥詳細</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="fertilizerName">肥料名</Label>
                    <Input id="fertilizerName" placeholder="液体肥料A" {...form.register("fertilizerName")} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="amountL">施肥量 (L)</Label>
                    <Input id="amountL" type="number" step="0.1" placeholder="0.0" {...form.register("amountL")} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="nitrogenN">N (窒素)</Label>
                    <Input id="nitrogenN" type="number" step="0.1" placeholder="0.0" {...form.register("nitrogenN")} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="phosphorusP">P (リン酸)</Label>
                    <Input id="phosphorusP" type="number" step="0.1" placeholder="0.0" {...form.register("phosphorusP")} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="potassiumK">K (カリ)</Label>
                    <Input id="potassiumK" type="number" step="0.1" placeholder="0.0" {...form.register("potassiumK")} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>施用方法</Label>
                    <Select onValueChange={(v) => form.setValue("applicationMethod", v)}>
                      <SelectTrigger><SelectValue placeholder="選択..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="drip">点滴潅水</SelectItem>
                        <SelectItem value="foliar">葉面散布</SelectItem>
                        <SelectItem value="soil">土壌施用</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {selectedType === "pesticide" && (
              <div className="rounded-lg bg-amber-50 p-3 flex flex-col gap-3">
                <p className="text-xs font-semibold text-amber-700">防除詳細</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="pesticideName">農薬名</Label>
                    <Input id="pesticideName" placeholder="アミスター" {...form.register("pesticideName")} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="targetPest">対象病害虫</Label>
                    <Input id="targetPest" placeholder="灰色かび病" {...form.register("targetPest")} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="pestAmount">使用量</Label>
                    <Input id="pestAmount" type="number" step="0.1" placeholder="0.0" {...form.register("pestAmount")} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>単位</Label>
                    <Select onValueChange={(v) => form.setValue("pestUnit", v)}>
                      <SelectTrigger><SelectValue placeholder="選択..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ml">mL</SelectItem>
                        <SelectItem value="l">L</SelectItem>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="dilutionRatio">希釈倍率</Label>
                    <Input id="dilutionRatio" placeholder="1000倍" {...form.register("dilutionRatio")} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="preharvestDays">収穫前日数</Label>
                    <Input id="preharvestDays" type="number" placeholder="3" {...form.register("preharvestDays")} />
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="note">備考</Label>
              <Textarea id="note" placeholder="作業メモ..." rows={2} {...form.register("note")} />
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
