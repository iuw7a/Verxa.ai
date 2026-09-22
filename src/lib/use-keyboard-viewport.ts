"use client";

import { useEffect, useState } from "react";

export type KeyboardState = {
  /** Keyboard visible (viewport inset > ~90px). */
  open: boolean;
  /** Height in px the keyboard covers (0 when closed). */
  inset: number;
  /** True while we haven't received any visualViewport event yet. */
  unknown: boolean;
};

/**
 * Tracks the mobile keyboard via the VisualViewport API.
 *
 * - iOS Safari: viewport shrinks when the keyboard opens; the layout viewport
 *   does not. We compute the covered height and can lift floating chrome.
 * - Android Chrome: visualViewport also resizes, usually in sync with the
 *   layout viewport.
 *
 * Uses rAF coalescing + passive listeners for smooth 60fps keyboard motion,
 * so the input bar glides with the keyboard instead of jumping after it.
 */
export function useKeyboardViewport(): KeyboardState {
  const [state, setState] = useState<KeyboardState>({
    open: false,
    inset: 0,
    unknown: true,
  });

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) {
      setState({ open: false, inset: 0, unknown: true });
      return;
    }

    let raf = 0;
    let lastInset = -1;

    const update = () => {
      raf = 0;
      // Height covered by keyboard = layout viewport bottom - visual bottom.
      const inset = Math.max(
        0,
        Math.round(window.innerHeight - vv.height - vv.offsetTop),
      );
      if (inset === lastInset) return;
      lastInset = inset;
      setState({
        open: inset > 90,
        inset,
        unknown: false,
      });
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    vv.addEventListener("resize", schedule, { passive: true });
    vv.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule, { passive: true });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      vv.removeEventListener("resize", schedule);
      vv.removeEventListener("scroll", schedule);
      window.removeEventListener("orientationchange", schedule);
    };
  }, []);

  return state;
}
