"use client";

import { Sprout } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAgriApp } from "@/components/providers/agri-app-provider";

type CropSwitcherProps = {
  compact?: boolean;
};

export function CropSwitcher({ compact = false }: CropSwitcherProps) {
  const { crops, selectedCropId, setSelectedCropId } = useAgriApp();

  return (
    <div className={cn("rounded-lg border bg-card", compact ? "p-2" : "p-3")}>
      {!compact ? (
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary">
            <Sprout className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              作物表示
            </p>
            <p className="text-sm font-medium text-foreground">作物ごとに表示を切り替え</p>
          </div>
        </div>
      ) : null}
      <div className={cn("flex gap-2 overflow-x-auto", compact ? "pb-1" : "flex-wrap")}>
        <button
          type="button"
          onClick={() => setSelectedCropId("all")}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors",
            selectedCropId === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background hover:bg-muted"
          )}
        >
          全作物
        </button>
        {crops.map((crop) => (
          <button
            key={crop.id}
            type="button"
            onClick={() => setSelectedCropId(crop.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors",
              selectedCropId === crop.id ? crop.surfaceClass : "border-border bg-background hover:bg-muted"
            )}
          >
            <span className="font-medium">{crop.name}</span>
            {!compact && (
              <Badge variant="outline" className="ml-2 border-current/25 bg-transparent text-[10px]">
                {crop.aiEnabled ? crop.pricingTier : "記録無料"}
              </Badge>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
