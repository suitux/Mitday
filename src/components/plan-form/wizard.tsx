"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { todayIn } from "@/lib/grid";
import {
  answersSchema,
  detailsSchema,
  privacySchema,
  whenSchema,
} from "@/lib/plan-schema";
import { cn } from "@/lib/utils";
import { createPlan } from "@/server/actions/plans";
import {
  AnswersSection,
  DetailsSection,
  issuesToErrors,
  PrivacySection,
  toInput,
  WhenSection,
  type Errors,
  type FormState,
} from "./sections";

const STEPS = ["details", "when", "answers", "privacy"] as const;

function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Madrid";
  } catch {
    return "Europe/Madrid";
  }
}

export function PlanWizard({
  defaults,
}: {
  defaults: { yes: string; no: string; lunch: string; dinner: string };
}) {
  const t = useTranslations("wizard");
  const te = useTranslations("errors");
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<FormState>(() => ({
    details: { title: "", description: "" },
    when: {
      dateMode: "range",
      rangeStart: null,
      rangeEnd: null,
      dates: [],
      granularity: "day",
      slots: [{ label: defaults.lunch }, { label: defaults.dinner }],
      hourInterval: 60,
      dayStartMinute: 9 * 60,
      dayEndMinute: 23 * 60,
      timezone: browserTimeZone(),
    },
    answers: {
      options: [
        { label: defaults.yes, color: "green", weight: 1 },
        { label: defaults.no, color: "red", weight: 0 },
      ],
    },
    privacy: { visibility: "full", notifyOnResponse: true },
  }));
  const [today] = useState(() => todayIn(browserTimeZone()));

  const validate = (i: number): boolean => {
    const key = STEPS[i]!;
    const schema = {
      details: detailsSchema,
      when: whenSchema,
      answers: answersSchema,
      privacy: privacySchema,
    }[key];
    const r = schema.safeParse(state[key]);
    if (r.success) {
      setErrors({});
      return true;
    }
    setErrors(issuesToErrors(r.error.issues, key));
    return false;
  };

  const next = () => {
    if (!validate(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0 });
  };

  const submit = () => {
    for (let i = 0; i < STEPS.length; i++) {
      if (!validate(i)) {
        setStep(i);
        return;
      }
    }
    startTransition(async () => {
      const res = await createPlan(toInput(state));
      if (!res.ok) {
        toast.error(te(res.error as "server"));
        return;
      }
      router.push(`/plans/${res.data.id}/created`);
    });
  };

  return (
    <div>
      <ol className="mb-8 grid grid-cols-4 gap-2" aria-label={t("progress")}>
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              disabled={i > step}
              onClick={() => i < step && setStep(i)}
              aria-current={i === step ? "step" : undefined}
              className="group w-full text-left disabled:cursor-default"
            >
              <span
                className={cn(
                  "block h-1 rounded-full",
                  i <= step ? "bg-foreground" : "bg-border",
                )}
              />
              <span
                className={cn(
                  "mt-2 block truncate text-xs sm:text-sm",
                  i === step
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {t(`steps.${s}`)}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step < STEPS.length - 1) next();
          else submit();
        }}
        noValidate
      >
        {step === 0 ? (
          <DetailsSection
            value={state.details}
            onChange={(details) => setState({ ...state, details })}
            errors={errors}
          />
        ) : null}
        {step === 1 ? (
          <WhenSection
            value={state.when}
            onChange={(when) => setState({ ...state, when })}
            errors={errors}
            today={today}
          />
        ) : null}
        {step === 2 ? (
          <AnswersSection
            value={state.answers}
            onChange={(answers) => setState({ ...state, answers })}
            errors={errors}
          />
        ) : null}
        {step === 3 ? (
          <PrivacySection
            value={state.privacy}
            onChange={(privacy) => setState({ ...state, privacy })}
          />
        ) : null}

        <div className="mt-10 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            disabled={step === 0 || pending}
            onClick={() => setStep(step - 1)}
          >
            {t("back")}
          </Button>
          <Button type="submit" disabled={pending} className="min-w-32">
            {step < STEPS.length - 1
              ? t("next")
              : pending
                ? t("creating")
                : t("create")}
          </Button>
        </div>
      </form>
    </div>
  );
}
