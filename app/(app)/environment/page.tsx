"use client";

import { useState } from "react";
import { Plus, Thermometer, Waves, Wind } from "lucide-react";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
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
import { formatDateTime } from "@/lib/utils";
import { getCropLabel } from "@/lib/agri-mock-data";

const envSchema = z.object({
  productionUnitId: z.string().min(1, "生産単位を選択してください"),
  cultivationCycleId: z.string().min(1, "作付を選択してください"),
  cropTypeId: z.enum(["strawberry", "tomato", "komatsuna"]),
  observedAt: z.string().min(1, "観測日時を入力してください"),
  temperatureC: z.coerce.number(),
  humidityPct: z.coerce.number().min(0).max(100),
  co2Ppm: z.coerce.number().min(0),
  soilTemperatureC: z.coerce.number(),
  soilMoisturePct: z.coerce.number().min(0).max(100),
  ecDsM: z.coerce.number().min(0),
  ph: z.coerce.number().min(0),
  lightLux: z.coerce.number().min(0),
  notes: z.string().optional(),
});

type EnvForm = z.infer<typeof envSchema>;

export default function EnvironmentPage() {
  const {
    selectedCropId,
    productionUnits,
    cultivationCycles,
    environmentLogs,
    addEnvironmentLog,
    matchesSelectedCrop,
    getUnitById,
  } = useAgriApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const form = useForm<EnvForm>({
    resolver: zodResolver(envSchema) as Resolver<EnvForm>,
    defaultValues: { observedAt: "2026-04-24T10:00" },
  });

  const scopedCycles = cultivationCycles.filter((cycle) => matchesSelectedCrop(cycle.cropTypeId));
  const scopedLogs = environmentLogs
    .filter((log) => matchesSelectedCrop(log.cropTypeId))
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  const latestLogs = scopedLogs.slice(0, 4);

  const chartData = [...scopedLogs]
    .filter((log) => getUnitById(log.productionUnitId)?.unitType === "greenhouse")
    .slice(0, 6)
    .reverse()
    .map((log) => ({
      observedAt: log.observedAt.slice(11, 16),
      temperatureC: log.temperatureC,
      humidityPct: log.humidityPct,
      ecDsM: log.ecDsM,
    }));

  const averageHumidity =
    scopedLogs.reduce((sum, log) => sum + log.humidityPct, 0) / Math.max(scopedLogs.length, 1);
  const averageEC = scopedLogs.reduce((sum, log) => sum + log.ecDsM, 0) / Math.max(scopedLogs.length, 1);

  const onSubmit = (values: EnvForm) => {
    addEnvironmentLog(values);
    toast.success("環境記録を保存しました");
    setDialogOpen(false);
    form.reset({ observedAt: "2026-04-24T10:00" });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        eyebrow="Environment"
        title="環境記録"
        description="作物スコープに応じて温湿度、土壌、EC、pH を表示します。作物別の適正域は今後この画面から拡張できます。"
        scopeLabel={getCropLabel(selectedCropId)}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            観測を追加
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Average Humidity" value={`${averageHumidity.toFixed(1)}%`} detail="作物スコープ内の平均" icon={Waves} tone="sky" />
        <StatCard label="Average EC" value={`${averageEC.toFixed(2)} dS/m`} detail="肥培管理の基準" icon={Wind} tone="earth" />
        <StatCard label="Observations" value={`${scopedLogs.length} 件`} detail="環境ログ総数" icon={Thermometer} tone="leaf" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card className="border-border/70 bg-white/75 shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">直近の環境推移</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#d8ceb8" strokeDasharray="4 4" />
                <XAxis dataKey="observedAt" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "18px",
                    border: "1px solid #d8ceb8",
                    background: "#fffaf2",
                  }}
                />
                <Line dataKey="temperatureC" type="monotone" stroke="#d58a3f" strokeWidth={2.5} />
                <Line dataKey="humidityPct" type="monotone" stroke="#3b82f6" strokeWidth={2.5} />
                <Line dataKey="ecDsM" type="monotone" stroke="#2f5d50" strokeWidth={2.5} strokeDasharray="6 6" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-white/75 shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">最新観測</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestLogs.map((log) => {
              const unit = getUnitById(log.productionUnitId);
              return (
                <div key={log.id} className="rounded-2xl border border-border/70 bg-background/85 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{unit?.name}</p>
                    <Badge variant={log.humidityPct > 80 ? "warning" : "success"}>
                      {log.humidityPct > 80 ? "要観察" : "安定"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(log.observedAt)}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <span>気温 {log.temperatureC.toFixed(1)}℃</span>
                    <span>湿度 {log.humidityPct}%</span>
                    <span>土壌水分 {log.soilMoisturePct}%</span>
                    <span>EC {log.ecDsM.toFixed(1)}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-white/75 shadow-sm backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">環境ログ一覧</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-border/70 text-left text-muted-foreground">
                <th className="px-3 py-3">日時</th>
                <th className="px-3 py-3">生産単位</th>
                <th className="px-3 py-3 text-right">気温</th>
                <th className="px-3 py-3 text-right">湿度</th>
                <th className="px-3 py-3 text-right">土壌水分</th>
                <th className="px-3 py-3 text-right">EC</th>
                <th className="px-3 py-3 text-right">pH</th>
                <th className="px-3 py-3 text-right">光量</th>
              </tr>
            </thead>
            <tbody>
              {scopedLogs.map((log) => {
                const unit = getUnitById(log.productionUnitId);
                return (
                  <tr key={log.id} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-3 font-medium">{formatDateTime(log.observedAt)}</td>
                    <td className="px-3 py-3"><Badge variant="outline">{unit?.name}</Badge></td>
                    <td className="px-3 py-3 text-right">{log.temperatureC.toFixed(1)}℃</td>
                    <td className="px-3 py-3 text-right">{log.humidityPct}%</td>
                    <td className="px-3 py-3 text-right">{log.soilMoisturePct}%</td>
                    <td className="px-3 py-3 text-right">{log.ecDsM.toFixed(1)}</td>
                    <td className="px-3 py-3 text-right">{log.ph.toFixed(1)}</td>
                    <td className="px-3 py-3 text-right">{log.lightLux.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>環境ログを追加</DialogTitle>
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

            <div className="grid gap-1.5">
              <Label htmlFor="observedAt">観測日時</Label>
              <Input id="observedAt" type="datetime-local" {...form.register("observedAt")} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-1.5">
                <Label htmlFor="temperatureC">気温</Label>
                <Input id="temperatureC" type="number" step="0.1" {...form.register("temperatureC")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="humidityPct">湿度</Label>
                <Input id="humidityPct" type="number" {...form.register("humidityPct")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="co2Ppm">CO2</Label>
                <Input id="co2Ppm" type="number" {...form.register("co2Ppm")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="lightLux">光量</Label>
                <Input id="lightLux" type="number" {...form.register("lightLux")} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-1.5">
                <Label htmlFor="soilTemperatureC">地温</Label>
                <Input id="soilTemperatureC" type="number" step="0.1" {...form.register("soilTemperatureC")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="soilMoisturePct">土壌水分</Label>
                <Input id="soilMoisturePct" type="number" {...form.register("soilMoisturePct")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ecDsM">EC</Label>
                <Input id="ecDsM" type="number" step="0.1" {...form.register("ecDsM")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ph">pH</Label>
                <Input id="ph" type="number" step="0.1" {...form.register("ph")} />
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
              <Button type="submit">保存する</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
