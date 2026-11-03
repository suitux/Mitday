"use client";

import { Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ViewOption } from "@/lib/plan-view";
import { colorValue } from "@/lib/plan-schema";
import { cn } from "@/lib/utils";
import type { Brush } from "./use-paint";

export function Palette({
  options,
  brush,
  onBrush,
  allowInspect,
}: {
  options: ViewOption[];
  brush: Brush;
  onBrush: (b: Brush) => void;
  allowInspect: boolean;
}) {
  const t = useTranslations("participate");
  return (
    <div
      role="radiogroup"
      aria-label={t("palette")}
      className="flex flex-wrap gap-2"
    >
      {options.map((o) => {
        const active = brush.kind === "option" && brush.optionId === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onBrush({ kind: "option", optionId: o.id })}
            className={cn(
              "flex h-10 items-center gap-2 rounded-md border px-3 text-sm transition-colors outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-foreground bg-card font-medium"
                : "border-border bg-card/60 text-muted-foreground hover:text-foreground",
            )}
          >
            <span
              aria-hidden="true"
              className="size-3.5 rounded-sm"
              style={{ backgroundColor: colorValue(o.color) }}
            />
            {o.label}
          </button>
        );
      })}
      {allowInspect ? (
        <button
          type="button"
          role="radio"
          aria-checked={brush.kind === "inspect"}
          onClick={() => onBrush({ kind: "inspect" })}
          className={cn(
            "flex h-10 items-center gap-2 rounded-md border px-3 text-sm transition-colors outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring",
            brush.kind === "inspect"
              ? "border-foreground bg-card font-medium"
              : "border-border bg-card/60 text-muted-foreground hover:text-foreground",
          )}
        >
          <Eye className="size-4" aria-hidden="true" />
          {t("inspect")}
        </button>
      ) : null}
    </div>
  );
}
