"use client";

import { useState } from "react";
import { Plus, Search, Download, Wheat, TrendingUp, Weight } from "lucide-react";
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

const harvestSchema = z.object({
  greenhouseId: z.string().min(1, "ハウスを選択してください"),
  harvestDate: z.string().min(1, "日付を入力してください"),
  quantityKg: z.coerce.number().min(0).optional(),
  quantityCount: z.coerce.number().int().min(0).optional(),
  gradeAKg: z.coerce.number().min(0).optional(),
  gradeBKg: z.coerce.number().min(0).optional(),
  gradeCKg: z.coerce.number().min(0).optional(),
  wasteKg: z.coerce.number().min(0).optional(),
  averageUnitWeightG: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});
type HarvestForm = z.infer<typeof harvestSchema>;

// モックデータ
const mockGreenhouses = [
  { id: "gh-a", name: "A棟" },
  { id: "gh-b", name: "B棟" },
  { id: "gh-c", name: "C棟" },
  { id: "gh-d", name: "D棟" },
];

type HarvestRecord = {
  id: string;
  greenhouseId: string;
  greenhouseName: string;
  harvestDate: string;
  quantityKg: number;
  quantityCount: number;
  gradeAKg: number;
  gradeBKg: number;
  gradeCKg: number;
  wasteKg: number;
  averageUnitWeightG: number;
  notes: string;
};

const mockRecords: HarvestRecord[] = [
  { id: "1", greenhouseId: "gh-a", greenhouseName: "A棟", harvestDate: "2026-04-22", quantityKg: 12.4, quantityCount: 210, gradeAKg: 8.2, gradeBKg: 3.4, gradeCKg: 0.5, wasteKg: 0.3, averageUnitWeightG: 59.0, notes: "" },
  { id: "2", greenhouseId: "gh-b", greenhouseName: "B棟", harvestDate: "2026-04-22", quantityKg: 14.4, quantityCount: 185, gradeAKg: 10.1, gradeBKg: 3.8, gradeCKg: 0.3, wasteKg: 0.2, averageUnitWeightG: 77.8, notes: "品質良好" },
  { id: "3", greenhouseId: "gh-c", greenhouseName: "C棟", harvestDate: "2026-04-21", quantityKg: 9.8, quantityCount: 168, gradeAKg: 6.2, gradeBKg: 2.9, gradeCKg: 0.5, wasteKg: 0.2, averageUnitWeightG: 58.3, notes: "" },
  { id: "4", greenhouseId: "gh-a", greenhouseName: "A棟", harvestDate: "2026-04-21", quantityKg: 11.2, quantityCount: 195, gradeAKg: 7.5, gradeBKg: 3.1, gradeCKg: 0.4, wasteKg: 0.2, averageUnitWeightG: 57.4, notes: "" },
  { id: "5", greenhouseId: "gh-d", greenhouseName: "D棟", harvestDate: "2026-04-20", quantityKg: 15.8, quantityCount: 220, gradeAKg: 11.0, gradeBKg: 3.9, gradeCKg: 0.6, wasteKg: 0.3, averageUnitWeightG: 71.8, notes: "今シーズン最高" },
];

