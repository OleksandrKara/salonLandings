import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

/**
 * Shared behavior for every bottom-sheet popup (owner request 2026-09-30: "swipe down with a
 * finger to close, and while it's open the background must not scroll, focus stays on the
 * popup"). Copies live in akluxnails-home lib/ and pmu-annakara-home lib/; keep the three in sync.
 *
 * 1. Scroll lock. `overflow: hidden` alone doesn't hold on iOS Safari (the page still
 *    touch-scrolls behind the sheet), so the body is pinned with `position: fixed` at its current
 *    offset and restored on close. Reference-counted, so a sheet opened on top of another sheet
 *    (e.g. the cancellation policy over the booking flow) doesn't unlock the page when it closes.
 * 2. Swipe down to close, ONLY when the gesture starts on the sheet's top bar (the element marked
 *    `data-sheet-handle`: the grabber row with the ✕). Owner decision 2026-09-30: anywhere else a
 *    finger must just scroll the sheet's own content, so on a small phone a client can always
 *    scroll down to the Continue/Book button without accidentally closing the sheet. The sheet
 *    follows the finger; far or fast enough closes it, otherwise it springs back. Mostly-horizontal
 *    gestures are ignored. `overscroll-behavior: contain` keeps content scrolling from ever
 *    chaining to the page behind.
 * 3. Focus moves into the sheet on open (so keyboard/screen-reader users land in the popup) and
 *    back to whatever had it on close.
 */

let lockCount = 0;
let saved: { position: string; top: string; width: string; overflow: string; scrollY: number } | null = null;

function lockBodyScroll(): () => void {
  if (lockCount === 0) {
    const body = document.body;
    saved = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
      scrollY: window.scrollY,
    };
    body.style.position = "fixed";
    body.style.top = `-${saved.scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
  }
  lockCount += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount -= 1;
    if (lockCount === 0 && saved) {
      const body = document.body;
      body.style.position = saved.position;
      body.style.top = saved.top;
      body.style.width = saved.width;
      body.style.overflow = saved.overflow;
      window.scrollTo(0, saved.scrollY);
      saved = null;
    }
  };
}

/** True if the touch started on the sheet's own top bar (see point 2 above). */
function startedOnHandle(target: EventTarget | null, sheet: HTMLElement): boolean {
  const handle = target instanceof Element ? target.closest("[data-sheet-handle]") : null;
  return handle !== null && sheet.contains(handle);
}

const CLOSE_DISTANCE_PX = 120;
const CLOSE_VELOCITY_PX_PER_MS = 0.6;

export function useBottomSheet(sheetRef: RefObject<HTMLElement | null>, open: boolean, onClose: () => void) {
  // Latest onClose without re-attaching the touch listeners (and resetting a drag in progress)
  // every time the parent re-renders with a new callback identity.
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // 1. Scroll lock
  useEffect(() => {
    if (!open) return;
    return lockBodyScroll();
  }, [open]);

  // 3. Focus
  useEffect(() => {
    if (!open) return;
    const sheet = sheetRef.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (sheet) {
      if (!sheet.hasAttribute("tabindex")) sheet.setAttribute("tabindex", "-1");
      sheet.style.outline = "none";
      sheet.focus({ preventScroll: true });
    }
    return () => previous?.focus({ preventScroll: true });
  }, [open, sheetRef]);

  // 2. Swipe down to close
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!open || !sheet) return;
    sheet.style.transform = "";
    sheet.style.transition = "";
    sheet.style.overscrollBehavior = "contain";

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let offset = 0;
    let tracking = false;
    let dragging = false;

    function onStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = Date.now();
      offset = 0;
      dragging = false;
      tracking = startedOnHandle(e.target, sheet!);
    }

    function onMove(e: TouchEvent) {
      if (!tracking) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (!dragging) {
        if (Math.abs(dx) > Math.abs(dy) || dy < 0) {
          tracking = false; // horizontal swipe or scrolling up: not ours
          return;
        }
        if (dy < 8) return;
        dragging = true;
        sheet!.style.transition = "none";
        sheet!.style.animation = "none";
      }
      e.preventDefault();
      offset = Math.max(0, dy);
      sheet!.style.transform = `translateY(${offset}px)`;
    }

    function onEnd() {
      if (!dragging) {
        tracking = false;
        return;
      }
      dragging = false;
      tracking = false;
      const velocity = offset / Math.max(1, Date.now() - startTime);
      if (offset > CLOSE_DISTANCE_PX || (offset > 40 && velocity > CLOSE_VELOCITY_PX_PER_MS)) {
        sheet!.style.transition = "transform 180ms ease-in";
        sheet!.style.transform = "translateY(100%)";
        window.setTimeout(() => onCloseRef.current(), 170);
      } else {
        sheet!.style.transition = "transform 220ms cubic-bezier(0.22,1,0.36,1)";
        sheet!.style.transform = "translateY(0)";
      }
    }

    sheet.addEventListener("touchstart", onStart, { passive: true });
    sheet.addEventListener("touchmove", onMove, { passive: false });
    sheet.addEventListener("touchend", onEnd);
    sheet.addEventListener("touchcancel", onEnd);
    return () => {
      sheet.removeEventListener("touchstart", onStart);
      sheet.removeEventListener("touchmove", onMove);
      sheet.removeEventListener("touchend", onEnd);
      sheet.removeEventListener("touchcancel", onEnd);
    };
  }, [open, sheetRef]);
}
