"use client";

import { Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useViewerTimeZone } from "@/components/calendar/hour-view";
import { CopyField } from "@/components/participate/board";
import {
  AnswersSection,
  DetailsSection,
  issuesToErrors,
  PrivacySection,
  WhenSection,
  type Errors,
  type FormState,
} from "@/components/plan-form/sections";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "@/i18n/navigation";
import type { ClientPlan } from "@/lib/client-plan";
import { formatCell, formatCellShort } from "@/lib/format";
import { colorValue, createPlanSchema } from "@/lib/plan-schema";
import {
  closePlan,
  deleteParticipant,
  deletePlan,
  regenerateSlug,
  reopenPlan,
  updatePlan,
} from "@/server/actions/plans";

export type ManageData = {
  plan: ClientPlan;
  shareUrl: string;
  participants: {
    id: string;
    name: string;
    email: string | null;
    linked: boolean;
  }[];
  responses: { participantId: string; cell: string; optionId: string }[];
  /** Cells with at least one answer, ordered by date. */
  cells: string[];
  scores: Record<string, number>;
  best: string[];
  form: FormState;
  today: string;
};

function useCellLabel(plan: ClientPlan, short = false) {
  const locale = useLocale();
  const tz = useViewerTimeZone(plan.grid.timezone);
  return (cell: string) =>
    short
      ? formatCellShort(plan.grid, cell, locale, tz)
      : formatCell(plan.grid, cell, locale, tz);
}

export function ShareRow({ url }: { url: string }) {
  return <CopyField value={url} />;
}

