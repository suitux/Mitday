import { useTranslations } from "next-intl";
import { colorValue } from "@/lib/plan-schema";

type Line = { who: string; key: string; easy?: boolean } | { later: true };

/** The group chat every group has: lots of messages, no date. */
const LINES: Line[] = [
  { who: "Ana", key: "m1" },
  { who: "Berta", key: "m2" },
  { who: "Carla", key: "m3", easy: true },
  { who: "Dani", key: "m4" },
  { who: "Berta", key: "m5" },
  { who: "Edu", key: "m6" },
  { who: "Carla", key: "m7", easy: true },
  { who: "Ana", key: "m8" },
  { later: true },
  { who: "Dani", key: "m9" },
];

export function GroupChat() {
  const t = useTranslations("landing.chat");
  const amber = colorValue("amber");
  return (
    <figure
      data-ui
      className="overflow-hidden rounded-lg border border-border bg-card"
    >
      <figcaption className="flex items-center gap-3 bg-muted px-4 py-3">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
          aria-hidden="true"
        >
          {t("group").charAt(0)}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{t("group")}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {t("members")}
          </span>
        </span>
      </figcaption>
      <ol className="flex flex-col gap-2.5 p-4 sm:p-6">
        {LINES.map((line, i) =>
          "later" in line ? (
            <li
              key={i}
              className="my-2 self-center rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
            >
              {t("later")}
            </li>
          ) : (
            <li
              key={i}
              className="max-w-[85%] self-start rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5"
              style={
                line.easy
                  ? {
                      backgroundColor: `color-mix(in oklch, ${amber} 28%, var(--muted))`,
                    }
                  : undefined
              }
            >
              <span className="block text-sm font-semibold">{line.who}</span>
              <span className="block text-base leading-snug">
                {t(line.key as "m1")}
              </span>
            </li>
          ),
        )}
      </ol>
    </figure>
  );
}
