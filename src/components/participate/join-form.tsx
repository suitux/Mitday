"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { autoFocusFinePointer } from "@/lib/focus";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { participantNameSchema } from "@/lib/plan-schema";
import { joinPlan, linkGuestParticipant } from "@/server/actions/participate";

export function JoinForm({
  slug,
  defaultName,
  defaultEmail,
}: {
  slug: string;
  defaultName?: string;
  defaultEmail?: string;
}) {
  const t = useTranslations("participate.join");
  const te = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const [name, setName] = useState(defaultName ?? "");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [error, setError] = useState<{
    field: "name" | "email" | "form";
    code: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const parsed = participantNameSchema.safeParse({ name, email });
    if (!parsed.success) {
      const issue = parsed.error.issues[0]!;
      setError({
        field: issue.path[0] === "email" ? "email" : "name",
        code: issue.message,
      });
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await joinPlan(slug, { name, email }, locale);
      if (!res.ok) {
        setError({ field: "form", code: res.error });
        return;
      }
      router.refresh();
    });
  };

  return (
    <form
      className="grid max-w-md gap-4 rounded-lg border border-border bg-card p-4 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      noValidate
    >
      <h2 className="text-lg font-semibold tracking-tight">{t("title")}</h2>
      <div>
        <Label htmlFor="join-name">{t("name")}</Label>
        <Input
          id="join-name"
          className="mt-2 h-11"
          value={name}
          maxLength={40}
          autoComplete="given-name"
          onChange={(e) => setName(e.target.value)}
          aria-invalid={error?.field === "name" || undefined}
          aria-describedby={
            error?.field === "name" ? "join-name-error" : undefined
          }
          autoCapitalize="words"
          enterKeyHint="next"
          ref={autoFocusFinePointer}
        />
        {error?.field === "name" ? (
          <p
            id="join-name-error"
            role="alert"
            className="mt-1.5 text-sm text-destructive"
          >
            {t(`errors.${error.code === "too_long" ? "too_long" : "required"}`)}
          </p>
        ) : null}
      </div>
      <div>
        <Label htmlFor="join-email">
          {t("email")}{" "}
          <span className="font-normal text-muted-foreground">
            {t("optional")}
          </span>
        </Label>
        <Input
          id="join-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          enterKeyHint="go"
          className="mt-2 h-11"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby="join-email-hint"
          aria-invalid={error?.field === "email" || undefined}
        />
        <p
          id="join-email-hint"
          className="mt-1.5 text-sm text-muted-foreground"
        >
          {error?.field === "email" ? (
            <span className="text-destructive">
              {t("errors.invalid_email")}
            </span>
          ) : (
            t("emailHint")
          )}
        </p>
      </div>
      {error?.field === "form" ? (
        <p role="alert" className="text-sm text-destructive">
          {te(error.code as "server")}
        </p>
      ) : null}
      <Button
        type="submit"
        className="h-11 pointer-fine:h-11"
        disabled={pending}
      >
        {t("submit")}
      </Button>
    </form>
  );
}

export function LinkOffer({ slug, name }: { slug: string; name: string }) {
  const t = useTranslations("participate.link");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
      <p className="text-sm">{t("body", { name })}</p>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => setHidden(true)}>
          {t("dismiss")}
        </Button>
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await linkGuestParticipant(slug);
              router.refresh();
            })
          }
        >
          {t("action")}
        </Button>
      </div>
    </div>
  );
}