export function ResponsesTable({ data }: { data: ManageData }) {
  const t = useTranslations("manage.table");
  const label = useCellLabel(data.plan, true);
  const fullLabel = useCellLabel(data.plan);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const options = new Map(data.plan.options.map((o) => [o.id, o]));
  const byParticipant = new Map<string, Map<string, string>>();
  for (const r of data.responses) {
    if (!byParticipant.has(r.participantId))
      byParticipant.set(r.participantId, new Map());
    byParticipant.get(r.participantId)!.set(r.cell, r.optionId);
  }
  const best = new Set(data.best);

  if (data.participants.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
        {t("empty")}
      </p>
    );
  }

  return (
    <>
      <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {data.plan.options.map((o) => (
          <li key={o.id} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-3 rounded-sm"
              style={{ backgroundColor: colorValue(o.color) }}
            />
            {o.label}
          </li>
        ))}
        {best.size > 0 ? (
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-hue" />
            {t("best")}
          </li>
        ) : null}
      </ul>
      <div
        className="overflow-x-auto overscroll-x-contain rounded-lg border border-border bg-card"
        tabIndex={0}
        aria-label={t("scroll")}
      >
        <table className="num w-max min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="sticky left-0 z-10 min-w-28 bg-card px-3 py-2 text-left text-xs font-normal text-muted-foreground sm:min-w-40"
              >
                {t("participant")}
              </th>
              {data.cells.map((c) => (
                <th
                  key={c}
                  scope="col"
                  className="px-1 py-2 text-xs font-normal text-muted-foreground"
                >
                  <span className="flex w-14 flex-col items-center gap-1 leading-tight first-letter:uppercase sm:w-20">
                    <span
                      className="line-clamp-3 text-center"
                      title={fullLabel(c)}
                    >
                      {label(c)}
                    </span>
                    {best.has(c) ? (
                      <span
                        className="size-1.5 rounded-full bg-hue"
                        title={t("best")}
                      />
                    ) : null}
                  </span>
                </th>
              ))}
              <th scope="col" className="w-12" />
            </tr>
          </thead>
          <tbody>
            {data.participants.map((p) => {
              const answers = byParticipant.get(p.id);
              return (
                <tr
                  key={p.id}
                  className="border-b border-[var(--rule)] last:border-b-0"
                >
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium"
                  >
                    <span className="block max-w-28 truncate sm:max-w-40">
                      {p.name}
                    </span>
                    {p.email ? (
                      <span className="block max-w-28 truncate text-xs font-normal text-muted-foreground sm:max-w-40">
                        {p.email}
                      </span>
                    ) : null}
                  </th>
                  {data.cells.map((c) => {
                    const o = answers?.get(c)
                      ? options.get(answers.get(c)!)
                      : undefined;
                    return (
                      <td key={c} className="px-1 py-2 text-center">
                        {o ? (
                          <span
                            className="mx-auto block size-6 rounded-sm"
                            style={{ backgroundColor: colorValue(o.color) }}
                            title={o.label}
                            aria-label={o.label}
                            role="img"
                          />
                        ) : (
                          <span
                            className="text-muted-foreground"
                            aria-label={t("noAnswer")}
                          >
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-1">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("delete", { name: p.name })}
                        >
                          <Trash2 />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t("deleteTitle", { name: p.name })}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("deleteBody")}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                          <AlertDialogAction
                            disabled={pending}
                            onClick={() =>
                              startTransition(async () => {
                                const res = await deleteParticipant(
                                  data.plan.id,
                                  p.id,
                                );
                                if (res.ok) toast.success(t("deleted"));
                                else toast.error(res.error);
                                router.refresh();
                              })
                            }
                          >
                            {t("confirmDelete")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-border">
              <th
                scope="row"
                className="sticky left-0 z-10 bg-card px-3 py-2 text-left text-xs font-normal text-muted-foreground"
              >
                {t("score")}
              </th>
              {data.cells.map((c) => (
                <td key={c} className="px-1 py-2 text-center text-xs">
                  {data.scores[c] ?? 0}
                </td>
              ))}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

export function ClosePanel({ data }: { data: ManageData }) {
  const t = useTranslations("manage.close");
  const te = useTranslations("errors");
  const label = useCellLabel(data.plan);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const ranked = [...data.cells].sort(
    (a, b) => (data.scores[b] ?? 0) - (data.scores[a] ?? 0) || (a < b ? -1 : 1),
  );
  const [choice, setChoice] = useState(data.best[0] ?? ranked[0] ?? "");

  if (data.plan.status === "closed") {
    return (
      <div className="grid gap-3">
        <p className="text-sm">
          {t("closedOn")}{" "}
          <strong className="font-medium first-letter:uppercase">
            {data.plan.finalCell ? label(data.plan.finalCell) : "—"}
          </strong>
        </p>
        <div>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await reopenPlan(data.plan.id);
                if (!res.ok) toast.error(te(res.error as "server"));
                else toast.success(t("reopened"));
                router.refresh();
              })
            }
          >
            {t("reopen")}
          </Button>
        </div>
      </div>
    );
  }
  if (ranked.length === 0)
    return <p className="text-sm text-muted-foreground">{t("nothing")}</p>;
  return (
    <div className="grid gap-3">
      <div className="grid gap-2 text-sm">
        <label htmlFor="final-choice" className="font-medium">
          {t("pick")}
        </label>
        <Select value={choice} onValueChange={setChoice}>
          <SelectTrigger
            id="final-choice"
            className="w-full bg-card data-[size=default]:h-10"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ranked.map((c) => (
              <SelectItem key={c} value={c}>
                {label(c)} · {t("points", { score: data.scores[c] ?? 0 })}
                {data.best.includes(c) ? ` · ${t("best")}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Button
          disabled={pending || !choice}
          onClick={() =>
            startTransition(async () => {
              const res = await closePlan(data.plan.id, choice);
              if (!res.ok) toast.error(te(res.error as "server"));
              else toast.success(t("closed"));
              router.refresh();
            })
          }
        >
          {t("action")}
        </Button>
        <p className="mt-2 text-sm text-muted-foreground">{t("note")}</p>
      </div>
    </div>
  );
}

export function EditPanel({
  data,
  hasResponses,
}: {
  data: ManageData;
  hasResponses: boolean;
}) {
  const t = useTranslations("manage.edit");
  const te = useTranslations("errors");
  const router = useRouter();
  const [state, setState] = useState<FormState>(data.form);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();
  const [confirmRemove, setConfirmRemove] = useState<string[] | null>(null);

  const submit = (confirmRemoveDates = false) => {
    const parsed = createPlanSchema.safeParse(state);
    if (!parsed.success) {
      setErrors(issuesToErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    startTransition(async () => {
      const res = await updatePlan(data.plan.id, {
        ...state,
        confirmRemoveDates,
      });
      if (!res.ok) {
        if (res.error === "confirm_remove_dates") {
          setConfirmRemove(res.issues ?? []);
          return;
        }
        toast.error(te(res.error as "server"));
        return;
      }
      setConfirmRemove(null);
      toast.success(t("saved"));
      router.refresh();
    });
  };

  return (
    <form
      className="grid gap-10"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      noValidate
    >
      <DetailsSection
        value={state.details}
        onChange={(details) => setState({ ...state, details })}
        errors={errors}
      />
      <WhenSection
        value={state.when}
        onChange={(when) => setState({ ...state, when })}
        errors={errors}
        today={data.today}
        structureLocked={hasResponses}
        lockedDates={data.form.when.dates}
      />
      <AnswersSection
        value={state.answers}
        onChange={(answers) => setState({ ...state, answers })}
        errors={errors}
        structureLocked={hasResponses}
      />
      <PrivacySection
        value={state.privacy}
        onChange={(privacy) => setState({ ...state, privacy })}
      />
      <div>
        <Button type="submit" disabled={pending}>
          {t("save")}
        </Button>
      </div>
      <AlertDialog
        open={!!confirmRemove}
        onOpenChange={(o) => !o && setConfirmRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("removeDatesTitle", { count: confirmRemove?.length ?? 0 })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("removeDatesBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => submit(true)}>
              {t("removeDatesConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

export function DangerPanel({ data }: { data: ManageData }) {
  const t = useTranslations("manage.danger");
  const te = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [typed, setTyped] = useState("");
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <p className="text-sm font-medium">{t("regenerate")}</p>
        <p className="text-sm text-muted-foreground">{t("regenerateBody")}</p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="secondary" className="justify-self-start">
              {t("regenerateAction")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("regenerateTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("regenerateBody")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  startTransition(async () => {
                    const res = await regenerateSlug(data.plan.id);
                    if (!res.ok) toast.error(te(res.error as "server"));
                    else toast.success(t("regenerated"));
                    router.refresh();
                  })
                }
              >
                {t("regenerateAction")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <div className="grid gap-2">
        <p className="text-sm font-medium">{t("delete")}</p>
        <p className="text-sm text-muted-foreground">{t("deleteBody")}</p>
        <AlertDialog onOpenChange={() => setTyped("")}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="justify-self-start">
              {t("deleteAction")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("deleteConfirm", { title: data.plan.title })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              aria-label={t("typeTitle")}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
            />
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={pending || typed.trim() !== data.plan.title.trim()}
                onClick={() =>
                  startTransition(async () => {
                    const res = await deletePlan(data.plan.id, typed);
                    if (!res.ok) {
                      toast.error(te(res.error as "server"));
                      return;
                    }
                    toast.success(t("deleted"));
                    router.push("/dashboard");
                  })
                }
              >
                {t("deleteAction")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
