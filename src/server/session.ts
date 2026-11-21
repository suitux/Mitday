import "server-only";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";

export async function currentUser() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return null;
  return {
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    image: user.image ?? null,
  };
}

/** The signed-in user if their email is in `ADMIN_EMAILS`, else null. */
export async function currentAdmin() {
  const user = await currentUser();
  return user && isAdminEmail(user.email) ? user : null;
}

export class ActionError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

/** Throws in server actions when no user is signed in. */
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new ActionError("unauthorized");
  return user;
}
