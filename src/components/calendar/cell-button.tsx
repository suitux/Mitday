"use client";

import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type CellVisual = {
  /** Solid colour of the viewer's own answer. */
  mineColor?: string;
  /** Others' answers: tint colour and 0..1 intensity. */
  heat?: { color: string; intensity: number };
  best?: boolean;
  final?: boolean;
};

export function heatStyle(heat: CellVisual["heat"]): CSSProperties | undefined {
  if (!heat || heat.intensity <= 0) return undefined;
  return {
    backgroundColor: `color-mix(in srgb, ${heat.color} calc(${heat.intensity} * var(--heat) * 100%), var(--card))`,
  };
}

export function CellButton({
  visual,
  className,
  children,
  style,
  ...props
}: ComponentPropsWithoutRef<"button"> & { visual: CellVisual }) {
  const mine = visual.mineColor;
  return (
    <button
      type="button"
      data-nav=""
      className={cn(
        "relative flex size-full items-center justify-center rounded-md border text-sm select-none",
        "transition-[transform,background-color] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 active:scale-[0.96]",
        "num disabled:border-transparent disabled:bg-transparent disabled:text-muted-foreground/60 disabled:active:scale-100",
        mine
          ? "border-transparent font-semibold text-white"
          : "border-border bg-card hover:border-input",
        visual.final && "ring-2 ring-hue ring-offset-1",
        className,
      )}
      style={{
        ...(mine ? { backgroundColor: mine } : heatStyle(visual.heat)),
        ...style,
      }}
      {...props}
    >
      {children}
      {visual.best ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-1 right-1 size-1.5 rounded-full bg-hue",
            mine && "ring-1 ring-white",
          )}
        />
      ) : null}
    </button>
  );
}
