"use client";

import { useState } from "react";
import { Plus, Home, MoreVertical, Edit2, Power } from "lucide-react";
import { toast } from "sonner";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const ghSchema = z.object({
  name: z.string().min(1, "名称を入力してください"),
  code: z.string().optional(),
  greenhouseType: z.string().optional(),
  areaM2: z.coerce.number().min(0).optional(),
  lengthM: z.coerce.number().min(0).optional(),
  widthM: z.coerce.number().min(0).optional(),
  coveringMaterial: z.string().optional(),
  irrigationSystemType: z.string().optional(),
  notes: z.string().optional(),
});
type GhForm = z.infer<typeof ghSchema>;

type Greenhouse = {
  id: string;
  name: string;
  code: string;
  greenhouseType: string;
  areaM2: number;
  coveringMaterial: string;
  irrigationSystemType: string;
  isActive: boolean;
  notes: string;
  cropName?: string;
};

const mockGreenhouses: Greenhouse[] = [
  { id: "gh-a", name: "A棟", code: "A", greenhouseType: "鉄骨ハウス", areaM2: 1200, coveringMaterial: "フッ素フィルム", irrigationSystemType: "点滴潅水", isActive: true, notes: "主力ハウス", cropName: "さちのか" },
  { id: "gh-b", name: "B棟", code: "B", greenhouseType: "鉄骨ハウス", areaM2: 1000, coveringMaterial: "フッ素フィルム", irrigationSystemType: "点滴潅水", isActive: true, notes: "", cropName: "紅ほっぺ" },
  { id: "gh-c", name: "C棟", code: "C", greenhouseType: "パイプハウス", areaM2: 800, coveringMaterial: "塩ビフィルム", irrigationSystemType: "頭上散水", isActive: true, notes: "", cropName: "章姫" },
  { id: "gh-d", name: "D棟", code: "D", greenhouseType: "パイプハウス", areaM2: 600, coveringMaterial: "塩ビフィルム", irrigationSystemType: "手潅水", isActive: false, notes: "改修予定", cropName: undefined },
];

export default function GreenhousesPage() {
  const [greenhouses, setGreenhouses] = useState<Greenhouse[]>(mockGreenhouses);
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<GhForm>({ resolver: zodResolver(ghSchema) as Resolver<GhForm> });

  const onSubmit = (data: GhForm) => {
    const newGh: Greenhouse = {
      id: Date.now().toString(),
      name: data.name,
      code: data.code ?? "",
      greenhouseType: data.greenhouseType ?? "",
      areaM2: data.areaM2 ?? 0,
      coveringMaterial: data.coveringMaterial ?? "",
      irrigationSystemType: data.irrigationSystemType ?? "",
      isActive: true,
      notes: data.notes ?? "",
    };
    setGreenhouses((prev) => [...prev, newGh]);
    toast.success("ハウスを登録しました");
    setDialogOpen(false);
    form.reset();
  };

  const toggleActive = (id: string) => {
    setGreenhouses((prev) => prev.map((g) => (g.id === id ? { ...g, isActive: !g.isActive } : g)));
    toast.success("ステータスを更新しました");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ハウス管理</h1>
          <p className="text-sm text-muted-foreground mt-1">栽培ハウスの情報を管理</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          ハウス追加
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {greenhouses.map((gh) => (
          <Card key={gh.id} className={!gh.isActive ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${gh.isActive ? "bg-primary/10" : "bg-muted"}`}>
                    <Home className={`h-5 w-5 ${gh.isActive ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <CardTitle className="text-base">{gh.name}</CardTitle>
                    {gh.code && <CardDescription className="text-xs">コード: {gh.code}</CardDescription>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={gh.isActive ? "success" : "secondary"}>{gh.isActive ? "稼働中" : "停止"}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded-md p-1 text-muted-foreground hover:bg-muted transition-colors">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit2 className="h-4 w-4 mr-2" />
                        編集
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleActive(gh.id)}>
                        <Power className="h-4 w-4 mr-2" />
                        {gh.isActive ? "停止" : "再稼働"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2 text-sm">
                {gh.cropName && (
                  <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
                    <span className="text-xs text-muted-foreground">栽培品種:</span>
                    <span className="font-medium text-primary">{gh.cropName}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">タイプ</span>
                    <span>{gh.greenhouseType || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">面積</span>
                    <span>{gh.areaM2 > 0 ? `${gh.areaM2} m²` : "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">被覆資材</span>
                    <span>{gh.coveringMaterial || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">潅水方法</span>
                    <span>{gh.irrigationSystemType || "-"}</span>
                  </div>
                </div>
                {gh.notes && <p className="text-xs text-muted-foreground border-t border-border pt-2 mt-1">{gh.notes}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 追加ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ハウスの追加</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ghName">ハウス名 *</Label>
                <Input id="ghName" placeholder="A棟" {...form.register("name")} />
                {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="code">コード</Label>
                <Input id="code" placeholder="A" {...form.register("code")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>ハウスタイプ</Label>
                <Select onValueChange={(v) => form.setValue("greenhouseType", v)}>
                  <SelectTrigger><SelectValue placeholder="選択..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="鉄骨ハウス">鉄骨ハウス</SelectItem>
                    <SelectItem value="パイプハウス">パイプハウス</SelectItem>
                    <SelectItem value="ガラス温室">ガラス温室</SelectItem>
                    <SelectItem value="露地">露地</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="areaM2">面積 (m²)</Label>
                <Input id="areaM2" type="number" placeholder="1000" {...form.register("areaM2")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>被覆資材</Label>
                <Select onValueChange={(v) => form.setValue("coveringMaterial", v)}>
                  <SelectTrigger><SelectValue placeholder="選択..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="フッ素フィルム">フッ素フィルム</SelectItem>
                    <SelectItem value="塩ビフィルム">塩ビフィルム</SelectItem>
                    <SelectItem value="PE フィルム">PE フィルム</SelectItem>
                    <SelectItem value="ガラス">ガラス</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>潅水システム</Label>
                <Select onValueChange={(v) => form.setValue("irrigationSystemType", v)}>
                  <SelectTrigger><SelectValue placeholder="選択..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="点滴潅水">点滴潅水</SelectItem>
                    <SelectItem value="頭上散水">頭上散水</SelectItem>
                    <SelectItem value="手潅水">手潅水</SelectItem>
                    <SelectItem value="その他">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ghNotes">備考</Label>
              <Textarea id="ghNotes" placeholder="特記事項..." rows={2} {...form.register("notes")} />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
              <Button type="submit">登録する</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
