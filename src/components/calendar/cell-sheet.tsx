"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ClientPlan } from "@/lib/client-plan";
import { formatCell } from "@/lib/format";
import type { OthersView } from "@/lib/plan-view";
import { colorValue } from "@/lib/plan-schema";
import { useViewerTimeZone } from "./hour-view";

export function CellSheet({
  plan,
  others,
  cell,
  onClose,
}: {
  plan: ClientPlan;
  others: OthersView;
  cell: string | null;
  onClose: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations("participate");
  const tz = useViewerTimeZone(plan.grid.timezone);
  const data =
    cell && others.mode !== "hidden" ? others.cells[cell] : undefined;
  const total = others.mode !== "hidden" ? others.participants : 0;
  const answered = data
    ? Object.values(data.counts).reduce((a, b) => a + b, 0)
    : 0;
  return (
    <Sheet open={!!cell} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[80dvh] max-w-lg overflow-y-auto rounded-t-xl"
      >
        <SheetHeader>
          <SheetTitle className="first-letter:uppercase">
            {cell ? formatCell(plan.grid, cell, locale, tz) : ""}
          </SheetTitle>
          <SheetDescription className="num">
            {t("answeredOf", { count: answered, total })}
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 px-4 pb-6">
          {plan.options.map((o) => {
            const count = data?.counts[o.id] ?? 0;
            const names = data?.names?.[o.id] ?? [];
            return (
              <section key={o.id}>
                <h4 className="flex items-center gap-2 text-sm font-medium">
                  <span
                    aria-hidden="true"
                    className="size-3 rounded-sm"
                    style={{ backgroundColor: colorValue(o.color) }}
                  />
                  {o.label}
                  <span className="num font-normal text-muted-foreground">
                    {count}
                  </span>
                </h4>
                {others.mode === "full" ? (
                  names.length > 0 ? (
                    <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 pl-5 text-sm">
                      {names.map((n, i) => (
                        <li key={`${n}-${i}`}>{n}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 pl-5 text-sm text-muted-foreground">—</p>
                  )
                ) : null}
              </section>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
