"use client";

import { useCallback, useEffect, useRef } from "react";
import type { MouseEvent, PointerEvent } from "react";
import type { Answers } from "@/lib/client-plan";

export type Brush = { kind: "option"; optionId: string } | { kind: "inspect" };

/**
 * Palette-brush painting. Tap paints a cell with the active option; tapping a
 * cell already painted with it clears it. Dragging (pointer events, mouse and
 * touch) applies the same action to every cell crossed.
 */
export function usePaint({
  answers,
  setAnswers,
  brush,
  disabled,
  onInspect,
}: {
  answers: Answers;
  setAnswers: (update: (prev: Answers) => Answers) => void;
  brush: Brush;
  disabled: boolean;
  onInspect: (cell: string) => void;
}) {
  const drag = useRef<{ mode: "paint" | "erase"; visited: Set<string> } | null>(
    null,
  );

  const apply = useCallback(
    (cell: string, mode: "paint" | "erase") => {
      if (brush.kind !== "option") return;
      setAnswers((prev) => {
        if (mode === "erase") {
          if (!(cell in prev)) return prev;
          const next = { ...prev };
          delete next[cell];
          return next;
        }
        if (prev[cell] === brush.optionId) return prev;
        return { ...prev, [cell]: brush.optionId };
      });
    },
    [brush, setAnswers],
  );

  const start = useCallback(
    (cell: string) => {
      if (brush.kind === "inspect") {
        onInspect(cell);
        return;
      }
      if (disabled) return;
      const mode = answers[cell] === brush.optionId ? "erase" : "paint";
      drag.current = { mode, visited: new Set([cell]) };
      apply(cell, mode);
    },
    [answers, apply, brush, disabled, onInspect],
  );

  useEffect(() => {
    const end = () => {
      drag.current = null;
    };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, []);

  /** Props for each cell button. */
  const cellProps = useCallback(
    (cell: string) => ({
      "data-cell": cell,
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        if (e.button !== 0) return;
        // Touch pointers are implicitly captured; release so moves hit other cells.
        if (e.currentTarget.hasPointerCapture(e.pointerId))
          e.currentTarget.releasePointerCapture(e.pointerId);
        start(cell);
      },
      onClick: (e: MouseEvent<HTMLElement>) => {
        // Keyboard activation (Enter / Space) arrives as a click with detail 0.
        if (e.detail === 0) start(cell);
      },
    }),
    [start],
  );

  /** Put on the container that holds draggable cells. */
  const surfaceProps = {
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const d = drag.current;
      if (!d) return;
      const el = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest<HTMLElement>("[data-cell]");
      const cell = el?.dataset.cell;
      if (!cell || d.visited.has(cell) || el.hasAttribute("disabled")) return;
      d.visited.add(cell);
      apply(cell, d.mode);
    },
  };

  return { cellProps, surfaceProps };
}
