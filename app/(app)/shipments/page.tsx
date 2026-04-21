"use client";

import { useState } from "react";
import { Plus, Package, TrendingUp, DollarSign, Download } from "lucide-react";
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

const shipSchema = z.object({
  greenhouseId: z.string().min(1, "ハウスを選択してください"),
  shipmentDate: z.string().min(1, "日付を入力してください"),
  shippedKg: z.coerce.number().min(0).optional(),
  shippedCount: z.coerce.number().int().min(0).optional(),
  averageUnitPrice: z.coerce.number().min(0).optional(),
  destinationName: z.string().optional(),
  notes: z.string().optional(),
});
type ShipForm = z.infer<typeof shipSchema>;

const mockGreenhouses = [
  { id: "gh-a", name: "A棟" },
  { id: "gh-b", name: "B棟" },
  { id: "gh-c", name: "C棟" },
  { id: "gh-d", name: "D棟" },
];

type Shipment = {
  id: string;
  greenhouseName: string;
  shipmentDate: string;
  shippedKg: number;
  shippedCount: number;
  averageUnitPrice: number;
  revenueAmount: number;
  destinationName: string;
  notes: string;
};

const mockShipments: Shipment[] = [
  { id: "1", greenhouseName: "A棟", shipmentDate: "2026-04-22", shippedKg: 10.5, shippedCount: 180, averageUnitPrice: 850, revenueAmount: 8925, destinationName: "JA静岡", notes: "" },
  { id: "2", greenhouseName: "B棟", shipmentDate: "2026-04-22", shippedKg: 12.8, shippedCount: 165, averageUnitPrice: 920, revenueAmount: 11776, destinationName: "スーパーABC", notes: "特売用" },
  { id: "3", greenhouseName: "C棟", shipmentDate: "2026-04-21", shippedKg: 8.2, shippedCount: 142, averageUnitPrice: 800, revenueAmount: 6560, destinationName: "JA静岡", notes: "" },
  { id: "4", greenhouseName: "D棟", shipmentDate: "2026-04-20", shippedKg: 14.5, shippedCount: 195, averageUnitPrice: 950, revenueAmount: 13775, destinationName: "産直市場", notes: "直売所向け" },
];

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>(mockShipments);
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<ShipForm>({
    resolver: zodResolver(shipSchema) as Resolver<ShipForm>,
    defaultValues: { shipmentDate: new Date().toISOString().split("T")[0] },
  });

  const totalRevenue = shipments.reduce((s, r) => s + r.revenueAmount, 0);
  const totalKg = shipments.reduce((s, r) => s + r.shippedKg, 0);
  const avgPrice = totalKg > 0 ? totalRevenue / totalKg : 0;

  const onSubmit = (data: ShipForm) => {
    const revenue = (data.shippedKg ?? 0) * 1000 * (data.averageUnitPrice ?? 0) / 1000;
    const newShipment: Shipment = {
      id: Date.now().toString(),
      greenhouseName: mockGreenhouses.find((g) => g.id === data.greenhouseId)?.name ?? "",
      shipmentDate: data.shipmentDate,
      shippedKg: data.shippedKg ?? 0,
      shippedCount: data.shippedCount ?? 0,
      averageUnitPrice: data.averageUnitPrice ?? 0,
      revenueAmount: (data.shippedKg ?? 0) * (data.averageUnitPrice ?? 0),
      destinationName: data.destinationName ?? "",
      notes: data.notes ?? "",
    };
    setShipments((prev) => [newShipment, ...prev]);
    toast.success("出荷記録を保存しました");
    setDialogOpen(false);
    form.reset({ shipmentDate: new Date().toISOString().split("T")[0] });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">出荷記録</h1>
          <p className="text-sm text-muted-foreground mt-1">出荷量・出荷先・売上を記録</p>
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

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold">¥{totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">累計売上</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{totalKg.toFixed(1)} kg</p>
              <p className="text-xs text-muted-foreground">累計出荷量</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold">¥{avgPrice.toFixed(0)}/kg</p>
              <p className="text-xs text-muted-foreground">平均単価</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{shipments.length} 件の出荷記録</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">日付</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">ハウス</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">出荷量(kg)</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">個数</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">単価(円/kg)</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">売上(円)</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">出荷先</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">備考</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{formatDate(s.shipmentDate)}</td>
                    <td className="px-4 py-3"><Badge variant="secondary">{s.greenhouseName}</Badge></td>
                    <td className="px-4 py-3 text-right font-semibold">{s.shippedKg.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right">{s.shippedCount}</td>
                    <td className="px-4 py-3 text-right">¥{s.averageUnitPrice.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">¥{s.revenueAmount.toLocaleString()}</td>
                    <td className="px-4 py-3">{s.destinationName || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>出荷記録の追加</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>ハウス *</Label>
                <Select onValueChange={(v) => form.setValue("greenhouseId", v)}>
                  <SelectTrigger><SelectValue placeholder="選択..." /></SelectTrigger>
                  <SelectContent>
                    {mockGreenhouses.map((g) => (<SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shipmentDate">出荷日 *</Label>
                <Input id="shipmentDate" type="date" {...form.register("shipmentDate")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shippedKg">出荷量 (kg)</Label>
                <Input id="shippedKg" type="number" step="0.1" placeholder="0.0" {...form.register("shippedKg")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shippedCount">個数</Label>
                <Input id="shippedCount" type="number" placeholder="0" {...form.register("shippedCount")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="averageUnitPrice">単価 (円/kg)</Label>
                <Input id="averageUnitPrice" type="number" placeholder="0" {...form.register("averageUnitPrice")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="destinationName">出荷先</Label>
                <Input id="destinationName" placeholder="JA・スーパーなど" {...form.register("destinationName")} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="shipNotes">備考</Label>
              <Textarea id="shipNotes" placeholder="特記事項..." rows={2} {...form.register("notes")} />
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
