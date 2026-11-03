import { ActionError } from "@/server/session";

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string; issues?: string[] };

export function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof ActionError) return { ok: false, error: err.code };
  console.error(err);
  return { ok: false, error: "server" };
}
