"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  signInForTests,
  signInWithEmail,
  signInWithGoogle,
} from "@/server/actions/auth";

function Submit({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant?: "default" | "secondary";
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      className="h-11 w-full"
      disabled={pending}
    >
      {children}
    </Button>
  );
}

export function GoogleButton({ callbackUrl }: { callbackUrl: string }) {
  const t = useTranslations("auth");
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <Submit variant="secondary">
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z"
          />
        </svg>
        {t("google")}
      </Submit>
    </form>
  );
}

export function EmailForm({ callbackUrl }: { callbackUrl: string }) {
  const t = useTranslations("auth");
  const [state, action] = useActionState(signInWithEmail, undefined);
  return (
    <form action={action} className="grid gap-2" noValidate>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <Label htmlFor="email">{t("emailLabel")}</Label>
      <Input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        placeholder={t("emailPlaceholder")}
        className="h-11"
        aria-invalid={!!state?.error || undefined}
        aria-describedby={state?.error ? "email-error" : undefined}
      />
      {state?.error ? (
        <p id="email-error" role="alert" className="text-sm text-destructive">
          {t(`errors.${state.error}`)}
        </p>
      ) : null}
      <div className="mt-2">
        <Submit>{t("sendLink")}</Submit>
      </div>
    </form>
  );
}

export function TestLoginForm({ callbackUrl }: { callbackUrl: string }) {
  return (
    <form
      action={signInForTests}
      className="grid gap-2 rounded-md border border-dashed border-border p-3"
      data-testid="test-login"
    >
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <Label htmlFor="test-email">Test login</Label>
      <Input id="test-email" name="email" placeholder="ana@test.quadra" />
      <Input name="name" placeholder="Ana" aria-label="Name" />
      <Submit variant="secondary">Test login</Submit>
    </form>
  );
}
