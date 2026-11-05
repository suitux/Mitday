/**
 * Ref callback that focuses a field on mount, but only with a mouse / trackpad.
 * On touch screens autofocus pops the keyboard over the page before the user
 * has read it.
 */
export function autoFocusFinePointer(el: HTMLElement | null) {
  if (el && window.matchMedia("(pointer: fine)").matches)
    el.focus({ preventScroll: true });
}
