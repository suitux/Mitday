import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { currentUser } from "@/server/session";
import { MitdayMark } from "./logo";
import { UserMenu } from "./user-menu";

async function HeaderUser() {
  const t = await getTranslations("nav");
  const user = await currentUser().catch(() => null);
  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex h-11 items-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-accent pointer-fine:h-9"
      >
        {t("signIn")}
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <Link
        href="/dashboard"
        className="hidden h-9 items-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
      >
        {t("dashboard")}
      </Link>
      <UserMenu
        name={user.name ?? user.email ?? "?"}
        email={user.email}
        image={user.image}
      />
    </div>
  );
}

export async function SiteHeader() {
  return (
    <header className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
      <Link
        href="/"
        className="-ml-1 flex h-11 items-center gap-2 px-1 text-[15px] font-semibold tracking-tight"
      >
        <MitdayMark />
        Mitday
      </Link>
      <Suspense fallback={<div className="h-9 w-20" />}>
        <HeaderUser />
      </Suspense>
    </header>
  );
}
