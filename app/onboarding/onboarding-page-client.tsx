"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, KeyRound, LogOut, MapPin, PlusCircle, Users2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAppSession } from "@/components/providers/app-session-provider";
import { logOut } from "@/lib/auth";
import { cn } from "@/lib/utils";

function roleLabel(role: string) {
  switch (role) {
    case "owner":
      return "オーナー";
    case "manager":
      return "管理者";
    default:
      return "作業者";
  }
}

export function OnboardingPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteFromQuery = useMemo(
    () => searchParams.get("invite")?.trim() ?? "",
    [searchParams]
  );
  const {
    authUser,
    loading,
    needsOnboarding,
    createOrganization,
    joinWithInvite,
    previewInvite,
  } = useAppSession();
  const [tab, setTab] = useState(inviteFromQuery ? "join" : "create");
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [city, setCity] = useState("");
  const [primaryFarmName, setPrimaryFarmName] = useState("");
  const [inviteCode, setInviteCode] = useState(inviteFromQuery);
  const [invitePreview, setInvitePreview] = useState<Awaited<ReturnType<typeof previewInvite>>>(null);

  useEffect(() => {
    if (!loading) {
      if (!authUser) {
        router.replace("/login");
        return;
      }
      if (!needsOnboarding) {
        router.replace("/dashboard");
      }
    }
  }, [authUser, loading, needsOnboarding, router]);

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      if (!inviteCode.trim()) {
        setInvitePreview(null);
        return;
      }
      setPreviewLoading(true);
      try {
        const preview = await previewInvite(inviteCode);
        if (!cancelled) {
          setInvitePreview(preview);
        }
      } catch {
        if (!cancelled) {
          setInvitePreview(null);
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [inviteCode, previewInvite]);

  const handleCreateOrganization = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!organizationName.trim()) {
      toast.error("組織名を入力してください");
      return;
    }
    setCreateLoading(true);
    try {
      await createOrganization({
        organizationName,
        prefecture,
        city,
        primaryFarmName,
      });
      toast.success("組織を作成しました");
      router.replace("/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "組織の作成に失敗しました"
      );
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoinOrganization = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!inviteCode.trim()) {
      toast.error("招待コードを入力してください");
      return;
    }
    setJoinLoading(true);
    try {
      await joinWithInvite(inviteCode);
      toast.success("組織に参加しました");
      router.replace("/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "組織への参加に失敗しました"
      );
    } finally {
      setJoinLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!authUser || !needsOnboarding) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-3xl border bg-card px-5 py-5 shadow-sm sm:px-8 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <Badge variant="secondary" className="w-fit">
                Onboarding
              </Badge>
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  最初に所属する組織を設定します
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">
                  アカウントは作成できています。次に、利用者としての最小情報を業務DBへ同期し、
                  新しい組織を作成するか、既存組織の招待コードで参加してください。
                </p>
              </div>
            </div>
            <div className="rounded-2xl border bg-background px-4 py-3 text-sm">
              <p className="font-medium">{authUser.displayName ?? "利用ユーザー"}</p>
              <p className="mt-1 text-muted-foreground">{authUser.email}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-3 h-8 px-0 text-muted-foreground"
                onClick={() => void logOut()}
              >
                <LogOut className="h-4 w-4" />
                別アカウントでやり直す
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                icon: Building2,
                title: "1. 利用者を同期",
                detail: "Firebase Auth のアカウントを、業務データ参照用の最小ユーザーへ同期します。",
              },
              {
                icon: PlusCircle,
                title: "2. 組織を作成",
                detail: "1人農家でも法人でも、まずは1つの組織を持つ形で始めます。",
              },
              {
                icon: Users2,
                title: "3. 招待で参加",
                detail: "あとからスタッフや外部メンバーを招待コードで同じ組織へ参加させられます。",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border bg-background p-4">
                <item.icon className="h-5 w-5 text-primary" />
                <p className="mt-3 font-semibold">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="order-2 lg:order-1">
            <Card className="h-full">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>組織の開始方法を選択</CardTitle>
                    <CardDescription>
                      自分で最初の組織を作るか、招待コードで既存組織へ参加します。
                    </CardDescription>
                  </div>
                  <TabsList className="grid w-full grid-cols-2 sm:w-[280px]">
                    <TabsTrigger value="create">組織を作成</TabsTrigger>
                    <TabsTrigger value="join">招待で参加</TabsTrigger>
                  </TabsList>
                </div>
              </CardHeader>
              <CardContent>
                <TabsContent value="create" className="mt-0">
                  <form className="grid gap-4" onSubmit={handleCreateOrganization}>
                    <div className="rounded-2xl border bg-muted/30 p-4 text-sm">
                      <p className="font-medium">最初の構成</p>
                      <p className="mt-1 text-muted-foreground">
                        組織を作成すると、オーナー権限で所属し、最初の農場を1件だけ自動作成します。
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-1.5 sm:col-span-2">
                        <Label htmlFor="organizationName">組織名</Label>
                        <Input
                          id="organizationName"
                          placeholder="山田いちご園"
                          value={organizationName}
                          onChange={(event) => setOrganizationName(event.target.value)}
                          required
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="prefecture">都道府県</Label>
                        <Input
                          id="prefecture"
                          placeholder="静岡県"
                          value={prefecture}
                          onChange={(event) => setPrefecture(event.target.value)}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="city">市区町村</Label>
                        <Input
                          id="city"
                          placeholder="静岡市"
                          value={city}
                          onChange={(event) => setCity(event.target.value)}
                        />
                      </div>
                      <div className="grid gap-1.5 sm:col-span-2">
                        <Label htmlFor="primaryFarmName">最初の農場名</Label>
                        <Input
                          id="primaryFarmName"
                          placeholder="未入力なら「組織名 本園」で作成"
                          value={primaryFarmName}
                          onChange={(event) => setPrimaryFarmName(event.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={createLoading}>
                        {createLoading ? "作成中..." : "この内容で組織を作成"}
                      </Button>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="join" className="mt-0">
                  <form className="grid gap-4" onSubmit={handleJoinOrganization}>
                    <div className="rounded-2xl border bg-muted/30 p-4 text-sm">
                      <p className="font-medium">招待コード参加</p>
                      <p className="mt-1 text-muted-foreground">
                        オーナーまたは管理者が発行した招待コードで、同じ組織へ参加します。
                      </p>
                    </div>

                    <div className="grid gap-1.5">
                      <Label htmlFor="inviteCode">招待コード</Label>
                      <div className="flex gap-2">
                        <Input
                          id="inviteCode"
                          placeholder="ABCD-1234"
                          value={inviteCode}
                          onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                          className="uppercase"
                        />
                        <Button type="submit" disabled={joinLoading}>
                          {joinLoading ? "参加中..." : "参加する"}
                        </Button>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "rounded-2xl border p-4 text-sm",
                        invitePreview
                          ? "border-emerald-200 bg-emerald-50/60"
                          : "border-dashed bg-background"
                      )}
                    >
                      {previewLoading ? (
                        <p className="text-muted-foreground">招待内容を確認しています...</p>
                      ) : invitePreview ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <KeyRound className="h-4 w-4 text-emerald-700" />
                            <p className="font-semibold text-emerald-900">
                              {invitePreview.organizationName}
                            </p>
                            <Badge variant="outline">{roleLabel(invitePreview.role)}</Badge>
                          </div>
                          <p className="text-emerald-900/80">
                            使用回数 {invitePreview.useCount}
                            {invitePreview.maxUses != null ? ` / ${invitePreview.maxUses}` : ""}
                          </p>
                          {invitePreview.invitedEmail ? (
                            <p className="text-emerald-900/80">
                              指定メール: {invitePreview.invitedEmail}
                            </p>
                          ) : null}
                          {invitePreview.expiresAt ? (
                            <p className="text-emerald-900/80">
                              有効期限: {new Date(invitePreview.expiresAt).toLocaleString("ja-JP")}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">
                          招待コードを入力すると、参加先の組織情報をここに表示します。
                        </p>
                      )}
                    </div>
                  </form>
                </TabsContent>
              </CardContent>
            </Card>
          </div>

          <div className="order-1 lg:order-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>このあとできること</CardTitle>
                <CardDescription>
                  組織所属が決まると、ダッシュボードや各記録画面、招待管理を利用できます。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="rounded-2xl border bg-background p-4">
                  <p className="font-medium">無料で使える領域</p>
                  <p className="mt-1 text-muted-foreground">
                    生産エリア、作付、作業、収穫、出荷、環境、病気・害虫などの記録は無料で使う前提です。
                  </p>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <p className="font-medium">有料になる領域</p>
                  <p className="mt-1 text-muted-foreground">
                    AI分析や作物別の高度な支援は、組織参加後に作物単位で有効化していきます。
                  </p>
                </div>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium">組織作成時の初期農場</p>
                      <p className="text-muted-foreground">
                        最初の農場を1件だけ自動作成します。生産エリアはあとから自由に増やせます。
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users2 className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium">スタッフ追加</p>
                      <p className="text-muted-foreground">
                        設定画面から招待コードを発行し、メール制限付きや回数制限付きで管理できます。
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
