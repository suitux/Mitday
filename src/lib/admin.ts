/** Lower-cased, trimmed set of the addresses in a comma-separated list. */
export function parseAdminEmails(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** True when `email` is listed in `ADMIN_EMAILS`. Unset or empty ⇒ nobody. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return parseAdminEmails(process.env.ADMIN_EMAILS).has(
    email.trim().toLowerCase(),
  );
}
