"use client";

import { useState } from "react";
import { Plus, Thermometer, Droplets, Wind, Sun, Activity } from "lucide-react";
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const envSchema = z.object({
  greenhouseId: z.string().min(1, "ハウスを選択してください"),
  observedAt: z.string().min(1, "日時を入力してください"),
  temperatureC: z.coerce.number().optional(),
  humidityPct: z.coerce.number().min(0).max(100).optional(),
  co2Ppm: z.coerce.number().min(0).optional(),
  soilTemperatureC: z.coerce.number().optional(),
  soilMoisturePct: z.coerce.number().min(0).max(100).optional(),
  lightLux: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});
type EnvForm = z.infer<typeof envSchema>;

const mockGreenhouses = [
  { id: "gh-a", name: "A棟" },
  { id: "gh-b", name: "B棟" },
  { id: "gh-c", name: "C棟" },
  { id: "gh-d", name: "D棟" },
];

type EnvLog = {
  id: string;
  greenhouseName: string;
  observedAt: string;
  temperatureC: number;
  humidityPct: number;
  co2Ppm: number;
  soilTemperatureC: number;
  soilMoisturePct: number;
  lightLux: number;
  notes: string;
};

const mockLogs: EnvLog[] = [
  { id: "1", greenhouseName: "A棟", observedAt: "2026-04-22T10:00", temperatureC: 22.4, humidityPct: 73, co2Ppm: 420, soilTemperatureC: 18.2, soilMoisturePct: 65, lightLux: 28000, notes: "" },
  { id: "2", greenhouseName: "B棟", observedAt: "2026-04-22T10:00", temperatureC: 24.1, humidityPct: 87, co2Ppm: 410, soilTemperatureC: 19.5, soilMoisturePct: 72, lightLux: 25000, notes: "湿度注意" },
  { id: "3", greenhouseName: "C棟", observedAt: "2026-04-22T10:00", temperatureC: 21.8, humidityPct: 71, co2Ppm: 415, soilTemperatureC: 17.8, soilMoisturePct: 63, lightLux: 30000, notes: "" },
  { id: "4", greenhouseName: "A棟", observedAt: "2026-04-22T07:00", temperatureC: 19.2, humidityPct: 80, co2Ppm: 430, soilTemperatureC: 17.5, soilMoisturePct: 68, lightLux: 5000, notes: "" },
  { id: "5", greenhouseName: "A棟", observedAt: "2026-04-21T10:00", temperatureC: 23.1, humidityPct: 74, co2Ppm: 418, soilTemperatureC: 18.0, soilMoisturePct: 64, lightLux: 27000, notes: "" },
];

const chartData = [
  { time: "07:00", tempA: 19.2, humA: 80, tempB: 21.5, humB: 84 },
  { time: "09:00", tempA: 21.0, humA: 76, tempB: 23.0, humB: 86 },
  { time: "10:00", tempA: 22.4, humA: 73, tempB: 24.1, humB: 87 },
  { time: "12:00", tempA: 25.3, humA: 68, tempB: 27.2, humB: 82 },
  { time: "14:00", tempA: 26.8, humA: 65, tempB: 28.5, humB: 79 },
  { time: "16:00", tempA: 24.2, humA: 70, tempB: 25.8, humB: 81 },
];

function getStatusBadge(temp: number, humidity: number) {
  if (humidity > 85 || temp > 28) return <Badge variant="warning">要注意</Badge>;
  if (humidity < 60 || temp < 15) return <Badge variant="info">低め</Badge>;
  return <Badge variant="success">適正</Badge>;
}

