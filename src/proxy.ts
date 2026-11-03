import NextAuth from "next-auth";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { routing } from "@/i18n/routing";

const intl = createIntlMiddleware(routing);
const { auth } = NextAuth(authConfig);

const PROTECTED = /^\/(?:es|ca|en)\/(?:dashboard|plans)(?:\/|$)/;

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  if (PROTECTED.test(pathname) && !req.auth?.user) {
    const locale = pathname.split("/")[1];
    const login = new URL(`/${locale}/login`, req.nextUrl);
    login.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }
  return intl(req);
});

export const config = {
  // Everything except API routes, Next internals, Vercel internals and files with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
