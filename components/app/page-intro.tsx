import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

type PageIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  scopeLabel?: string;
};

export function PageIntro({ eyebrow, title, description, actions, scopeLabel }: PageIntroProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {scopeLabel ? <Badge variant="secondary">{scopeLabel}</Badge> : null}
        </div>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
