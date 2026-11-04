import type { CSSProperties, ReactNode } from "react";
import { toLocale } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BlockMark } from "@/components/landing/block-mark";
import { GroupChat } from "@/components/landing/group-chat";
import { PastGallery } from "@/components/landing/past-gallery";
import { LandingDemo } from "@/components/landing/demo";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { colorValue } from "@/lib/plan-schema";
import { cn } from "@/lib/utils";

/**
 * Motif: the calendar cell (a rounded square). It notches the hero stage,
 * fills every tile of the board at poster size and builds the closing mark.
 */
const NOTCH =
  "[clip-path:polygon(var(--n)_0,100%_0,100%_100%,0_100%,0_var(--n),var(--n)_var(--n))]";

export default async function Landing({ params }: PageProps<"/[locale]">) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  setRequestLocale(locale);
  const t = await getTranslations("landing");
  const tw = await getTranslations("wizard.defaults");

  return (
    <main className="w-full overflow-x-clip">
      {/* Hero: headline on the ground, the live calendar on a notched stage. */}
      <section className="mx-auto w-full max-w-5xl px-4 pt-10 sm:px-6 lg:pt-16">
        <h1 className="max-w-[15ch] text-[2.25rem] leading-[0.92] font-extrabold tracking-[-0.05em] text-balance sm:text-7xl lg:text-[5.25rem]">
          {t("title")}
        </h1>
        <div className="mt-8 grid gap-10 lg:mt-12 lg:grid-cols-12 lg:gap-8">
          <div className="reveal lg:col-span-4">
            <p className="text-lg leading-relaxed">{t("subtitle")}</p>
            <Button asChild size="lg" className="mt-8 h-12 px-6 text-base">
              <Link href="/plans/new">{t("cta")}</Link>
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">{t("ctaNote")}</p>
          </div>
          <div className="relative -mx-4 sm:-mx-6 lg:col-span-8 lg:mx-0">
            <div
              className={cn(
                "shutter bg-primary px-4 pt-20 pb-10 [--n:4.5rem] sm:px-10 sm:pt-24 lg:-mr-[calc((100vw-64rem)/2+1.5rem)] lg:pr-[calc((100vw-64rem)/2+3.5rem)] lg:pb-16 lg:pl-14",
                NOTCH,
              )}
            >
              <div className="max-w-[560px]">
                <LandingDemo todayIso={new Date().toISOString()} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The group chat, on its own field. */}
      <section aria-labelledby="chat" className="mt-24 bg-field-pink lg:mt-32">
        <div className="mx-auto grid w-full max-w-5xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-28">
          <div className="reveal lg:order-2">
            <h2
              id="chat"
              className="text-4xl leading-[0.95] font-extrabold tracking-[-0.045em] text-balance sm:text-6xl"
            >
              {t("chat.title")}
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-relaxed">
              {t("chat.body")}
            </p>
          </div>
          <div className="reveal">
            <GroupChat />
          </div>
        </div>
      </section>

      <PastGallery />

      {/* The board: one tile per type of friend, each with a cell at poster size. */}
      <section
        aria-labelledby="types"
        className="mx-auto w-full max-w-5xl px-4 py-20 sm:px-6 lg:py-28"
      >
        <div className="grid grid-cols-2 gap-2 lg:auto-rows-[104px] lg:grid-cols-12">
          <div className="col-span-2 flex items-start bg-background py-4 lg:col-span-6 lg:row-span-2 lg:py-0">
            <h2
              id="types"
              className="text-4xl leading-[0.95] font-extrabold tracking-[-0.045em] text-balance sm:text-5xl"
            >
              {t("types.title")}
            </h2>
          </div>
          <Tile
            field="bg-field-peach"
            span="lg:col-span-6 lg:row-span-6"
            title={t("types.adapts.title")}
            body={t("types.adapts.body")}
          >
            <PosterCell
              color={colorValue("amber")}
              label={t("demo.maybe")}
              big
            />
          </Tile>
          <Tile
            field="bg-field-sage"
            span="lg:col-span-3 lg:row-span-4"
            title={t("types.noSignup.title")}
            body={t("types.noSignup.body")}
          >
            <PosterCell color={colorValue("green")} label="Berta" />
          </Tile>
          <Tile
            field="bg-field-blue"
            span="lg:col-span-3 lg:row-span-4"
            title={t("types.dinner.title")}
            body={t("types.dinner.body")}
          >
            <SplitCell top={tw("lunch")} bottom={tw("dinner")} />
          </Tile>
          <Tile
            field="bg-field-sand"
            span="lg:col-span-6 lg:row-span-3"
            title={t("types.secret.title")}
            body={t("types.secret.body")}
          >
            <PosterCell
              color={`color-mix(in srgb, ${colorValue("green")} 30%, white)`}
              label="?"
              dark
            />
          </Tile>
          <Tile
            field="bg-field-pink"
            span="lg:col-span-6 lg:row-span-3"
            title={t("types.late.title")}
            body={t("types.late.body")}
          >
            <PosterCell color="var(--card)" label="14" dark ring />
          </Tile>
        </div>
      </section>

      {/* Close: a sentence with a blank that starts the plan. */}
      <section aria-labelledby="end" className="bg-primary text-white">
        <div className="mx-auto w-full max-w-5xl px-4 pt-20 pb-12 sm:px-6 lg:pt-28">
          <h2
            id="end"
            className="reveal text-4xl leading-[0.95] font-extrabold tracking-[-0.045em] text-balance sm:text-7xl"
          >
            {t("end.title")}
          </h2>
          <form
            action={`/${locale}/plans/new`}
            method="get"
            className="reveal mt-10 text-2xl leading-[1.5] font-semibold tracking-[-0.02em] sm:text-4xl"
          >
            <label htmlFor="end-title">{t("end.lead")} </label>
            <span className="inline-flex max-w-full flex-wrap items-baseline gap-2">
              <input
                id="end-title"
                name="title"
                maxLength={80}
                placeholder={t("end.placeholder")}
                aria-label={t("end.label")}
                className="h-[1.4em] w-[9.5em] max-w-full rounded-[0.25em] bg-white/15 px-[0.3em] text-white outline-none placeholder:text-white/60 focus-visible:ring-4 focus-visible:ring-white/50"
              />
              <button
                type="submit"
                className="h-[1.4em] rounded-[0.25em] bg-field-peach px-[0.4em] text-foreground transition-transform outline-none hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-white/50 active:translate-y-0"
              >
                {t("end.cta")}
              </button>
            </span>
          </form>
          <p className="mt-4 text-base text-white/80">{t("end.note")}</p>
          <BlockMark className="mt-16 lg:mt-20" />
        </div>
      </section>
    </main>
  );
}

