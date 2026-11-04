"use client";

import { Minus, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, type ReactNode } from "react";
import { CellButton } from "@/components/calendar/cell-button";
import {
  MonthGrid,
  monthOf,
  type MonthKey,
} from "@/components/calendar/month-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, minutesToHHMM } from "@/lib/format";
import {
  addDays,
  diffDays,
  MAX_RANGE_DAYS,
  OPEN_WINDOW_DAYS,
} from "@/lib/grid";
import {
  OPTION_COLORS,
  type CreatePlanInput,
  type OptionColor,
} from "@/lib/plan-schema";
import { cn } from "@/lib/utils";

export type FormState = {
  details: { title: string; description: string };
  when: {
    dateMode: "range" | "dates" | "open";
    rangeStart: string | null;
    rangeEnd: string | null;
    dates: string[];
    granularity: "day" | "slot" | "hour";
    slots: { id?: string; label: string }[];
    hourInterval: 30 | 60;
    dayStartMinute: number;
    dayEndMinute: number;
    timezone: string;
  };
  answers: {
    options: {
      id?: string;
      label: string;
      color: OptionColor;
      weight: number;
    }[];
  };
  privacy: {
    visibility: "full" | "aggregate" | "hidden";
    notifyOnResponse: boolean;
  };
};

export type Errors = Record<string, string | undefined>;

export function toInput(s: FormState): CreatePlanInput {
  return s as CreatePlanInput;
}

/** Issues from zod → { "when.rangeEnd": "range_order" }. */
export function issuesToErrors(
  issues: { path: PropertyKey[]; message: string }[],
  prefix = "",
): Errors {
  const out: Errors = {};
  for (const i of issues) {
    const key = [prefix, ...i.path.map(String)].filter(Boolean).join(".");
    out[key] ??= i.message;
  }
  return out;
}

function FieldError({ id, code }: { id: string; code?: string }) {
  const t = useTranslations("wizard.errors");
  if (!code) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-destructive">
      {t.has(code as "generic") ? t(code as "generic") : t("generic")}
    </p>
  );
}

function errorFor(errors: Errors, prefix: string) {
  return Object.entries(errors).find(
    ([k]) => k === prefix || k.startsWith(`${prefix}.`),
  )?.[1];
}

