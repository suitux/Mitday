"use client";

import { useCallback, useEffect, useRef } from "react";
import type { MouseEvent, PointerEvent } from "react";
import type { Answers } from "@/lib/client-plan";

export type Brush = { kind: "option"; optionId: string } | { kind: "inspect" };

/** Hold time before a touch press counts as "show who can make it". */
export const LONG_PRESS_MS = 450;
/** Finger travel that turns a press into a drag (cancels the long press). */
const LONG_PRESS_SLOP = 10;

type Press = {
  cell: string;
  x: number;
  y: number;
  timer: ReturnType<typeof setTimeout>;
};

/**
 * Palette-brush painting. Tap paints a cell with the active option; tapping a
 * cell already painted with it clears it. Dragging (pointer events, mouse and
 * touch) applies the same action to every cell crossed.
 *
 * Right click (context menu) or a touch long press on a cell opens who
 * answered it (`onInspect`), whatever the brush. A long press undoes the
 * paint its initial tap applied.
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
  /** Value a cell had before the current gesture's first tap, to undo it. */
  const before = useRef<{ cell: string; value: string | undefined } | null>(
    null,
  );

  const cancelPress = useCallback(() => {
    if (press.current) clearTimeout(press.current.timer);
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

  const inspect = useCallback(
    (cell: string) => {
      cancelPress();
      drag.current = null;
      const b = before.current;
      before.current = null;
      if (b && b.cell === cell) {
        setAnswers((prev) => {
          if (prev[cell] === b.value) return prev;
          const next = { ...prev };
          if (b.value === undefined) delete next[cell];
          else next[cell] = b.value;
          return next;
        });
      }
      onInspect?.(cell);
    },
    [cancelPress, onInspect, setAnswers],
  );

  const start = useCallback(
    (cell: string) => {
      if (brush.kind === "inspect") {
        onInspect?.(cell);
        return;
      }
      if (disabled) return;
      const mode = answers[cell] === brush.optionId ? "erase" : "paint";
      before.current = { cell, value: answers[cell] };
      drag.current = { mode, visited: new Set([cell]) };
      apply(cell, mode);
    },
    [answers, apply, brush, disabled, onInspect],
  );

  useEffect(() => {
    const end = () => {
      drag.current = null;
      cancelPress();
    };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      end();
    };
  }, [cancelPress]);

  /** Props for each cell button. */
  const cellProps = useCallback(
    (cell: string) => ({
      "data-cell": cell,
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        if (e.button !== 0) return;
        // Touch pointers are implicitly captured; release so moves hit other cells.
        if (e.currentTarget.hasPointerCapture(e.pointerId))
          e.currentTarget.releasePointerCapture(e.pointerId);
        before.current = null;
        start(cell);
        cancelPress();
        if (onInspect && e.pointerType !== "mouse" && brush.kind === "option") {
          press.current = {
            cell,
            x: e.clientX,
            y: e.clientY,
            timer: setTimeout(() => inspect(cell), LONG_PRESS_MS),
          };
        }
      },
      onClick: (e: MouseEvent<HTMLElement>) => {
        // Keyboard activation (Enter / Space) arrives as a click with detail 0.
        if (e.detail === 0) start(cell);
      },
      onContextMenu: (e: MouseEvent<HTMLElement>) => {
        // Right click, Shift+F10 / menu key, and Android's long press.
        if (!onInspect) return;
        e.preventDefault();
        inspect(cell);
      },
    }),
    [brush.kind, cancelPress, inspect, onInspect, start],
  );

  /** Put on the container that holds draggable cells. */
  const surfaceProps = {
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const p = press.current;
      if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > LONG_PRESS_SLOP)
        cancelPress();
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
