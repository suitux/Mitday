import Link from "next/link";
import { Geist } from "next/font/google";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

// Only reached for paths outside any locale (the proxy normally adds one).
export default function GlobalNotFound() {
  return (
    <html lang="es" className={geist.variable}>
      <body className="flex min-h-dvh items-center justify-center bg-background p-6 font-sans text-foreground">
        <main className="max-w-sm">
          <h1 className="text-2xl font-medium tracking-tight">404</h1>
          <p className="mt-2 text-muted-foreground">
            Página no encontrada · Page not found
          </p>
          <Link
            href="/"
            className="mt-6 inline-block underline underline-offset-4"
          >
            Quadra
          </Link>
        </main>
      </body>
    </html>
  );
}
