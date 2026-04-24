"use client";

import { Database, Layers3, UserCircle2 } from "lucide-react";
import { PageIntro } from "@/components/app/page-intro";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/components/providers/auth-provider";
import { useAgriApp } from "@/components/providers/agri-app-provider";

export default function SettingsPage() {
  const { user } = useAuth();
  const { crops, selectedCropId, materialLots } = useAgriApp();

  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        eyebrow="Settings"
        title="運用設定"
        description="現在の作物契約、Data Connect 前提、通知設定、資材ロットの概況を確認します。作物切替に応じて利用体験が変わることを前提にした設定画面です。"
        scopeLabel={selectedCropId === "all" ? "全作物" : crops.find((crop) => crop.id === selectedCropId)?.name}
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <Card className="border-border/70 bg-white/75 shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCircle2 className="h-4 w-4 text-primary" />
              アカウント
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>メールアドレス</Label>
              <Input value={user?.email ?? ""} disabled className="bg-background" />
            </div>
            <div className="grid gap-1.5">
              <Label>表示名</Label>
              <Input defaultValue={user?.displayName ?? ""} className="bg-background" />
            </div>
            <Button className="w-fit">プロフィールを更新</Button>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-white/75 shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers3 className="h-4 w-4 text-[color:var(--accent-earth)]" />
              作物契約と表示
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {crops.map((crop) => (
              <div key={crop.id} className="rounded-2xl border border-border/70 bg-background/85 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{crop.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {crop.pricingTier} / AI {crop.aiEnabled ? "有効" : "未契約"}
                    </p>
                  </div>
                  <Badge className={crop.surfaceClass}>{crop.defaultYieldUnit}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="border-border/70 bg-white/75 shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">通知設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "日次サマリー", detail: "作物スコープごとの収穫と作業を通知" },
              { label: "病害虫アラート", detail: "未解決インシデントを即時通知" },
              { label: "週次出荷レビュー", detail: "出荷ロットと売上の週間集計" },
            ].map((item, index) => (
              <div key={item.label}>
                {index > 0 ? <Separator className="mb-4" /> : null}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.detail}</p>
                  </div>
                  <Switch defaultChecked={index !== 2} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-white/75 shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">資材ロット概況</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {materialLots.map((lot) => (
              <div key={lot.id} className="rounded-2xl border border-border/70 bg-background/85 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{lot.materialName}</p>
                    <p className="text-sm text-muted-foreground">{lot.lotCode}</p>
                  </div>
                  <Badge variant="outline">{lot.materialType}</Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  残量 {lot.remainingQuantityValue} {lot.remainingQuantityUnit}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-white/75 shadow-sm backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4 text-primary" />
            Firebase Data Connect
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="rounded-2xl border border-border/70 bg-background/85 p-4 text-sm">
            <p className="font-semibold">接続前提</p>
            <p className="mt-1 text-muted-foreground">
              `production_units / cultivation_cycles / harvest_records / work_material_usages` を中心に実データ化していく前提です。
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
            <p className="font-semibold">SDK再生成が必要</p>
            <p className="mt-1">スキーマ更新後はエミュレーター再起動と `firebase dataconnect:sdk:generate` を実行してください。</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