function Tile({
  field,
  span,
  title,
  body,
  children,
}: {
  field: string;
  span: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "reveal relative col-span-2 flex min-h-72 flex-col justify-end overflow-hidden rounded-[var(--radius)] p-5 sm:p-6",
        field,
        span,
      )}
    >
      <div className="absolute -top-4 -right-4">{children}</div>
      <div className="relative max-w-[34ch]">
        <h3 className="text-xl leading-tight font-bold tracking-tight">
          {title}
        </h3>
        <p className="mt-1.5 text-base leading-snug">{body}</p>
      </div>
    </div>
  );
}

/** One calendar cell at poster size. */
function PosterCell({
  color,
  label,
  dark,
  ring,
  big,
}: {
  color: string;
  label: string;
  dark?: boolean;
  ring?: boolean;
  big?: boolean;
}) {
  const style: CSSProperties = { backgroundColor: color };
  return (
    <div
      data-ui
      style={style}
      className={cn(
        "relative grid size-44 place-items-center rounded-[1.75rem] px-5 text-center text-2xl leading-tight font-extrabold tracking-tight text-balance sm:size-52",
        dark ? "text-foreground" : "text-white",
        big && "sm:size-72 sm:rounded-[2.5rem] sm:text-4xl lg:size-80",
        ring && "border-8 border-hue",
      )}
    >
      {label}
    </div>
  );
}

function SplitCell({ top, bottom }: { top: string; bottom: string }) {
  return (
    <div
      data-ui
      className="grid size-44 grid-rows-2 gap-1.5 text-2xl font-extrabold tracking-tight text-white sm:size-52"
    >
      <span
        className="grid place-items-center rounded-t-[1.75rem] rounded-b-md"
        style={{ backgroundColor: colorValue("red") }}
      >
        {top}
      </span>
      <span
        className="grid place-items-center rounded-t-md rounded-b-[1.75rem]"
        style={{ backgroundColor: colorValue("green") }}
      >
        {bottom}
      </span>
    </div>
  );
}