function ChoiceGroup<T extends string>({
  name,
  value,
  onChange,
  options,
  disabled,
  legend,
}: {
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; title: string; body?: string }[];
  disabled?: boolean;
  legend: string;
}) {
  return (
    <fieldset disabled={disabled} className="disabled:opacity-60">
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "flex cursor-pointer flex-col rounded-md border border-border bg-card p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
              value === o.value ? "border-foreground" : "hover:border-input",
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            <span className="text-sm font-medium">{o.title}</span>
            {o.body ? (
              <span className="mt-0.5 text-sm text-muted-foreground">
                {o.body}
              </span>
            ) : null}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------

export function DetailsSection({
  value,
  onChange,
  errors,
}: {
  value: FormState["details"];
  onChange: (v: FormState["details"]) => void;
  errors: Errors;
}) {
  const t = useTranslations("wizard.details");
  return (
    <Section title={t("title")}>
      <div>
        <Label htmlFor="plan-title">{t("name")}</Label>
        <Input
          id="plan-title"
          className="mt-2 h-11"
          value={value.title}
          maxLength={80}
          placeholder={t("namePlaceholder")}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          aria-invalid={!!errors["details.title"] || undefined}
          aria-describedby="plan-title-hint plan-title-error"
          autoFocus
        />
        <p
          id="plan-title-hint"
          className="num mt-1.5 text-xs text-muted-foreground"
        >
          {value.title.length}/80
        </p>
        <FieldError id="plan-title-error" code={errors["details.title"]} />
      </div>
      <div>
        <Label htmlFor="plan-description">
          {t("description")}{" "}
          <span className="font-normal text-muted-foreground">
            {t("optional")}
          </span>
        </Label>
        <Textarea
          id="plan-description"
          className="mt-2 min-h-24"
          value={value.description}
          maxLength={500}
          placeholder={t("descriptionPlaceholder")}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          aria-describedby="plan-description-hint plan-description-error"
        />
        <p
          id="plan-description-hint"
          className="num mt-1.5 text-xs text-muted-foreground"
        >
          {value.description.length}/500
        </p>
        <FieldError
          id="plan-description-error"
          code={errors["details.description"]}
        />
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------

/** Month picker shared with the participant's month view. */
export function DatesPicker({
  mode,
  value,
  onChange,
  today,
  lockedDates = [],
}: {
  mode: "range" | "dates";
  value: {
    rangeStart: string | null;
    rangeEnd: string | null;
    dates: string[];
  };
  onChange: (v: {
    rangeStart: string | null;
    rangeEnd: string | null;
    dates: string[];
  }) => void;
  today: string;
  lockedDates?: string[];
}) {
  const locale = useLocale();
  const t = useTranslations("wizard.when");
  const start =
    mode === "range" ? value.rangeStart : [...value.dates].sort()[0];
  const [month, setMonth] = useState<MonthKey>(monthOf(start ?? today));
  const maxDay = addDays(today, OPEN_WINDOW_DAYS + 365);
  const selected = new Set(value.dates);

  const inRange = (d: string) => {
    if (!value.rangeStart) return false;
    const end = value.rangeEnd ?? value.rangeStart;
    return d >= value.rangeStart && d <= end;
  };

  const tap = (d: string) => {
    if (mode === "dates") {
      const next = selected.has(d)
        ? value.dates.filter((x) => x !== d)
        : [...value.dates, d].sort();
      onChange({ ...value, dates: next });
      return;
    }
    // Range: first tap sets the start, second the end (swapped if earlier).
    if (!value.rangeStart || value.rangeEnd) {
      onChange({ ...value, rangeStart: d, rangeEnd: null });
    } else if (d < value.rangeStart) {
      onChange({ ...value, rangeStart: d, rangeEnd: value.rangeStart });
    } else {
      onChange({ ...value, rangeEnd: d });
    }
  };

  let summary = "";
  if (mode === "range" && value.rangeStart) {
    summary = value.rangeEnd
      ? t("rangeSummary", {
          start: formatDate(value.rangeStart, locale, "short"),
          end: formatDate(value.rangeEnd, locale, "short"),
          count: diffDays(value.rangeStart, value.rangeEnd) + 1,
        })
      : t("rangePickEnd", {
          start: formatDate(value.rangeStart, locale, "short"),
        });
  } else if (mode === "dates") {
    summary = t("datesSummary", { count: value.dates.length });
  } else {
    summary = t("rangePickStart");
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
      <MonthGrid
        month={month}
        onMonthChange={setMonth}
        minMonth={monthOf(today)}
        maxMonth={monthOf(maxDay)}
        renderDay={(d) => {
          const past =
            d < today && !selected.has(d) && !lockedDates.includes(d);
          const on = mode === "dates" ? selected.has(d) : inRange(d);
          const edge =
            mode === "range" &&
            (d === value.rangeStart || d === value.rangeEnd);
          return (
            <CellButton
              visual={{}}
              disabled={past}
              aria-pressed={on}
              aria-label={formatDate(d, locale)}
              className={cn(
                on &&
                  (mode === "dates" || edge
                    ? "border-transparent bg-foreground font-semibold text-background hover:border-transparent"
                    : "border-transparent bg-foreground/10"),
              )}
              onClick={() => tap(d)}
            >
              {Number(d.slice(8, 10))}
            </CellButton>
          );
        }}
      />
      <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
        {summary}
      </p>
    </div>
  );
}

function useTimeZones() {
  return useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return ["Europe/Madrid", "Europe/London", "America/New_York", "UTC"];
    }
  }, []);
}

export function WhenSection({
  value,
  onChange,
  errors,
  today,
  structureLocked = false,
  lockedDates,
}: {
  value: FormState["when"];
  onChange: (v: FormState["when"]) => void;
  errors: Errors;
  today: string;
  structureLocked?: boolean;
  lockedDates?: string[];
}) {
  const t = useTranslations("wizard.when");
  const zones = useTimeZones();
  const step = value.hourInterval;
  const times = Array.from({ length: 1440 / step + 1 }, (_, i) => i * step);
  const datesEditable = !structureLocked || value.dateMode === "dates";

  return (
    <Section
      title={t("title")}
      description={structureLocked ? t("lockedNote") : undefined}
    >
      <ChoiceGroup
        legend={t("dateMode")}
        name="dateMode"
        value={value.dateMode}
        disabled={structureLocked}
        onChange={(dateMode) => onChange({ ...value, dateMode })}
        options={[
          {
            value: "range",
            title: t("range"),
            body: t("rangeBody", { max: MAX_RANGE_DAYS }),
          },
          { value: "dates", title: t("dates"), body: t("datesBody") },
          { value: "open", title: t("open"), body: t("openBody") },
        ]}
      />
      {value.dateMode !== "open" && datesEditable ? (
        <div>
          <DatesPicker
            mode={value.dateMode}
            today={today}
            lockedDates={lockedDates}
            value={{
              rangeStart: value.rangeStart,
              rangeEnd: value.rangeEnd,
              dates: value.dates,
            }}
            onChange={(v) => onChange({ ...value, ...v })}
          />
          <FieldError
            id="when-dates-error"
            code={
              errorFor(errors, "when.rangeEnd") ??
              errorFor(errors, "when.dates")
            }
          />
        </div>
      ) : null}

      <ChoiceGroup
        legend={t("granularity")}
        name="granularity"
        value={value.granularity}
        disabled={structureLocked}
        onChange={(granularity) => onChange({ ...value, granularity })}
        options={[
          { value: "day", title: t("day"), body: t("dayBody") },
          { value: "slot", title: t("slot"), body: t("slotBody") },
          { value: "hour", title: t("hour"), body: t("hourBody") },
        ]}
      />

      {value.granularity === "slot" ? (
        <div>
          <p className="mb-2 text-sm font-medium">{t("slots")}</p>
          <ul className="grid gap-2">
            {value.slots.map((s, i) => (
              <li key={s.id ?? `new-${i}`} className="flex gap-2">
                <Input
                  className="h-10"
                  value={s.label}
                  maxLength={30}
                  aria-label={t("slotLabel", { n: i + 1 })}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      slots: value.slots.map((x, j) =>
                        j === i ? { ...x, label: e.target.value } : x,
                      ),
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-10"
                  aria-label={t("removeSlot")}
                  disabled={structureLocked || value.slots.length <= 1}
                  onClick={() =>
                    onChange({
                      ...value,
                      slots: value.slots.filter((_, j) => j !== i),
                    })
                  }
                >
                  <Minus />
                </Button>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="ghost"
            className="mt-2 -ml-2"
            disabled={structureLocked || value.slots.length >= 6}
            onClick={() =>
              onChange({ ...value, slots: [...value.slots, { label: "" }] })
            }
          >
            <Plus /> {t("addSlot")}
          </Button>
          <p className="text-xs text-muted-foreground">{t("slotsHint")}</p>
          <FieldError
            id="when-slots-error"
            code={errorFor(errors, "when.slots")}
          />
        </div>
      ) : null}

      {value.granularity === "hour" ? (
        <fieldset
          disabled={structureLocked}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div>
            <Label htmlFor="interval">{t("interval")}</Label>
            <Select
              value={String(value.hourInterval)}
              onValueChange={(v) => {
                const hourInterval = Number(v) as 30 | 60;
                const snap = (m: number) =>
                  Math.round(m / hourInterval) * hourInterval;
                onChange({
                  ...value,
                  hourInterval,
                  dayStartMinute: snap(value.dayStartMinute),
                  dayEndMinute: snap(value.dayEndMinute),
                });
              }}
            >
              <SelectTrigger
                id="interval"
                className="mt-2 w-full bg-card data-[size=default]:h-10"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">{t("minutes", { n: 30 })}</SelectItem>
                <SelectItem value="60">{t("minutes", { n: 60 })}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="from">{t("from")}</Label>
              <Select
                value={String(value.dayStartMinute)}
                onValueChange={(v) =>
                  onChange({ ...value, dayStartMinute: Number(v) })
                }
              >
                <SelectTrigger
                  id="from"
                  className="num mt-2 w-full bg-card data-[size=default]:h-10"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {times.slice(0, -1).map((m) => (
                    <SelectItem key={m} value={String(m)} className="num">
                      {minutesToHHMM(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="to">{t("to")}</Label>
              <Select
                value={String(value.dayEndMinute)}
                onValueChange={(v) =>
                  onChange({ ...value, dayEndMinute: Number(v) })
                }
              >
                <SelectTrigger
                  id="to"
                  className="num mt-2 w-full bg-card data-[size=default]:h-10"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {times.slice(1).map((m) => (
                    <SelectItem key={m} value={String(m)} className="num">
                      {minutesToHHMM(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="tz">{t("timezone")}</Label>
            <Input
              id="tz"
              list="tz-list"
              className="mt-2 h-10"
              value={value.timezone}
              onChange={(e) => onChange({ ...value, timezone: e.target.value })}
              aria-describedby="tz-hint tz-error"
            />
            <datalist id="tz-list">
              {zones.map((z) => (
                <option key={z} value={z} />
              ))}
            </datalist>
            <p id="tz-hint" className="mt-1.5 text-xs text-muted-foreground">
              {t("timezoneHint")}
            </p>
            <FieldError
              id="tz-error"
              code={errorFor(errors, "when.timezone")}
            />
          </div>
          <FieldError
            id="hours-error"
            code={
              errorFor(errors, "when.dayEndMinute") ??
              errorFor(errors, "when.dayStartMinute")
            }
          />
        </fieldset>
      ) : null}
    </Section>
  );
}

// ---------------------------------------------------------------------------

const WEIGHTS = [1, 0.75, 0.5, 0.25, 0];

export function AnswersSection({
  value,
  onChange,
  errors,
  structureLocked = false,
}: {
  value: FormState["answers"];
  onChange: (v: FormState["answers"]) => void;
  errors: Errors;
  structureLocked?: boolean;
}) {
  const t = useTranslations("wizard.answers");
  const colors = Object.entries(OPTION_COLORS) as [OptionColor, string][];
  const update = (
    i: number,
    patch: Partial<FormState["answers"]["options"][number]>,
  ) =>
    onChange({
      options: value.options.map((o, j) => (j === i ? { ...o, ...patch } : o)),
    });
  return (
    <Section
      title={t("title")}
      description={structureLocked ? t("lockedNote") : t("description")}
    >
      <ul className="grid gap-3">
        {value.options.map((o, i) => (
          <li
            key={o.id ?? `new-${i}`}
            className="grid gap-3 rounded-lg border border-border bg-card p-3"
          >
            <div className="flex gap-2">
              <span
                aria-hidden="true"
                className="mt-2 size-6 shrink-0 rounded-sm"
                style={{ backgroundColor: OPTION_COLORS[o.color] }}
              />
              <Input
                className="h-10"
                value={o.label}
                maxLength={30}
                aria-label={t("label", { n: i + 1 })}
                onChange={(e) => update(i, { label: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10"
                aria-label={t("remove")}
                disabled={structureLocked || value.options.length <= 2}
                onClick={() =>
                  onChange({ options: value.options.filter((_, j) => j !== i) })
                }
              >
                <Minus />
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pl-8">
              <div
                role="radiogroup"
                aria-label={t("color")}
                className="flex flex-wrap gap-1.5"
              >
                {colors.map(([name, hex]) => (
                  <button
                    key={name}
                    type="button"
                    role="radio"
                    aria-checked={o.color === name}
                    aria-label={t(`colors.${name}`)}
                    onClick={() => update(i, { color: name })}
                    className={cn(
                      "size-7 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      o.color === name &&
                        "ring-2 ring-foreground ring-offset-2",
                    )}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Label
                  htmlFor={`weight-${i}`}
                  className="font-normal text-muted-foreground"
                >
                  {t("weight")}
                </Label>
                <Select
                  value={String(o.weight)}
                  disabled={structureLocked}
                  onValueChange={(v) => update(i, { weight: Number(v) })}
                >
                  <SelectTrigger
                    id={`weight-${i}`}
                    className="bg-card data-[size=default]:h-9"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEIGHTS.map((w) => (
                      <SelectItem key={w} value={String(w)}>
                        {t(
                          `weights.${String(w).replace(".", "_")}` as "weights.1",
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div>
        <Button
          type="button"
          variant="ghost"
          className="-ml-2"
          disabled={structureLocked || value.options.length >= 5}
          onClick={() =>
            onChange({
              options: [
                ...value.options,
                { label: "", color: "amber", weight: 0.5 },
              ],
            })
          }
        >
          <Plus /> {t("add")}
        </Button>
        <FieldError id="answers-error" code={errorFor(errors, "answers")} />
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------

export function PrivacySection({
  value,
  onChange,
}: {
  value: FormState["privacy"];
  onChange: (v: FormState["privacy"]) => void;
}) {
  const t = useTranslations("wizard.privacy");
  return (
    <Section title={t("title")}>
      <ChoiceGroup
        legend={t("visibility")}
        name="visibility"
        value={value.visibility}
        onChange={(visibility) => onChange({ ...value, visibility })}
        options={[
          { value: "full", title: t("full"), body: t("fullBody") },
          {
            value: "aggregate",
            title: t("aggregate"),
            body: t("aggregateBody"),
          },
          { value: "hidden", title: t("hidden"), body: t("hiddenBody") },
        ]}
      />
      <label className="flex items-start justify-between gap-4 rounded-md border border-border bg-card p-3">
        <span>
          <span className="block text-sm font-medium">{t("notify")}</span>
          <span className="block text-sm text-muted-foreground">
            {t("notifyBody")}
          </span>
        </span>
        <Switch
          checked={value.notifyOnResponse}
          onCheckedChange={(notifyOnResponse) =>
            onChange({ ...value, notifyOnResponse })
          }
          aria-label={t("notify")}
        />
      </label>
    </Section>
  );
}
