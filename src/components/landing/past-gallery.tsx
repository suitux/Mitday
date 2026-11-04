import Image, { type StaticImageData } from "next/image";
import { useTranslations } from "next-intl";
import ball from "../../../public/landing/having-fun-at-the-picnic-races-ball.jpg";
import hagidera from "../../../public/landing/a-picnic-party-at-hagidera.jpg";
import autumn from "../../../public/landing/a-young-man-two-young-women-and.jpg";
import picnic from "../../../public/landing/a-picnic-party.jpg";
import { cn } from "@/lib/utils";

/** Old pictures of groups that did manage to meet up (credited below). */
export function PastGallery() {
  const t = useTranslations("landing.past");
  return (
    <section aria-labelledby="past" className="bg-field-blue">
      <div className="mx-auto w-full max-w-5xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-8">
          <h2
            id="past"
            className="reveal text-4xl leading-[0.95] font-extrabold tracking-[-0.045em] text-balance sm:text-6xl lg:col-span-7"
          >
            {t("title")}
          </h2>
          <p className="reveal max-w-md text-lg leading-relaxed lg:col-span-5">
            {t("body")}
          </p>
        </div>
        <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-12">
          <Shot src={hagidera} caption={t("p2")} className="sm:col-span-7" />
          <Shot
            src={autumn}
            caption={t("p3")}
            className="sm:col-span-5 sm:row-span-2"
            tall
          />
          <Shot src={picnic} caption={t("p1")} className="sm:col-span-7" />
          <Shot src={ball} caption={t("p4")} className="sm:col-span-12" wide />
        </div>
        <p className="mt-10 text-sm">{t("credit")}</p>
      </div>
    </section>
  );
}

function Shot({
  src,
  caption,
  className,
  tall,
  wide,
}: {
  src: StaticImageData;
  caption: string;
  className?: string;
  tall?: boolean;
  wide?: boolean;
}) {
  return (
    <figure className={cn("reveal", className)}>
      <div
        className={cn(
          "overflow-hidden rounded-[var(--radius)] bg-muted",
          tall ? "aspect-[3/4] sm:aspect-auto sm:h-[calc(100%-4.5rem)]" : "",
          wide ? "aspect-[21/9]" : !tall && "aspect-[3/2]",
        )}
      >
        <Image
          src={src}
          alt=""
          sizes="(min-width: 1024px) 600px, 100vw"
          className="size-full object-cover transition-transform duration-700 hover:scale-[1.03]"
          placeholder="blur"
        />
      </div>
      <figcaption className="mt-3 max-w-[48ch] text-base leading-snug">
        {caption}
      </figcaption>
    </figure>
  );
}
