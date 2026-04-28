"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  Coins,
  Leaf,
  Package,
  Thermometer,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageIntro } from "@/components/app/page-intro";
import { StatCard } from "@/components/app/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgriApp } from "@/components/providers/agri-app-provider";
import { getProductionUnitTypeLabel } from "@/lib/agri-mock-data";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getCurrentDateInputValue,
  getRecentDateInputValues,
  toDateInputValue,
} from "@/lib/utils";

function sameDay(date: string, target: string) {
  return toDateInputValue(date) === target;
}

export default function DashboardPage() {
  const {
    dataSourceMode,
    selectedCropId,
    productionUnits,
    cultivationCycles,
    harvestRecords,
    shipmentRecords,
    environmentLogs,
    diseaseIncidents,
    getUnitById,
    getCropLabel,
    matchesSelectedCrop,
    refreshEmulatorData,
  } = useAgriApp();
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const scopedCycles = cultivationCycles.filter((cycle) => matchesSelectedCrop(cycle.cropTypeId));
  const scopedHarvests = harvestRecords.filter((record) => matchesSelectedCrop(record.cropTypeId));
  const scopedShipments = shipmentRecords.filter((record) => matchesSelectedCrop(record.cropTypeId));
  const scopedEnvironment = environmentLogs.filter((log) => matchesSelectedCrop(log.cropTypeId));
  const scopedIncidents = diseaseIncidents.filter((incident) => matchesSelectedCrop(incident.cropTypeId));

  const scopedUnitIds = new Set(scopedCycles.map((cycle) => cycle.productionUnitId));
  const scopedUnits =
    selectedCropId === "all"
      ? productionUnits.filter((unit) => unit.isActive)
      : productionUnits.filter((unit) => unit.isActive && scopedUnitIds.has(unit.id));

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setCurrentTime(new Date());
      if (dataSourceMode === "emulator") {
        void refreshEmulatorData();
      }
    }, 60_000);
    return () => window.clearInterval(timerId);
  }, [dataSourceMode, refreshEmulatorData]);

  const today = getCurrentDateInputValue(currentTime);
  const todayHarvestKg = scopedHarvests
    .filter((record) => sameDay(record.harvestDate, today))
    .reduce((sum, record) => sum + record.normalizedWeightKg, 0);
  const todayRevenue = scopedShipments
    .filter((record) => sameDay(record.shipmentDate, today))
    .reduce((sum, record) => sum + record.revenueAmount, 0);
  const openIncidents = scopedIncidents.filter((incident) => !incident.resolvedOn);
  const averageTemp =
    scopedEnvironment.reduce((sum, log) => sum + log.temperatureC, 0) /
    Math.max(scopedEnvironment.length, 1);

  const recentDays = getRecentDateInputValues(5, currentTime);
  const chartData = recentDays.map((day) => ({
    date: day.slice(5).replace("-", "/"),
    harvestKg: scopedHarvests
      .filter((record) => sameDay(record.harvestDate, day))
      .reduce((sum, record) => sum + record.normalizedWeightKg, 0),
  }));

  const activeCycles = scopedCycles.filter((cycle) => cycle.status === "active").slice(0, 4);
  const latestEnvironment = [...scopedEnvironment]
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt))
    .slice(0, 4);
  const recentShipments = [...scopedShipments]
    .sort((a, b) => b.shipmentDate.localeCompare(a.shipmentDate))
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        eyebrow="Dashboard"
        title="ダッシュボード"
        description={`${getCropLabel(selectedCropId)}の収穫、出荷、環境、病気・害虫を横断して確認します。基準日 ${formatDate(today)} / 更新 ${formatDateTime(currentTime, { hour: "2-digit", minute: "2-digit" })}`}
        scopeLabel={getCropLabel(selectedCropId)}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/harvest">収穫記録</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/work-logs">作業記録</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active Units" value={`${scopedUnits.length} 件`} detail="稼働中の生産エリア" icon={Boxes} tone="leaf" />
        <StatCard label="Today Harvest" value={`${todayHarvestKg.toFixed(1)} kg`} detail="当日の重量換算" icon={Leaf} tone="earth" />
        <StatCard label="Today Revenue" value={formatCurrency(todayRevenue)} detail="当日の出荷売上" icon={Coins} tone="sun" />
        <StatCard label="Open Alerts" value={`${openIncidents.length} 件`} detail={`平均気温 ${averageTemp.toFixed(1)}℃`} icon={AlertTriangle} tone={openIncidents.length > 0 ? "danger" : "sky"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">収穫量推移（直近5日）</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashboardHarvest" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2d6a4f" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2d6a4f" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid #d1e8d0", fontSize: 13 }}
                  formatter={(value) => [`${Number(value ?? 0).toFixed(1)} kg`, "収穫量"]}
                />
                <Area
                  type="monotone"
                  dataKey="harvestKg"
                  stroke="#2d6a4f"
                  strokeWidth={2}
                  fill="url(#dashboardHarvest)"
                  dot={{ r: 4, fill: "#2d6a4f" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              アラート
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {openIncidents.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                現在、未解決の病気・害虫アラートはありません。
              </div>
            ) : (
              openIncidents.map((incident) => {
                const unit = getUnitById(incident.productionUnitId);
                return (
                  <div key={incident.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{incident.name}</p>
                        <p className="text-xs text-muted-foreground">{unit?.name}</p>
                      </div>
                      <Badge variant="warning">重症度 {incident.severityLevel}</Badge>
                    </div>
                    <p className="mt-2 text-sm">{incident.actionTaken || "対応未入力"}</p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">稼働中の作付</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeCycles.map((cycle) => {
              const unit = getUnitById(cycle.productionUnitId);
              return (
                <div key={cycle.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{cycle.cycleName}</p>
                      <p className="text-xs text-muted-foreground">
                        {unit?.name} · {cycle.varietyName}
                      </p>
                    </div>
                    <Badge variant="outline">{cycle.primaryRecordUnit}</Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>定植: {formatDate(cycle.plantingDate)}</span>
                    <span>株数: {cycle.plantedCount.toLocaleString()} 株</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">最新の環境観測</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestEnvironment.map((log) => {
              const unit = getUnitById(log.productionUnitId);
              return (
                <div key={log.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{unit?.name}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(log.observedAt)}</p>
                    </div>
                    <Thermometer className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <span>{log.temperatureC.toFixed(1)}℃</span>
                    <span>{log.humidityPct}%</span>
                    <span className="text-muted-foreground">EC {log.ecDsM.toFixed(1)}</span>
                    <span className="text-muted-foreground">pH {log.ph.toFixed(1)}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4 text-primary" />
              最近の出荷
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentShipments.map((shipment) => {
              const unit = getUnitById(shipment.productionUnitId);
              return (
                <div key={shipment.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{shipment.destinationName}</p>
                      <p className="text-xs text-muted-foreground">
                        {unit?.name} · {formatDate(shipment.shipmentDate)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(shipment.revenueAmount)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{shipment.quantityValue} {shipment.quantityUnit}</Badge>
                    <Badge variant="outline">{shipment.shipmentLotCode}</Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-primary" />
            生産エリア一覧
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {scopedUnits.map((unit) => {
            const cycle = scopedCycles.find(
              (item) => item.productionUnitId === unit.id && item.status === "active"
            );
            return (
              <div key={unit.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{unit.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {getProductionUnitTypeLabel(unit.unitType)} · {unit.farmName}
                    </p>
                  </div>
                  <Badge variant="outline">{unit.code}</Badge>
                </div>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <p>面積 {unit.areaM2.toLocaleString()} m²</p>
                  <p>{cycle ? `${cycle.varietyName} / ${cycle.primaryRecordUnit}` : "作付なし"}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
