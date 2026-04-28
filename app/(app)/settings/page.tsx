"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import {
  Building2,
  Copy,
  Database,
  KeyRound,
  Layers3,
  Mail,
  Plus,
  ShieldCheck,
  UserCircle2,
  Users2,
} from "lucide-react";
import { PageIntro } from "@/components/app/page-intro";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAgriApp } from "@/components/providers/agri-app-provider";
import { useAppSession } from "@/components/providers/app-session-provider";
import {
  createOrganizationInvite,
  listOrganizationInvites,
  revokeOrganizationInvite,
  type OrganizationInvite,
  updateUserDisplayNameAcrossStores,
} from "@/lib/app-identity";
import { getAiPlanLabel, getCropPricingSummary, type CropAiPlan } from "@/lib/agri-mock-data";
import { updateAuthDisplayName } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";

const cropSchema = z.object({
  name: z.string().min(1, "作物名を入力してください"),
  code: z.string().optional(),
  defaultYieldUnit: z.string().min(1, "記録単位を入力してください"),
  defaultShipmentUnit: z.string().min(1, "出荷単位を入力してください"),
  aiPlan: z.enum(["none", "lite", "pro"]),
});

type CropForm = z.infer<typeof cropSchema>;

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

function inviteStatusLabel(invite: OrganizationInvite) {
  if (invite.status === "revoked") return "停止中";
  if (invite.status === "exhausted") return "使用上限";
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) return "期限切れ";
  return "有効";
}

function buildInviteUrl(code: string) {
  if (typeof window === "undefined") {
    return `/onboarding?invite=${code}`;
  }
  return `${window.location.origin}/onboarding?invite=${encodeURIComponent(code)}`;
}

