"use client";

import {
  Wheat,
  TrendingUp,
  Thermometer,
  Bug,
  ClipboardList,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Droplets,
  Wind,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";

// モックデータ（Data Connect接続後に置き換え）
const harvestData = [
  { date: "4/15", kg: 18.4 },
  { date: "4/16", kg: 22.1 },
  { date: "4/17", kg: 19.8 },
  { date: "4/18", kg: 25.3 },
  { date: "4/19", kg: 21.0 },
  { date: "4/20", kg: 28.5 },
  { date: "4/21", kg: 24.2 },
  { date: "4/22", kg: 26.8 },
];

const workTypeData = [
  { type: "潅水", count: 12 },
  { type: "施肥", count: 5 },
  { type: "防除", count: 3 },
  { type: "摘花", count: 8 },
  { type: "収穫", count: 15 },
  { type: "その他", count: 4 },
];

const recentAlerts = [
  { id: 1, type: "warning", message: "A棟 湿度が高め (87%)", time: "2時間前" },
  { id: 2, type: "danger", message: "B棟 灰色かび病の兆候", time: "昨日" },
  { id: 3, type: "info", message: "C棟 収穫量が先週比+15%", time: "昨日" },
];

const recentWork = [
  { id: 1, greenhouse: "A棟", type: "潅水", date: "今日 09:30", worker: "山田" },
  { id: 2, greenhouse: "B棟", type: "施肥", date: "今日 08:00", worker: "田中" },
  { id: 3, greenhouse: "A棟", type: "収穫", date: "今日 07:30", worker: "山田" },
  { id: 4, greenhouse: "C棟", type: "防除", date: "昨日 14:00", worker: "鈴木" },
];

const statCards = [
  {
    title: "今日の収穫量",
    value: "26.8 kg",
    change: "+8.5%",
    up: true,
    icon: Wheat,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    title: "今月累計",
    value: "312.4 kg",
    change: "+12.3%",
    up: true,
    icon: TrendingUp,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    title: "ハウス温度（平均）",
    value: "22.4 ℃",
    change: "適正範囲",
    up: true,
    icon: Thermometer,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    title: "病害虫発生（今月）",
    value: "2 件",
    change: "-1 件",
    up: true,
    icon: Bug,
    color: "text-red-600",
    bg: "bg-red-50",
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

  return (
    <div className="flex flex-col gap-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">ダッシュボード</h1>
          <p className="text-sm text-muted-foreground mt-1">{today}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/harvest">収穫記録</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/work-logs">作業記録</Link>
          </Button>
        </div>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bg}`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <Badge variant={card.up ? "success" : "destructive"} className="text-xs">
                    {card.up ? <ArrowUp className="mr-1 h-3 w-3" /> : <ArrowDown className="mr-1 h-3 w-3" />}
                    {card.change}
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.title}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* 収穫グラフ */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">収穫量推移（直近8日）</CardTitle>
            <CardDescription>全ハウス合計（kg）</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={harvestData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="harvestGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2d6a4f" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2d6a4f" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid #d1e8d0", fontSize: 13 }}
                  formatter={(v) => [`${v} kg`, "収穫量"]}
                />
                <Area type="monotone" dataKey="kg" stroke="#2d6a4f" strokeWidth={2} fill="url(#harvestGrad)" dot={{ r: 4, fill: "#2d6a4f" }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* アラート */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              アラート・通知
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recentAlerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 rounded-lg border p-3">
                <div
                  className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                    alert.type === "danger" ? "bg-red-500" : alert.type === "warning" ? "bg-amber-500" : "bg-blue-500"
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{alert.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* 作業タイプ分布 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">今月の作業内訳</CardTitle>
            <CardDescription>作業種別ごとの件数</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={workTypeData} margin={{ top: 0, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal vertical={false} />
                <XAxis dataKey="type" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #d1e8d0", fontSize: 13 }} />
                <Bar dataKey="count" fill="#52b788" radius={[4, 4, 0, 0]} name="件数" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 最近の作業 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">最近の作業記録</CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link href="/work-logs">すべて見る</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col divide-y divide-border">
              {recentWork.map((work) => (
                <div key={work.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                      <ClipboardList className="h-4 w-4 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{work.greenhouse} — {work.type}</p>
                      <p className="text-xs text-muted-foreground">{work.date} · {work.worker}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">完了</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 環境サマリー */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">ハウス環境サマリー（現在）</CardTitle>
          <CardDescription>最終更新: 今日 10:30</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "A棟", temp: "22.4℃", humidity: "73%", ok: true },
              { label: "B棟", temp: "24.1℃", humidity: "87%", ok: false },
              { label: "C棟", temp: "21.8℃", humidity: "71%", ok: true },
              { label: "D棟", temp: "23.5℃", humidity: "75%", ok: true },
            ].map((gh) => (
              <div key={gh.label} className={`rounded-lg border p-4 ${gh.ok ? "" : "border-amber-300 bg-amber-50"}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-sm">{gh.label}</p>
                  <div className={`h-2 w-2 rounded-full ${gh.ok ? "bg-emerald-500" : "bg-amber-500"}`} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <Thermometer className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{gh.temp}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Droplets className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className={!gh.ok ? "text-amber-700 font-medium" : ""}>{gh.humidity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
