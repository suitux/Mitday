"use client";

import { useCallback, useEffect, useRef } from "react";
import type { MouseEvent, PointerEvent } from "react";
import type { Answers } from "@/lib/client-plan";

export type Brush = { kind: "option"; optionId: string } | { kind: "inspect" };

/** Hold time before a touch press counts as "show who can make it". */
export const LONG_PRESS_MS = 450;
/** Finger travel that turns a press into a gesture (scroll or drag). */
const SLOP = 10;

/**
 * Class for the container of paintable cells: vertical swipes scroll the page,
 * horizontal ones reach `onPointerMove` and paint.
 */
export const SURFACE_TOUCH = "[touch-action:pan-y_pinch-zoom]";

type Press = {
  cell: string;
  pointerId: number;
  x: number;
  y: number;
  timer: ReturnType<typeof setTimeout> | null;
};

/**
 * Palette-brush painting.
 *
 * Mouse: press paints a cell with the active option (pressing a cell already
 * painted with it clears it); dragging applies the same action to every cell
 * crossed. Right click opens who answered it (`onInspect`).
 *
 * Touch / pen: nothing happens on touch-down, so scrolling never paints.
 * - Tap (lift without moving) paints / clears; with the inspect brush, or
 *   when painting is disabled, it shows who answered.
 * - Vertical swipe scrolls the page (surface is `SURFACE_TOUCH`).
 * - Horizontal swipe starts a stroke that paints every cell crossed; once
 *   started it follows the finger in any direction.
 * - Long press shows who answered.
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
  /** Omit when the viewer may not see others' answers. */
  onInspect?: (cell: string) => void;
}) {
  const drag = useRef<{ mode: "paint" | "erase"; visited: Set<string> } | null>(
    null,
  );
  const press = useRef<Press | null>(null);

  const cancelPress = useCallback(() => {
    if (press.current?.timer) clearTimeout(press.current.timer);
    press.current = null;
  }, []);

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

  /** Begins a paint stroke at `cell`. False when painting isn't possible. */
  const start = useCallback(
    (cell: string) => {
      if (brush.kind !== "option" || disabled) return false;
      const mode = answers[cell] === brush.optionId ? "erase" : "paint";
      drag.current = { mode, visited: new Set([cell]) };
      apply(cell, mode);
      return true;
    },
    [answers, apply, brush, disabled],
  );

  /** A single activation (key, tap): paint, or show who answered. */
  const activate = useCallback(
    (cell: string) => {
      if (!start(cell)) onInspect?.(cell);
      drag.current = null;
    },
    [onInspect, start],
  );

  // Window listeners outlive renders: read the latest callback through a ref.
  const latestActivate = useRef(activate);
  useEffect(() => {
    latestActivate.current = activate;
  });

  useEffect(() => {
    const up = (e: globalThis.PointerEvent) => {
      const p = press.current;
      cancelPress();
      if (p && p.pointerId === e.pointerId && !drag.current) {
        // Lifted without scrolling or dragging: a tap.
        latestActivate.current(p.cell);
      }
      drag.current = null;
    };
    const cancel = () => {
      // The browser took the gesture (scroll, zoom): it was never a tap.
      drag.current = null;
      cancelPress();
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      cancel();
    };
  }, [cancelPress]);

  /** Props for each cell button. */
  const cellProps = useCallback(
    (cell: string) => ({
      "data-cell": cell,
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        if (e.button !== 0) return;
        cancelPress();
        drag.current = null;
        if (e.pointerType === "mouse") {
          if (!start(cell)) onInspect?.(cell);
          return;
        }
        // Touch pointers are implicitly captured; release so moves hit other cells.
        if (e.currentTarget.hasPointerCapture(e.pointerId))
          e.currentTarget.releasePointerCapture(e.pointerId);
        press.current = {
          cell,
          pointerId: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          timer: onInspect
            ? setTimeout(() => {
                cancelPress();
                onInspect(cell);
              }, LONG_PRESS_MS)
            : null,
        };
      },
      onClick: (e: MouseEvent<HTMLElement>) => {
        // Keyboard activation (Enter / Space) arrives as a click with detail 0.
        if (e.detail === 0) activate(cell);
      },
      onContextMenu: (e: MouseEvent<HTMLElement>) => {
        // Right click, Shift+F10 / menu key, and Android's long press.
        e.preventDefault();
        if (!onInspect || drag.current) return;
        cancelPress();
        onInspect(cell);
      },
    }),
    [activate, cancelPress, onInspect, start],
  );

  /** Put on the container that holds draggable cells (with `SURFACE_TOUCH`). */
  const surfaceProps = {
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const p = press.current;
      if (p && p.pointerId === e.pointerId && !drag.current) {
        const dx = Math.abs(e.clientX - p.x);
        const dy = Math.abs(e.clientY - p.y);
        if (Math.max(dx, dy) <= SLOP) return;
        cancelPress();
        // Mostly vertical: the browser scrolls and a pointercancel follows.
        if (dy >= dx || !start(p.cell)) return;
      }
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
