import type { ReactNode } from "react";
import "./globals.css";

// The <html> element lives in `[locale]/layout.tsx` so `lang` follows the route.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
