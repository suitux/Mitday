"use client";

import { Check, Copy } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { CellSheet } from "@/components/calendar/cell-sheet";
import { DayView } from "@/components/calendar/day-view";
import { HourView } from "@/components/calendar/hour-view";
import { Palette } from "@/components/calendar/palette";
import { SlotView } from "@/components/calendar/slot-view";
import type { ViewProps } from "@/components/calendar/types";
import { usePaint, type Brush } from "@/components/calendar/use-paint";
import { Button } from "@/components/ui/button";
import type { Answers, BoardProps } from "@/lib/client-plan";
import { colorValue } from "@/lib/plan-schema";
import { saveResponses } from "@/server/actions/participate";

function sameAnswers(a: Answers, b: Answers) {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => a[k] === b[k]);
}

export function Board({
  plan,
  me,
  others,
  personalLink: initialLink,
  nowIso,
}: BoardProps) {
  const t = useTranslations("participate");
  const te = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const closed = plan.status === "closed";

  const [saved, setSaved] = useState<Answers>(me?.answers ?? {});
  const [answers, setAnswersState] = useState<Answers>(me?.answers ?? {});
  const [brush, setBrush] = useState<Brush>(() =>
    plan.options[0]
      ? { kind: "option", optionId: plan.options[0].id }
      : { kind: "inspect" },
  );
  const [inspectCell, setInspectCell] = useState<string | null>(null);
  const [personalLink, setPersonalLink] = useState<string | null>(null);
  const [knownLink] = useState(initialLink);
  const [pending, startTransition] = useTransition();
  const dirty = !sameAnswers(answers, saved);

  // Server data refreshed (focus revalidation): adopt it unless there are local edits.
  const serverAnswers = me?.answers;
  const [lastServer, setLastServer] = useState(serverAnswers);
  if (serverAnswers && serverAnswers !== lastServer) {
    // Adjust state during render (React's recommended pattern for prop changes).
    setLastServer(serverAnswers);
    if (sameAnswers(answers, saved)) setAnswersState(serverAnswers);
    setSaved(serverAnswers);
  }

  // No real time: refetch when the tab regains focus.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [router]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const setAnswers = useCallback(
    (update: (prev: Answers) => Answers) => setAnswersState(update),
    [],
  );
  const canInspect = others.mode !== "hidden";
  const { cellProps, surfaceProps } = usePaint({
    answers,
    setAnswers,
    brush,
    disabled: closed || !me,
    onInspect: canInspect ? setInspectCell : undefined,
  });

  const optionById = useMemo(
    () => new Map(plan.options.map((o) => [o.id, o])),
    [plan.options],
  );
  const heatColor = useMemo(() => {
    const top = [...plan.options].sort((a, b) => b.weight - a.weight)[0];
    return colorValue(top?.color ?? "green");
  }, [plan.options]);
  const best = useMemo(
    () => new Set(others.mode !== "hidden" ? others.best : []),
    [others],
  );

  const visualFor: ViewProps["visualFor"] = (cell) => {
    const mine = answers[cell];
    const o = mine ? optionById.get(mine) : undefined;
    const agg = others.mode !== "hidden" ? others.cells[cell] : undefined;
    return {
      mineColor: o ? colorValue(o.color) : undefined,
      heat: agg ? { color: heatColor, intensity: agg.intensity } : undefined,
      best: best.has(cell),
      final: plan.finalCell === cell,
    };
  };
  const stateFor: ViewProps["stateFor"] = (cell) => {
    const parts: string[] = [];
    const mine = answers[cell];
    if (mine) parts.push(optionById.get(mine)?.label ?? "");
    if (others.mode !== "hidden") {
      const agg = others.cells[cell];
      if (agg) {
        const n = Object.values(agg.counts).reduce((a, b) => a + b, 0);
        parts.push(
          t("answeredShort", { count: n, total: others.participants }),
        );
      }
      if (best.has(cell)) parts.push(t("bestShort"));
    }
    return parts.join(" · ");
  };

  const viewProps: ViewProps = {
    plan,
    now,
    cellProps,
    surfaceProps,
    visualFor,
    stateFor,
    readOnly: closed || !me,
  };

  const save = () =>
    startTransition(async () => {
      const res = await saveResponses(plan.slug, answers, locale);
      if (!res.ok) {
        toast.error(te(res.error as "server"));
        return;
      }
      setSaved(answers);
      toast.success(t("saved"));
      if (res.data.firstSave && res.data.personalLink)
        setPersonalLink(res.data.personalLink);
      router.refresh();
    });

  return (
    <div className="pb-28">
      {!closed && me ? (
        <div className="mb-5">
          <Palette
            options={plan.options}
            brush={brush}
            onBrush={setBrush}
            allowInspect={canInspect}
          />
          <p className="mt-2 text-sm text-muted-foreground">
            {brush.kind === "inspect"
              ? t("inspectHint")
              : canInspect
                ? `${t("paintHint")} ${t("pressHint")}`
                : t("paintHint")}
          </p>
        </div>
      ) : canInspect ? (
        <p className="mb-4 text-sm text-muted-foreground">{t("tapToSee")}</p>
      ) : null}

      {personalLink ? (
        <PersonalLinkCard
          link={personalLink}
          onDismiss={() => setPersonalLink(null)}
        />
      ) : null}

      <div className="rounded-lg border border-border bg-card p-3 sm:p-5">
        {plan.grid.granularity === "day" ? <DayView {...viewProps} /> : null}
        {plan.grid.granularity === "slot" ? <SlotView {...viewProps} /> : null}
        {plan.grid.granularity === "hour" ? <HourView {...viewProps} /> : null}
      </div>

      <Legend plan={plan} others={others} heatColor={heatColor} />

      {knownLink && !personalLink && me ? (
        <details className="mt-6 text-sm text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">
            {t("personalLinkAgain")}
          </summary>
          <CopyField value={knownLink} className="mt-2" />
        </details>
      ) : null}

      <CellSheet
        plan={plan}
        others={others}
        cell={inspectCell}
        onClose={() => setInspectCell(null)}
      />

      {!closed && me ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p className="text-sm" aria-live="polite">
              {dirty ? (
                <span className="flex items-center gap-2">
                  <span
                    className="size-2 rounded-full bg-foreground"
                    aria-hidden="true"
                  />
                  {t("unsaved")}
                </span>
              ) : (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Check className="size-4" aria-hidden="true" />
                  {me.hasSaved || Object.keys(saved).length > 0
                    ? t("allSaved")
                    : t("nothingYet")}
                </span>
              )}
            </p>
            <div className="flex gap-2">
              {dirty ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAnswersState(saved)}
                  disabled={pending}
                >
                  {t("discard")}
                </Button>
              ) : null}
              <Button
                type="button"
                onClick={save}
                disabled={!dirty || pending}
                className="min-w-28"
              >
                {pending ? t("saving") : t("save")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Legend({
  plan,
  others,
  heatColor,
}: Pick<BoardProps, "plan" | "others"> & { heatColor: string }) {
  const t = useTranslations("participate");
  if (others.mode === "hidden") {
    return (
      <p className="mt-3 text-sm text-muted-foreground">{t("hiddenNote")}</p>
    );
  }
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
      <span className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="size-4 rounded-sm border border-border"
          style={{
            backgroundColor: `color-mix(in srgb, ${heatColor} calc(var(--heat) * 100%), var(--card))`,
          }}
        />
        {t("legendOthers", { count: others.participants })}
      </span>
      {others.best.length > 0 && plan.status === "open" ? (
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2 rounded-full bg-hue" />
          {t("legendBest")}
        </span>
      ) : null}
    </div>
  );
}

export function CopyField({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const t = useTranslations("common");
  const [copied, setCopied] = useState(false);
  return (
    <div className={`flex gap-2 ${className ?? ""}`}>
      <input
        readOnly
        value={value}
        aria-label={t("link")}
        onFocus={(e) => e.currentTarget.select()}
        className="h-10 min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-sm text-foreground"
      />
      <Button
        type="button"
        variant="secondary"
        className="h-10"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? <Check /> : <Copy />}
        {copied ? t("copied") : t("copy")}
      </Button>
    </div>
  );
}

function PersonalLinkCard({
  link,
  onDismiss,
}: {
  link: string;
  onDismiss: () => void;
}) {
  const t = useTranslations("participate");
  return (
    <section
      className="mb-5 rounded-lg border border-foreground bg-card p-4"
      aria-live="polite"
    >
      <h2 className="text-base font-medium">{t("personalLinkTitle")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("personalLinkBody")}
      </p>
      <CopyField value={link} className="mt-3" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-2 -ml-2"
        onClick={onDismiss}
      >
        {t("personalLinkDone")}
      </Button>
    </section>
  );
}
