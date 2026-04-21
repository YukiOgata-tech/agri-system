"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-sm text-muted-foreground mt-1">プロフィール・通知・システム設定</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">プロフィール</CardTitle>
          <CardDescription>ユーザー情報を管理します</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>メールアドレス</Label>
            <Input value={user?.email ?? ""} disabled className="bg-muted" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="displayName">表示名</Label>
            <Input id="displayName" defaultValue={user?.displayName ?? ""} placeholder="山田 太郎" />
          </div>
          <Button className="w-fit">プロフィールを更新</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">通知設定</CardTitle>
          <CardDescription>通知の受信方法を設定します</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {[
            { label: "日次レポート", desc: "毎日の収穫・作業サマリーをメールで受信" },
            { label: "リスクアラート", desc: "病害虫・環境異常を検知したとき通知" },
            { label: "週次レポート", desc: "週間まとめをメールで受信" },
          ].map((item, i) => (
            <div key={i}>
              {i > 0 && <Separator className="mb-4" />}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
                <Switch defaultChecked={i < 2} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">データベース接続 (Firebase Data Connect)</CardTitle>
          <CardDescription>データベース接続状態</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="rounded-lg bg-muted/40 p-4 text-sm flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">プロジェクト ID</span>
              <Badge variant="outline">agri-ai-saas</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">サービス ID</span>
              <Badge variant="outline">agri-ai-saas-service</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">リージョン</span>
              <Badge variant="outline">asia-northeast1</Badge>
            </div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <p className="font-semibold mb-1">SDK生成が必要です</p>
            <p>Firebase CLI をインストール後、以下を実行してください:</p>
            <code className="block mt-1 bg-amber-100 rounded px-2 py-1 font-mono">
              firebase emulators:start --only dataconnect
            </code>
            <code className="block mt-1 bg-amber-100 rounded px-2 py-1 font-mono">
              firebase dataconnect:sdk:generate
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
