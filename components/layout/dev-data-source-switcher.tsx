"use client";

import { useState } from "react";
import { DatabaseZap, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAgriApp, type DataSourceMode } from "@/components/providers/agri-app-provider";

export function DevDataSourceSwitcher() {
  const {
    dataSourceMode,
    emulatorDataAvailable,
    emulatorStatus,
    emulatorError,
    setDataSourceMode,
    refreshEmulatorData,
    clearEmulatorData,
  } = useAgriApp();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const handleChange = async (mode: DataSourceMode) => {
    if (mode === "emulator") {
      setDataSourceMode(mode);
      await refreshEmulatorData();
      return;
    }
    setDataSourceMode(mode);
  };

  const handleRefresh = async () => {
    try {
      await refreshEmulatorData();
      toast.success("エミュレータデータを再読込しました");
    } catch {
      toast.error("エミュレータデータの再読込に失敗しました");
    }
  };

  const handleClear = async () => {
    try {
      await clearEmulatorData();
      toast.success("エミュレータDBのデータを削除しました");
      setConfirmOpen(false);
    } catch {
      toast.error("エミュレータDBの削除に失敗しました");
    }
  };

  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <DatabaseZap className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              開発データ表示
            </p>
          </div>
          <p className="mt-2 text-xs font-semibold text-foreground">
            {dataSourceMode === "mock" ? "デフォルトデータを表示中" : "エミュレータDBを表示中"}
          </p>
        </div>
        <Badge
          variant={
            emulatorStatus === "ready"
              ? "success"
              : emulatorStatus === "loading"
                ? "info"
                : emulatorDataAvailable
                  ? "success"
                  : "warning"
          }
        >
          {emulatorStatus === "loading"
            ? "読込中"
            : emulatorDataAvailable
              ? "接続可"
              : "未接続"}
        </Badge>
      </div>

      {emulatorError ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {emulatorError}
        </p>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="sm"
          variant={dataSourceMode === "mock" ? "default" : "outline"}
          onClick={() => void handleChange("mock")}
        >
          デフォルト
        </Button>
        <Button
          type="button"
          size="sm"
          variant={dataSourceMode === "emulator" ? "default" : "outline"}
          onClick={() => void handleChange("emulator")}
        >
          エミュレータDB
        </Button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={() => setConfirmOpen(true)}
        >
          一括削除
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => void handleRefresh()}>
          <RefreshCw className="h-4 w-4" />
          再読込
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>エミュレータDBを一括削除</DialogTitle>
            <DialogDescription>
              現在の組織に紐づくエミュレータデータを削除します。元に戻せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={() => void handleClear()}>
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
