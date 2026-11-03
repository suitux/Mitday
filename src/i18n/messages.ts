import "server-only";
import { createTranslator } from "next-intl";
import type { Locale } from "./routing";
import es from "../../messages/es.json";
import ca from "../../messages/ca.json";
import en from "../../messages/en.json";

const all = { es, ca, en } as const;

type Translate = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

/** Translator usable outside a request (emails, background work). */
export function translatorFor(locale: Locale, namespace: string): Translate {
  const t = createTranslator({ locale, messages: all[locale] });
  return (key, values) =>
    (t as unknown as Translate)(`${namespace}.${key}`, values);
}