export default function EnvironmentPage() {
  const [logs, setLogs] = useState<EnvLog[]>(mockLogs);
  const [filterGh, setFilterGh] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<EnvForm>({
    resolver: zodResolver(envSchema) as Resolver<EnvForm>,
    defaultValues: {
      observedAt: new Date().toISOString().slice(0, 16),
    },
  });

  const filtered = logs.filter((l) => filterGh === "all" || l.greenhouseName === mockGreenhouses.find((g) => g.id === filterGh)?.name);

  const onSubmit = (data: EnvForm) => {
    const newLog: EnvLog = {
      id: Date.now().toString(),
      greenhouseName: mockGreenhouses.find((g) => g.id === data.greenhouseId)?.name ?? "",
      observedAt: data.observedAt,
      temperatureC: data.temperatureC ?? 0,
      humidityPct: data.humidityPct ?? 0,
      co2Ppm: data.co2Ppm ?? 0,
      soilTemperatureC: data.soilTemperatureC ?? 0,
      soilMoisturePct: data.soilMoisturePct ?? 0,
      lightLux: data.lightLux ?? 0,
      notes: data.notes ?? "",
    };
    setLogs((prev) => [newLog, ...prev]);
    toast.success("環境記録を保存しました");
    setDialogOpen(false);
    form.reset({ observedAt: new Date().toISOString().slice(0, 16) });
  };

  const latest = mockLogs.filter((l) => l.observedAt.includes("10:00") && l.observedAt.includes("04-22"));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">環境記録</h1>
          <p className="text-sm text-muted-foreground mt-1">ハウス内温湿度・CO2・土壌環境を記録</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          環境記録追加
        </Button>
      </div>

      {/* 現在の環境カード */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {latest.map((log) => (
          <Card key={log.id} className={log.humidityPct > 85 ? "border-amber-300" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{log.greenhouseName}</CardTitle>
                {getStatusBadge(log.temperatureC, log.humidityPct)}
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-1.5">
                <Thermometer className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-semibold">{log.temperatureC}℃</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Droplets className="h-3.5 w-3.5 text-blue-500" />
                <span className={`font-semibold ${log.humidityPct > 85 ? "text-amber-600" : ""}`}>{log.humidityPct}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Wind className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-muted-foreground text-xs">{log.co2Ppm} ppm</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sun className="h-3.5 w-3.5 text-yellow-500" />
                <span className="text-muted-foreground text-xs">{(log.lightLux / 1000).toFixed(0)}klux</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* グラフ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">温湿度推移（本日）</CardTitle>
          <CardDescription>A棟・B棟比較</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #d1e8d0", fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="tempA" stroke="#2d6a4f" strokeWidth={2} dot={false} name="A棟温度(℃)" />
              <Line type="monotone" dataKey="tempB" stroke="#52b788" strokeWidth={2} dot={false} name="B棟温度(℃)" strokeDasharray="5 5" />
              <Line type="monotone" dataKey="humA" stroke="#3b82f6" strokeWidth={2} dot={false} name="A棟湿度(%)" />
              <Line type="monotone" dataKey="humB" stroke="#93c5fd" strokeWidth={2} dot={false} name="B棟湿度(%)" strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* フィルター + テーブル */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">記録一覧</CardTitle>
            <Select value={filterGh} onValueChange={setFilterGh}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="ハウス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {mockGreenhouses.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">日時</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">ハウス</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">気温(℃)</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">湿度(%)</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">CO2(ppm)</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">地温(℃)</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">土壌水分(%)</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">備考</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">{log.observedAt.replace("T", " ")}</td>
                    <td className="px-4 py-3"><Badge variant="secondary">{log.greenhouseName}</Badge></td>
                    <td className={`px-4 py-3 text-right font-semibold ${log.temperatureC > 28 ? "text-red-600" : log.temperatureC < 15 ? "text-blue-600" : ""}`}>
                      {log.temperatureC}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${log.humidityPct > 85 ? "text-amber-600" : ""}`}>
                      {log.humidityPct}
                    </td>
                    <td className="px-4 py-3 text-right">{log.co2Ppm}</td>
                    <td className="px-4 py-3 text-right">{log.soilTemperatureC}</td>
                    <td className="px-4 py-3 text-right">{log.soilMoisturePct}</td>
                    <td className="px-4 py-3 text-muted-foreground">{log.notes || "-"}</td>
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
            <DialogTitle>環境記録の追加</DialogTitle>
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
                <Label htmlFor="observedAt">観測日時 *</Label>
                <Input id="observedAt" type="datetime-local" {...form.register("observedAt")} />
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                <Thermometer className="h-3.5 w-3.5" />気温・湿度
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="temperatureC">気温 (℃)</Label>
                  <Input id="temperatureC" type="number" step="0.1" placeholder="22.0" {...form.register("temperatureC")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="humidityPct">湿度 (%)</Label>
                  <Input id="humidityPct" type="number" step="1" min="0" max="100" placeholder="70" {...form.register("humidityPct")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="co2Ppm">CO2 (ppm)</Label>
                  <Input id="co2Ppm" type="number" placeholder="400" {...form.register("co2Ppm")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lightLux">光量 (lux)</Label>
                  <Input id="lightLux" type="number" placeholder="25000" {...form.register("lightLux")} />
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" />土壌環境
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="soilTemperatureC">地温 (℃)</Label>
                  <Input id="soilTemperatureC" type="number" step="0.1" placeholder="18.0" {...form.register("soilTemperatureC")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="soilMoisturePct">土壌水分 (%)</Label>
                  <Input id="soilMoisturePct" type="number" step="1" min="0" max="100" placeholder="60" {...form.register("soilMoisturePct")} />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="envNotes">備考</Label>
              <Textarea id="envNotes" placeholder="特記事項..." rows={2} {...form.register("notes")} />
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
