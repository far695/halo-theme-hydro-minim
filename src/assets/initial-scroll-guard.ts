type LenisScrollGuard = {
  resize?: () => void;
  scrollTo?: (target: number, options?: { force?: boolean; immediate?: boolean }) => void;
};

type InitialScrollGuardOptions = {
  getLenis?: () => LenisScrollGuard | undefined;
  minRestoreScroll?: number;
  topTolerance?: number;
};

const loadingScrollKeys = new Set(["ArrowDown", "ArrowUp", "End", "Home", "PageDown", "PageUp", " "]);

export function disableAutomaticLoadScrollRestoration(win: Window = window) {
  try {
    if ("scrollRestoration" in win.history) {
      win.history.scrollRestoration = "manual";
    }
  } catch {
    // Some embedded browsers block history access; scroll still works without the hint.
  }
}

export function initInitialScrollGuard(win: Window = window, options: InitialScrollGuardOptions = {}) {
  disableAutomaticLoadScrollRestoration(win);

  const { getLenis, minRestoreScroll = 16, topTolerance = 8 } = options;
  const doc = win.document;
  if (doc.readyState === "complete") {
    return;
  }

  let lastUserScrollY = Math.max(0, win.scrollY);
  let sawUserScroll = lastUserScrollY > minRestoreScroll;

  const rememberUserScroll = () => {
    win.requestAnimationFrame(() => {
      lastUserScrollY = Math.max(0, win.scrollY);
      sawUserScroll = sawUserScroll || lastUserScrollY > minRestoreScroll;
    });
  };
  const rememberKeyboardScroll = (event: KeyboardEvent) => {
    if (loadingScrollKeys.has(event.key)) {
      rememberUserScroll();
    }
  };
  const cleanup = () => {
    win.removeEventListener("wheel", rememberUserScroll);
    win.removeEventListener("touchmove", rememberUserScroll);
    win.removeEventListener("keydown", rememberKeyboardScroll);
  };
  const restoreIfLoadResetToTop = () => {
    cleanup();
    const targetScrollY = Math.round(lastUserScrollY);

    win.requestAnimationFrame(() => {
      if (!sawUserScroll || targetScrollY <= minRestoreScroll || win.location.hash || win.scrollY > topTolerance) {
        return;
      }

      const lenis = getLenis?.();
      lenis?.resize?.();
      if (lenis?.scrollTo) {
        lenis.scrollTo(targetScrollY, { force: true, immediate: true });
        return;
      }

      win.scrollTo({ top: targetScrollY, behavior: "auto" });
    });
  };

  win.addEventListener("wheel", rememberUserScroll, { passive: true });
  win.addEventListener("touchmove", rememberUserScroll, { passive: true });
  win.addEventListener("keydown", rememberKeyboardScroll);
  win.addEventListener("load", restoreIfLoadResetToTop, { once: true });
}
