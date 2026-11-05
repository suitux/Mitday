import { cn } from "@/lib/utils";

const BLOCKS = [
  { letter: "m", h: "86%", bg: "bg-field-blue" },
  { letter: "i", h: "64%", bg: "bg-field-pink" },
  { letter: "t", h: "100%", bg: "bg-field-peach" },
  { letter: "d", h: "74%", bg: "bg-field-sage" },
  { letter: "a", h: "58%", bg: "bg-field-sand" },
  { letter: "y", h: "92%", bg: "bg-field-blue" },
];

/** The name built from calendar cells of different heights. */
export function BlockMark({ className }: { className?: string }) {
  return (
    <div className={cn("h-[22svh] lg:h-[34svh]", className)}>
      <span className="sr-only">Mitday</span>
      <div aria-hidden="true" className="flex h-full items-end gap-1">
        {BLOCKS.map((b, i) => (
          <span
            key={i}
            style={{ height: b.h }}
            className={cn(
              "block-rise flex flex-1 items-end justify-center overflow-hidden rounded-t-[var(--radius)] text-[clamp(3rem,13vw,11rem)] leading-[0.8] font-extrabold tracking-[-0.06em] text-primary",
              b.bg,
            )}
          >
            {b.letter}
          </span>
        ))}
      </div>
    </div>
  );
}
