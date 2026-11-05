import { cn } from "@/lib/utils";

/** Mitday's mark: a 2×2 grid with one painted cell. */
export function MitdayMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={cn("size-5", className)}
    >
      <rect x="1" y="1" width="8" height="8" rx="1.5" fill="currentColor" />
      <rect
        x="11"
        y="1"
        width="8"
        height="8"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="1"
        y="11"
        width="8"
        height="8"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="11"
        y="11"
        width="8"
        height="8"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