export default function HarvestPage() {
  const [records, setRecords] = useState<HarvestRecord[]>(mockRecords);
  const [search, setSearch] = useState("");
  const [filterGh, setFilterGh] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<HarvestForm>({
    resolver: zodResolver(harvestSchema) as Resolver<HarvestForm>,
    defaultValues: {
      harvestDate: new Date().toISOString().split("T")[0],
    },
  });

  const filtered = records.filter((r) => {
    const matchGh = filterGh === "all" || r.greenhouseId === filterGh;
    const matchSearch = !search || r.greenhouseName.includes(search) || r.notes.includes(search);
    return matchGh && matchSearch;
  });

  const totalKg = filtered.reduce((s, r) => s + r.quantityKg, 0);
  const avgWeight = filtered.length ? filtered.reduce((s, r) => s + r.averageUnitWeightG, 0) / filtered.length : 0;
  const gradeARate = totalKg > 0 ? (filtered.reduce((s, r) => s + r.gradeAKg, 0) / totalKg) * 100 : 0;

  const onSubmit = (data: HarvestForm) => {
    const gh = mockGreenhouses.find((g) => g.id === data.greenhouseId);
    const newRecord: HarvestRecord = {
      id: Date.now().toString(),
      greenhouseId: data.greenhouseId,
      greenhouseName: gh?.name ?? "",
      harvestDate: data.harvestDate,
      quantityKg: data.quantityKg ?? 0,
      quantityCount: data.quantityCount ?? 0,
      gradeAKg: data.gradeAKg ?? 0,
      gradeBKg: data.gradeBKg ?? 0,
      gradeCKg: data.gradeCKg ?? 0,
      wasteKg: data.wasteKg ?? 0,
      averageUnitWeightG: data.averageUnitWeightG ?? 0,
      notes: data.notes ?? "",
    };
    setRecords((prev) => [newRecord, ...prev]);
    toast.success("収穫記録を保存しました");
    setDialogOpen(false);
    form.reset({ harvestDate: new Date().toISOString().split("T")[0] });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">収穫記録</h1>
          <p className="text-sm text-muted-foreground mt-1">ハウスごとの収穫量・品質を記録</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1.5" />
            CSV出力
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            記録追加
          </Button>
        </div>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <Wheat className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{totalKg.toFixed(1)} kg</p>
              <p className="text-xs text-muted-foreground">合計収穫量</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{gradeARate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">A等級率</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Weight className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{avgWeight.toFixed(1)} g</p>
              <p className="text-xs text-muted-foreground">平均粒重</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* フィルター */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="検索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterGh} onValueChange={setFilterGh}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="ハウス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのハウス</SelectItem>
                {mockGreenhouses.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* テーブル */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{filtered.length} 件の記録</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">日付</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">ハウス</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">合計(kg)</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">個数</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">A等級(kg)</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">B等級(kg)</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">廃棄(kg)</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">平均粒重(g)</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">備考</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{formatDate(r.harvestDate)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{r.greenhouseName}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{r.quantityKg.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right">{r.quantityCount}</td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-medium">{r.gradeAKg.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right">{r.gradeBKg.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{r.wasteKg.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right">{r.averageUnitWeightG.toFixed(1)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 入力ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>収穫記録の追加</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>ハウス *</Label>
                <Select onValueChange={(v) => form.setValue("greenhouseId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="選択..." />
                  </SelectTrigger>
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
                <Label htmlFor="harvestDate">収穫日 *</Label>
                <Input id="harvestDate" type="date" {...form.register("harvestDate")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="quantityKg">合計収穫量 (kg)</Label>
                <Input id="quantityKg" type="number" step="0.1" placeholder="0.0" {...form.register("quantityKg")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="quantityCount">個数</Label>
                <Input id="quantityCount" type="number" placeholder="0" {...form.register("quantityCount")} />
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-3">等級別内訳</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="gradeAKg" className="text-emerald-700">A等級 (kg)</Label>
                  <Input id="gradeAKg" type="number" step="0.1" placeholder="0.0" {...form.register("gradeAKg")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="gradeBKg">B等級 (kg)</Label>
                  <Input id="gradeBKg" type="number" step="0.1" placeholder="0.0" {...form.register("gradeBKg")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="gradeCKg">C等級 (kg)</Label>
                  <Input id="gradeCKg" type="number" step="0.1" placeholder="0.0" {...form.register("gradeCKg")} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wasteKg">廃棄量 (kg)</Label>
                <Input id="wasteKg" type="number" step="0.1" placeholder="0.0" {...form.register("wasteKg")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="averageUnitWeightG">平均粒重 (g)</Label>
                <Input id="averageUnitWeightG" type="number" step="0.1" placeholder="0.0" {...form.register("averageUnitWeightG")} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">備考</Label>
              <Textarea id="notes" placeholder="特記事項など..." rows={2} {...form.register("notes")} />
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