export default function SettingsPage() {
  const {
    authUser,
    profile,
    memberships,
    activeOrganization,
    activeOrganizationId,
    activeOrganizationMembers,
    activeRole,
    refreshSession,
    setActiveOrganization,
    organizationLoading,
  } = useAppSession();
  const { crops, selectedCropId, materialLots, addCrop, getCropLabel } = useAgriApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [invites, setInvites] = useState<OrganizationInvite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [displayName, setDisplayName] = useState(() => authUser?.displayName ?? "");
  const [inviteRole, setInviteRole] = useState("worker");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteExpiresInDays, setInviteExpiresInDays] = useState("7");
  const [inviteMaxUses, setInviteMaxUses] = useState("1");
  const [inviteSaving, setInviteSaving] = useState(false);
  const form = useForm<CropForm>({
    resolver: zodResolver(cropSchema) as Resolver<CropForm>,
    defaultValues: {
      defaultYieldUnit: "kg",
      defaultShipmentUnit: "箱",
      aiPlan: "none",
    },
  });

  const canManageInvites = activeRole === "owner" || activeRole === "manager";

  useEffect(() => {
    let cancelled = false;

    async function loadInvites() {
      if (!activeOrganizationId || !canManageInvites) {
        setInvites([]);
        return;
      }
      setInvitesLoading(true);
      try {
        const nextInvites = await listOrganizationInvites(activeOrganizationId);
        if (!cancelled) {
          setInvites(nextInvites);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : "招待コード一覧の取得に失敗しました"
          );
        }
      } finally {
        if (!cancelled) {
          setInvitesLoading(false);
        }
      }
    }

    void loadInvites();

    return () => {
      cancelled = true;
    };
  }, [activeOrganizationId, canManageInvites]);

  const onSubmit = async (values: CropForm) => {
    try {
      await addCrop(values);
      toast.success("作物を追加しました");
      setDialogOpen(false);
      form.reset({
        defaultYieldUnit: values.defaultYieldUnit,
        defaultShipmentUnit: values.defaultShipmentUnit,
        aiPlan: values.aiPlan,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "作物の追加に失敗しました"
      );
    }
  };

  const handleProfileSave = async () => {
    const nextDisplayName = displayName.trim();
    if (!authUser || !nextDisplayName) {
      toast.error("表示名を入力してください");
      return;
    }
    setProfileSaving(true);
    try {
      await updateAuthDisplayName(nextDisplayName);
      await updateUserDisplayNameAcrossStores(authUser, nextDisplayName);
      await refreshSession();
      toast.success("プロフィールを更新しました");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "プロフィールの更新に失敗しました"
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCreateInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!authUser || !activeOrganizationId || !activeOrganization) {
      toast.error("組織情報の取得後に再度お試しください");
      return;
    }
    setInviteSaving(true);
    try {
      const invite = await createOrganizationInvite({
        organizationId: activeOrganizationId,
        organizationName: activeOrganization.name,
        role: inviteRole,
        invitedEmail: inviteEmail,
        expiresInDays: inviteExpiresInDays ? Number(inviteExpiresInDays) : undefined,
        maxUses: inviteMaxUses ? Number(inviteMaxUses) : undefined,
        createdByAuthUid: authUser.uid,
        createdByDisplayName: authUser.displayName ?? profile?.displayName ?? null,
      });
      setInvites((current) => [invite, ...current]);
      setInviteDialogOpen(false);
      setInviteRole("worker");
      setInviteEmail("");
      setInviteExpiresInDays("7");
      setInviteMaxUses("1");
      toast.success("招待コードを発行しました");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "招待コードの発行に失敗しました"
      );
    } finally {
      setInviteSaving(false);
    }
  };

  const copyInvite = async (invite: OrganizationInvite, kind: "code" | "url") => {
    const value = kind === "code" ? invite.code : buildInviteUrl(invite.code);
    try {
      await navigator.clipboard.writeText(value);
      toast.success(kind === "code" ? "招待コードをコピーしました" : "招待URLをコピーしました");
    } catch {
      toast.error("クリップボードへのコピーに失敗しました");
    }
  };

  const handleRevokeInvite = async (invite: OrganizationInvite) => {
    try {
      await revokeOrganizationInvite(invite.code);
      setInvites((current) =>
        current.map((item) =>
          item.code === invite.code
            ? { ...item, status: "revoked", updatedAt: new Date().toISOString() }
            : item
        )
      );
      toast.success("招待コードを停止しました");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "招待コードの停止に失敗しました"
      );
    }
  };

  const membershipSummary = useMemo(() => {
    if (!activeOrganizationMembers.length) return "-";
    return `${activeOrganizationMembers.length}名`;
  }, [activeOrganizationMembers]);

  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        eyebrow="Settings"
        title="運用設定"
        description="アカウント、所属組織、メンバー招待、作物管理をまとめて管理します。記録機能は無料、AI利用だけを作物単位で有効化する前提です。"
        scopeLabel={getCropLabel(selectedCropId)}
      />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCircle2 className="h-4 w-4 text-primary" />
              アカウント
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>メールアドレス</Label>
              <Input value={authUser?.email ?? ""} disabled className="bg-background" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="displayName">表示名</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="bg-background"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>最後に選択した組織</Label>
              <Input
                value={profile?.lastOrganizationId ?? ""}
                disabled
                className="bg-background text-xs"
              />
            </div>
            <Button className="w-fit" onClick={() => void handleProfileSave()} disabled={profileSaving}>
              {profileSaving ? "更新中..." : "プロフィールを更新"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-primary" />
              所属組織
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>利用中の組織</Label>
              {memberships.length > 1 ? (
                <Select
                  value={activeOrganizationId ?? undefined}
                  onValueChange={(value) => void setActiveOrganization(value)}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {memberships.map((membership) => (
                      <SelectItem key={membership.organizationId} value={membership.organizationId}>
                        {membership.organizationName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={activeOrganization?.name ?? activeOrganization?.id ?? ""}
                  disabled
                  className="bg-background"
                />
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  権限
                </p>
                <p className="mt-2 font-semibold">{roleLabel(activeRole ?? "")}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  メンバー数
                </p>
                <p className="mt-2 font-semibold">{membershipSummary}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  所在
                </p>
                <p className="mt-2 font-semibold">
                  {[activeOrganization?.prefecture, activeOrganization?.city].filter(Boolean).join(" " ) || "-"}
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-background p-4 text-sm">
              <p className="font-medium">オンボーディング構成</p>
              <p className="mt-1 text-muted-foreground">
                初回登録時に Firebase Auth のユーザーを Data Connect の最小ユーザーへ同期し、
                ここで組織を起点にメンバーと招待を管理します。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users2 className="h-4 w-4 text-primary" />
                メンバー一覧
              </CardTitle>
              {organizationLoading ? <Badge variant="outline">読込中</Badge> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeOrganizationMembers.map((member) => (
              <div key={member.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {member.user.displayName || member.user.email}
                    </p>
                    <p className="text-sm text-muted-foreground">{member.user.email}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">{roleLabel(member.role)}</Badge>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {member.invitationStatus === "accepted" ? "参加済み" : member.invitationStatus}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {activeOrganizationMembers.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                現在の組織メンバーがまだ取得できていません。
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="h-4 w-4 text-primary" />
                招待コード管理
              </CardTitle>
              <Button size="sm" onClick={() => setInviteDialogOpen(true)} disabled={!canManageInvites}>
                <Plus className="mr-2 h-4 w-4" />
                招待を発行
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="font-medium">招待の考え方</p>
              <p className="mt-1 text-muted-foreground">
                組織参加は招待コードで行います。メール指定、利用回数、期限を組み合わせて誤参加を防げます。
              </p>
            </div>
            {!canManageInvites ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                招待の発行・停止はオーナーまたは管理者のみ実行できます。
              </div>
            ) : invitesLoading ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                招待コードを読み込んでいます...
              </div>
            ) : invites.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                まだ招待コードは発行されていません。
              </div>
            ) : (
              invites.map((invite) => (
                <div key={invite.code} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{invite.code}</p>
                        <Badge variant="outline">{roleLabel(invite.role)}</Badge>
                        <Badge
                          variant={
                            inviteStatusLabel(invite) === "有効"
                              ? "success"
                              : inviteStatusLabel(invite) === "停止中"
                                ? "destructive"
                                : "warning"
                          }
                        >
                          {inviteStatusLabel(invite)}
                        </Badge>
                      </div>
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <p>対象組織: {invite.organizationName}</p>
                        <p>
                          使用回数: {invite.useCount}
                          {invite.maxUses != null ? ` / ${invite.maxUses}` : ""}
                        </p>
                        <p>指定メール: {invite.invitedEmail || "制限なし"}</p>
                        <p>有効期限: {invite.expiresAt ? formatDateTime(invite.expiresAt) : "なし"}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" variant="outline" onClick={() => void copyInvite(invite, "code")}>
                        <Copy className="h-4 w-4" />
                        コード
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void copyInvite(invite, "url")}>
                        <Mail className="h-4 w-4" />
                        URL
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={invite.status === "revoked"}
                        onClick={() => void handleRevokeInvite(invite)}
                      >
                        停止
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers3 className="h-4 w-4 text-primary" />
                作物管理
              </CardTitle>
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                作物を追加
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="font-medium">料金方針</p>
              <p className="mt-1 text-muted-foreground">
                記録機能は無料、AI分析のみ作物ごとに有料契約する前提です。
              </p>
            </div>
            {crops.map((crop) => (
              <div key={crop.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{crop.name}</p>
                      <Badge className={crop.surfaceClass}>{crop.code}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{getCropPricingSummary(crop)}</p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>記録単位 {crop.defaultYieldUnit}</p>
                    <p>出荷単位 {crop.defaultShipmentUnit}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">資材ロット概況</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {materialLots.map((lot) => (
              <div key={lot.id} className="rounded-lg border p-4">
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

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">通知設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "日次サマリー", detail: "作物スコープごとの収穫と作業を通知" },
              { label: "病気・害虫アラート", detail: "未解決インシデントを即時通知" },
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-primary" />
              データ基盤
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="rounded-lg border bg-background p-4 text-sm">
              <p className="font-semibold">Data Connect</p>
              <p className="mt-1 text-muted-foreground">
                農業の正データは `organizations / organization_members / production_units / cultivation_cycles` を基点に保持します。
              </p>
            </div>
            <div className="rounded-lg border bg-background p-4 text-sm">
              <p className="font-semibold">Firestore</p>
              <p className="mt-1 text-muted-foreground">
                軽量プロフィールと招待コードは Firestore に保持し、オンボーディングと組織参加のUXを支えます。
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="font-semibold">開発時の注意</p>
                  <p className="mt-1">
                    Data Connect の schema / operations 更新後はエミュレーター再起動が必要です。Firestore をローカルで使う場合は `NEXT_PUBLIC_USE_FIRESTORE_EMULATOR=true` を設定してください。
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>作物を追加</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">記録機能</p>
              <p className="mt-1 text-muted-foreground">
                追加した作物も記録機能は無料です。ここでは AI 契約の有無だけを設定します。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="name">作物名</Label>
                <Input id="name" placeholder="きゅうり" {...form.register("name")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="code">コード</Label>
                <Input id="code" placeholder="任意" {...form.register("code")} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="defaultYieldUnit">既定の記録単位</Label>
                <Input id="defaultYieldUnit" placeholder="kg / 束 / 本" {...form.register("defaultYieldUnit")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="defaultShipmentUnit">既定の出荷単位</Label>
                <Input id="defaultShipmentUnit" placeholder="箱 / ケース" {...form.register("defaultShipmentUnit")} />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>AI利用プラン</Label>
              <Select
                defaultValue={form.getValues("aiPlan")}
                onValueChange={(value) => form.setValue("aiPlan", value as CropAiPlan)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{getAiPlanLabel("none")}</SelectItem>
                  <SelectItem value="lite">{getAiPlanLabel("lite")}</SelectItem>
                  <SelectItem value="pro">{getAiPlanLabel("pro")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit">追加する</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>招待コードを発行</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleCreateInvite}>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">安全な共有</p>
              <p className="mt-1 text-muted-foreground">
                必要に応じてメール制限や回数制限を付けて、組織参加の誤操作を防ぎます。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>付与権限</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">管理者</SelectItem>
                    <SelectItem value="worker">作業者</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="inviteEmail">指定メール</Label>
                <Input
                  id="inviteEmail"
                  placeholder="任意"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="expiresInDays">有効日数</Label>
                <Input
                  id="expiresInDays"
                  type="number"
                  min="1"
                  value={inviteExpiresInDays}
                  onChange={(event) => setInviteExpiresInDays(event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="maxUses">利用上限</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min="1"
                  value={inviteMaxUses}
                  onChange={(event) => setInviteMaxUses(event.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit" disabled={inviteSaving}>
                {inviteSaving ? "発行中..." : "発行する"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
