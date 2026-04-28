import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
  tone?: "earth" | "leaf" | "sun" | "sky" | "danger";
  className?: string;
};

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  earth: "bg-amber-50 text-amber-700",
  leaf: "bg-emerald-50 text-emerald-700",
  sun: "bg-amber-100 text-amber-700",
  sky: "bg-sky-100 text-sky-700",
  danger: "bg-red-100 text-red-700",
};

export function StatCard({ label, value, detail, icon: Icon, tone = "earth", className }: StatCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
            <p className="mt-2 sm:mt-3 text-xl sm:text-2xl font-bold tracking-tight text-foreground">{value}</p>
            {detail ? <p className="mt-1 text-sm text-muted-foreground">{detail}</p> : null}
          </div>
          <div className={cn("flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg", toneClasses[tone])}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
