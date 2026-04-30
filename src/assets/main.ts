import Lenis from "@studio-freight/lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import "./styles/main.css";

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const motionEnabled = document.body.dataset.enableMotion !== "false";
const colorSchemeStorageKey = "hydro-color-scheme";
type ColorSchemeMode = "auto" | "dark" | "light";

function isColorSchemeMode(value: string | null): value is ColorSchemeMode {
  return value === "auto" || value === "dark" || value === "light";
}

function readStoredColorScheme() {
  try {
    const value = window.localStorage.getItem(colorSchemeStorageKey);
    return isColorSchemeMode(value) ? value : null;
  } catch {
    return null;
  }
}

function writeStoredColorScheme(mode: ColorSchemeMode) {
  try {
    window.localStorage.setItem(colorSchemeStorageKey, mode);
  } catch {
    // Ignore storage failures so private browsing still gets a working toggle.
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function initLenis() {
  if (!motionEnabled || document.body.dataset.smoothScroll === "false") {
    return;
  }

  const lenis = new Lenis({
    duration: 1.2,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    gestureOrientation: "vertical",
    orientation: "vertical",
    smoothWheel: true,
    touchMultiplier: 2,
    wheelMultiplier: 1,
  });

  (window as unknown as { __lenis?: typeof lenis }).__lenis = lenis;
  lenis.on("scroll", () => ScrollTrigger.update());
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

function initColorScheme() {
  const root = document.documentElement;
  const toggles = document.querySelectorAll<HTMLButtonElement>("[data-hydro-theme-toggle]");
  const configuredMode = root.dataset.themeDefault ?? null;
  const defaultMode: ColorSchemeMode = isColorSchemeMode(configuredMode) ? configuredMode : "auto";
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let isTransitioning = false;

  const resolveMode = (mode: ColorSchemeMode) =>
    mode === "dark" || (mode === "auto" && mediaQuery.matches) ? "dark" : "light";
  const getTransitionOrigin = (trigger?: HTMLElement) => {
    const rect = trigger?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : 64;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    return { radius, x, y };
  };

  const applyMode = (mode: ColorSchemeMode) => {
    const resolvedMode = resolveMode(mode);
    root.dataset.hydroTheme = resolvedMode;
    root.dataset.colorScheme = mode;
    root.classList.toggle("dark", mode === "dark");
    root.classList.toggle("light", mode === "light");
    root.classList.toggle("color-scheme-dark", mode === "dark");
    root.classList.toggle("color-scheme-light", mode === "light");
    root.classList.toggle("color-scheme-auto", mode === "auto");
    root.style.colorScheme = resolvedMode;

    toggles.forEach((toggle) => {
      const nextLabel = resolvedMode === "dark" ? "切换为浅色模式" : "切换为深色模式";
      toggle.setAttribute("aria-label", nextLabel);
      toggle.setAttribute("title", nextLabel);
      toggle.setAttribute("aria-pressed", String(resolvedMode === "dark"));
    });
  };
  const setTransitionVars = (origin: ReturnType<typeof getTransitionOrigin>) => {
    root.style.setProperty("--hydro-theme-transition-x", `${origin.x}px`);
    root.style.setProperty("--hydro-theme-transition-y", `${origin.y}px`);
    root.style.setProperty("--hydro-theme-transition-radius", `${origin.radius}px`);
  };
  const runThemeTransition = (mode: ColorSchemeMode, origin: ReturnType<typeof getTransitionOrigin>) => {
    const resolvedMode = resolveMode(mode);
    const styles = window.getComputedStyle(root);
    const targetBackground =
      styles.getPropertyValue(resolvedMode === "dark" ? "--hydro-dark-bg" : "--hydro-light-bg").trim() ||
      styles.getPropertyValue("--hydro-bg").trim();
    const overlay = document.createElement("div");

    overlay.className = "hydro-theme-wipe";
    overlay.style.setProperty("--hydro-theme-wipe-bg", targetBackground);
    overlay.style.setProperty("--hydro-theme-transition-x", `${origin.x}px`);
    overlay.style.setProperty("--hydro-theme-transition-y", `${origin.y}px`);
    overlay.style.setProperty("--hydro-theme-transition-radius", `${origin.radius}px`);
    document.body.append(overlay);

    window.requestAnimationFrame(() => {
      overlay.classList.add("is-expanding");
    });
    // 提前应用主题，让颜色过渡与遮罩扩散同步，创造循序渐进的渐变感
    window.setTimeout(() => {
      applyMode(mode);
    }, 280);
    window.setTimeout(() => {
      overlay.classList.add("is-leaving");
    }, 1000);
    window.setTimeout(() => {
      overlay.remove();
      root.classList.remove("is-theme-transitioning");
      isTransitioning = false;
    }, 2000);
  };
  const transitionToMode = (mode: ColorSchemeMode, trigger?: HTMLElement, forceAnimation = false) => {
    if (isTransitioning) {
      return;
    }
    if (!motionEnabled || (!forceAnimation && reduceMotion.matches)) {
      applyMode(mode);
      return;
    }

    isTransitioning = true;
    root.classList.add("is-theme-transitioning");
    const origin = getTransitionOrigin(trigger);
    setTransitionVars(origin);
    runThemeTransition(mode, origin);
  };

  const getActiveMode = () => readStoredColorScheme() ?? defaultMode;

  applyMode(getActiveMode());

  toggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const nextMode: ColorSchemeMode = root.dataset.hydroTheme === "dark" ? "light" : "dark";
      writeStoredColorScheme(nextMode);
      transitionToMode(nextMode, toggle, true);
    });
  });

  mediaQuery.addEventListener("change", () => {
    if (!readStoredColorScheme() && defaultMode === "auto") {
      transitionToMode("auto");
    }
  });
}

function initNavigation() {
  const nav = document.querySelector<HTMLElement>("[data-hydro-nav]");
  const searchToggle = document.querySelector<HTMLButtonElement>("[data-hydro-search-toggle]");
  const searchPanel = document.querySelector<HTMLElement>("[data-hydro-search-panel]");
  const mobileToggle = document.querySelector<HTMLButtonElement>("[data-hydro-mobile-toggle]");
  const mobileMenu = document.querySelector<HTMLElement>("[data-hydro-mobile-menu]");
  let navMode: "top" | "pill" = window.scrollY > 100 ? "pill" : "top";
  let navTimers: number[] = [];
  let lastScrollY = window.scrollY;
  let lastTime = performance.now();
  let scrollVelocity = 0;
  let rafId: number | null = null;

  const clearNavTimers = () => {
    navTimers.forEach((timer) => window.clearTimeout(timer));
    navTimers = [];
  };

  const resetNavTransitionClasses = () => {
    nav?.classList.remove(
      "is-nav-transitioning",
      "is-exiting-top",
      "is-entering-pill",
      "is-leaving-pill",
      "is-entering-top",
    );
  };

  if (navMode === "pill") {
    nav?.classList.add("is-scrolled");
  }

  const updateVelocity = () => {
    const currentTime = performance.now();
    const currentScrollY = window.scrollY;
    const deltaTime = currentTime - lastTime;
    const deltaY = Math.abs(currentScrollY - lastScrollY);

    if (deltaTime > 0) {
      // 像素/毫秒，然后平滑处理
      const instantVelocity = deltaY / deltaTime;
      scrollVelocity = scrollVelocity * 0.6 + instantVelocity * 0.4;
    }

    lastScrollY = currentScrollY;
    lastTime = currentTime;
  };

  const syncNav = () => {
    if (!nav) return;

    updateVelocity();

    const shouldBePill = window.scrollY > 100;

    // 速度越快，倍数越小；速度越慢，倍数越大
    // scrollVelocity: 0 px/ms (很慢) → 倍数 5.0
    // scrollVelocity: 2.5 px/ms (快) → 倍数 0.2
    const speedMultiplier = Math.max(0.2, Math.min(5.0, 5.0 - scrollVelocity * 1.92));

    if (shouldBePill && navMode !== "pill") {
      clearNavTimers();
      resetNavTransitionClasses();
      navMode = "pill";

      const exitDuration = Math.round(70 * speedMultiplier);
      const enterDuration = Math.round(600 * speedMultiplier);

      nav.style.setProperty("--nav-exit-duration", `${exitDuration}ms`);
      nav.style.setProperty("--nav-enter-duration", `${enterDuration}ms`);

      nav.classList.add("is-nav-transitioning", "is-exiting-top");
      navTimers.push(
        window.setTimeout(() => {
          nav.classList.remove("is-exiting-top");
          nav.classList.add("is-scrolled", "is-entering-pill");
        }, exitDuration),
        window.setTimeout(() => {
          nav.classList.remove("is-entering-pill", "is-nav-transitioning");
        }, exitDuration + enterDuration),
      );
      return;
    }

    if (!shouldBePill && navMode !== "top") {
      clearNavTimers();
      resetNavTransitionClasses();
      navMode = "top";

      const exitDuration = Math.round(160 * speedMultiplier);
      const enterDuration = Math.round(100 * speedMultiplier);

      nav.style.setProperty("--nav-exit-duration", `${exitDuration}ms`);
      nav.style.setProperty("--nav-enter-duration", `${enterDuration}ms`);

      nav.classList.add("is-nav-transitioning", "is-leaving-pill");
      navTimers.push(
        window.setTimeout(() => {
          nav.classList.remove("is-scrolled", "is-leaving-pill");
          nav.classList.add("is-entering-top");
        }, exitDuration),
        window.setTimeout(() => {
          nav.classList.remove("is-entering-top", "is-nav-transitioning");
        }, exitDuration + enterDuration),
      );
    }
  };

  const onScroll = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      syncNav();
      rafId = null;
    });
  };

  syncNav();
  window.addEventListener("scroll", onScroll, { passive: true });

  searchToggle?.addEventListener("click", () => {
    const isOpen = searchPanel?.classList.toggle("is-open");
    if (isOpen) {
      searchPanel?.querySelector<HTMLInputElement>("input")?.focus();
    }
  });

  mobileToggle?.addEventListener("click", () => {
    mobileToggle.classList.toggle("is-open");
    mobileMenu?.classList.toggle("is-open");
    document.body.classList.toggle("hydro-menu-lock", mobileMenu?.classList.contains("is-open"));
  });

  mobileMenu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileToggle?.classList.remove("is-open");
      mobileMenu.classList.remove("is-open");
      document.body.classList.remove("hydro-menu-lock");
    });
  });

  // Desktop dropdowns
  document.querySelectorAll<HTMLElement>("[data-hydro-dropdown]").forEach((dropdown) => {
    const menu = dropdown.querySelector<HTMLElement>(".hydro-dropdown__menu");
    if (!menu) return;

    let hideTimer: number | undefined;

    const show = () => {
      if (hideTimer) window.clearTimeout(hideTimer);
      menu.classList.add("is-visible");
    };

    const hide = () => {
      hideTimer = window.setTimeout(() => {
        menu.classList.remove("is-visible");
      }, 150);
    };

    dropdown.addEventListener("mouseenter", show);
    dropdown.addEventListener("mouseleave", hide);
    menu.addEventListener("mouseenter", show);
    menu.addEventListener("mouseleave", hide);
  });
}

function initScrambleLinks() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

  document.querySelectorAll<HTMLAnchorElement>("[data-scramble]").forEach((link) => {
    const label = link.textContent ?? "";
    link.addEventListener("mouseenter", () => {
      let iterations = 0;
      const maxIterations = 10;
      const interval = window.setInterval(() => {
        link.textContent = Array.from(label)
          .map((char, index) => {
            if (char.trim() === "") {
              return char;
            }
            if (index < iterations / 2) {
              return char;
            }
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("");

        iterations += 1;
        if (iterations > maxIterations) {
          window.clearInterval(interval);
          link.textContent = label;
        }
      }, 30);
    });
  });
}

function initHero() {
  const hero = document.querySelector<HTMLElement>("[data-hydro-hero]");
  const image = document.querySelector<HTMLElement>("[data-hydro-hero-image]");
  const imageMotion = document.querySelector<HTMLElement>("[data-hydro-hero-motion]");
  const title = document.querySelector<HTMLElement>("[data-split-title]");

  if (!hero || !motionEnabled) {
    return;
  }

  if (title?.textContent) {
    title.innerHTML = Array.from(title.textContent)
      .map((char) => {
        const content = char === " " ? "&nbsp;" : escapeHtml(char);
        return `<span class="split-char"><span>${content}</span></span>`;
      })
      .join("");
  }

  const setHeroImageY = image ? gsap.quickTo(image, "y", { duration: 0.12, ease: "power1.out" }) : undefined;

  const ctx = gsap.context(() => {
    gsap.fromTo(
      image,
      { clipPath: "inset(100% 0 0 0)", scale: 1.1 },
      { clipPath: "inset(0% 0 0 0)", duration: 1.5, ease: "expo.out", scale: 1, delay: 0.3 },
    );
    gsap.fromTo(
      ".split-char span",
      { y: "100%" },
      { y: "0%", duration: 1, ease: "expo.out", stagger: 0.05, delay: 0.6 },
    );
    gsap.fromTo(
      ".hydro-list-item",
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 0.8, ease: "expo.out", stagger: 0.1, delay: 0.9 },
    );

    ScrollTrigger.create({
      trigger: hero,
      start: "top top",
      end: "bottom top",
      scrub: true,
      onUpdate: (self) => {
        setHeroImageY?.(self.progress * -50);
      },
    });
  }, hero);

  const setImageX = imageMotion ? gsap.quickTo(imageMotion, "x", { duration: 0.35, ease: "power3.out" }) : undefined;
  const setImageY = imageMotion ? gsap.quickTo(imageMotion, "y", { duration: 0.35, ease: "power3.out" }) : undefined;

  hero.addEventListener("mousemove", (event) => {
    const rect = hero.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    hero.style.setProperty("--hero-mouse-x", `${x * 100}%`);
    hero.style.setProperty("--hero-mouse-y", `${y * 100}%`);
    setImageX?.((x - 0.5) * 22);
    setImageY?.((y - 0.5) * 22);
  });

  hero.addEventListener("mouseleave", () => {
    setImageX?.(0);
    setImageY?.(0);
  });

  window.addEventListener("pagehide", () => ctx.revert(), { once: true });
}

function initRevealAnimations() {
  if (!motionEnabled) {
    return;
  }

  document.querySelectorAll<HTMLElement>("[data-reveal-section]").forEach((section) => {
    const title = section.querySelector("[data-reveal-title]");
    const cards = Array.from(section.querySelectorAll("[data-tilt-card]"));
    const targets = [title, ...cards].filter(Boolean);

    if (targets.length === 0) {
      return;
    }

    gsap.set(title, { opacity: 0, y: 50, force3D: true });
    gsap.set(cards, {
      opacity: prefersReducedMotion.matches ? 0.2 : 0.08,
      rotateX: prefersReducedMotion.matches ? 0 : 10,
      scale: prefersReducedMotion.matches ? 1 : 0.965,
      transformPerspective: 1000,
      transformOrigin: "50% 70%",
      willChange: "transform, opacity",
      y: prefersReducedMotion.matches ? 12 : 56,
      force3D: true,
    });
    gsap
      .timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 78%",
          once: true,
        },
      })
      .to(title, { opacity: 1, duration: prefersReducedMotion.matches ? 0.35 : 0.68, ease: "expo.out", y: 0 })
      .to(
        cards,
        {
          opacity: 1,
          rotateX: 0,
          scale: 1,
          duration: prefersReducedMotion.matches ? 0.65 : 1.75,
          ease: "power2.out",
          stagger: prefersReducedMotion.matches ? 0.1 : 0.24,
          y: 0,
          onComplete: () => gsap.set(cards, { clearProps: "willChange" }),
        },
        "-=0.08",
      );
  });

  const about = document.querySelector<HTMLElement>("[data-about-section]");
  if (about) {
    gsap.fromTo(
      ".about-text-line",
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "expo.out",
        stagger: 0.1,
        scrollTrigger: { trigger: about, start: "top 70%", toggleActions: "play none none reverse" },
      },
    );
  }
}

function scheduleIdleWork(callback: () => void, timeout = 900) {
  const idleWindow = window as typeof window & {
    requestIdleCallback?: (handler: () => void, options?: { timeout: number }) => number;
  };

  if (idleWindow.requestIdleCallback) {
    idleWindow.requestIdleCallback(callback, { timeout });
    return;
  }

  window.setTimeout(callback, 120);
}

function decodeWhenReady(image: HTMLImageElement) {
  const decode = () => {
    if (typeof image.decode !== "function") {
      return;
    }
    image.decode().catch(() => {
      // Browsers may reject decode() for cross-origin or cancelled images; the normal load path still works.
    });
  };

  if (image.complete && image.naturalWidth > 0) {
    decode();
    return;
  }

  image.addEventListener("load", decode, { once: true });
}

function initArticleMediaPrewarm() {
  const section = document.querySelector<HTMLElement>("#articles");
  if (!section) {
    return;
  }

  const images = Array.from(section.querySelectorAll<HTMLImageElement>("[data-prewarm-image]"));
  if (images.length === 0) {
    return;
  }

  let warmed = false;
  const warmImages = () => {
    if (warmed) {
      return;
    }
    warmed = true;

    images.forEach((image) => {
      image.loading = "eager";
      image.decoding = "async";
      decodeWhenReady(image);
    });
  };

  scheduleIdleWork(warmImages, 1200);

  if (!("IntersectionObserver" in window)) {
    warmImages();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) {
        return;
      }
      warmImages();
      observer.disconnect();
    },
    { rootMargin: "1100px 0px" },
  );

  observer.observe(section);
}

function initTiltCards() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    return;
  }

  document.querySelectorAll<HTMLElement>("[data-tilt-card]").forEach((card) => {
    card.addEventListener("mousemove", (event) => {
      if (!motionEnabled) {
        return;
      }
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const rotateX = (y - rect.height / 2) / 20;
      const rotateY = (rect.width / 2 - x) / 20;
      gsap.to(card, { duration: 0.3, ease: "power2.out", rotateX, rotateY });
    });

    card.addEventListener("mouseleave", () => {
      if (motionEnabled) {
        gsap.to(card, { duration: 0.5, ease: "expo.out", rotateX: 0, rotateY: 0 });
      }
    });
  });
}

function initCategoryCursor() {
  const section = document.querySelector<HTMLElement>("[data-categories-section]");
  const cursor = document.querySelector<HTMLElement>("[data-hydro-cursor]");
  if (!section || !cursor) {
    return;
  }

  section.querySelectorAll(".hydro-category-slice").forEach((slice) => {
    slice.addEventListener("mouseenter", () => cursor.classList.add("is-visible"));
    slice.addEventListener("mouseleave", () => cursor.classList.remove("is-visible"));
  });

  section.addEventListener("mousemove", (event) => {
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
  });
}

function initScrollTilt() {
  if (!motionEnabled || prefersReducedMotion.matches) {
    return;
  }

  const tiltTargets = gsap.utils.toArray<HTMLElement>(".tilt-on-scroll");
  if (tiltTargets.length === 0) {
    return;
  }

  let lastScrollY = window.scrollY;
  let settleTimer: number | undefined;
  let ticking = false;
  const setters = tiltTargets.map((target) =>
    gsap.quickTo(target, "rotateX", {
      duration: 0.18,
      ease: "power2.out",
    }),
  );

  const setTilt = (rotateX: number) => {
    setters.forEach((setter) => setter(rotateX));
  };

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) {
        return;
      }
      window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const velocity = currentScrollY - lastScrollY;
        const rotateX = Math.max(-0.8, Math.min(0.8, velocity * 0.018));
        tiltTargets.forEach((target) => target.classList.add("is-scroll-tilting"));
        setTilt(rotateX);
        if (settleTimer) {
          window.clearTimeout(settleTimer);
        }
        settleTimer = window.setTimeout(() => {
          setTilt(0);
          window.setTimeout(() => {
            tiltTargets.forEach((target) => target.classList.remove("is-scroll-tilting"));
          }, 220);
        }, 140);
        lastScrollY = currentScrollY;
        ticking = false;
      });
      ticking = true;
    },
    { passive: true },
  );
}

function initFooterMarquee() {
  if (!motionEnabled) {
    return;
  }

  const track = document.querySelector<HTMLElement>(".hydro-marquee-track");
  const footer = document.querySelector<HTMLElement>(".hydro-footer");
  if (!track || !footer) {
    return;
  }

  const tween = gsap.to(track, { duration: 20, ease: "none", repeat: -1, x: "-50%" });
  ScrollTrigger.create({
    trigger: footer,
    start: "top bottom",
    end: "bottom bottom",
    onUpdate: (self) => tween.timeScale(Math.max(0.5, 1 + self.getVelocity() / 5000)),
  });
}

initColorScheme();
initNavigation();
initScrambleLinks();
initLenis();
initHero();
initArticleMediaPrewarm();
initRevealAnimations();
initTiltCards();
initCategoryCursor();
initScrollTilt();
initFooterMarquee();

function initLinkCards() {
  if (!motionEnabled) {
    return;
  }

  document.querySelectorAll<HTMLElement>(".hydro-links-grid").forEach((grid) => {
    const cards = Array.from(grid.querySelectorAll<HTMLElement>(".hydro-link-card"));
    if (cards.length === 0) {
      return;
    }

    gsap.set(cards, {
      "--hydro-link-reveal-y": "1.4rem",
      autoAlpha: 0,
      clipPath: "inset(12% 0% 0% 0% round 0.5rem)",
      filter: "blur(10px)",
    });

    const revealCards = (velocity: number) => {
      const speed = Math.abs(velocity);
      const duration = gsap.utils.clamp(0.38, 0.9, 0.88 - speed / 3600);
      const stagger = gsap.utils.clamp(0.035, 0.13, 0.13 - speed / 18000);

      gsap.killTweensOf(cards);
      gsap.to(cards, {
        "--hydro-link-reveal-y": "0rem",
        autoAlpha: 1,
        clipPath: "inset(0% 0% 0% 0% round 0.5rem)",
        duration,
        ease: "expo.out",
        filter: "blur(0px)",
        stagger: { each: stagger, from: "start" },
      });
    };

    const resetCards = () => {
      gsap.killTweensOf(cards);
      gsap.set(cards, {
        "--hydro-link-reveal-y": "1.4rem",
        autoAlpha: 0,
        clipPath: "inset(12% 0% 0% 0% round 0.5rem)",
        filter: "blur(10px)",
      });
    };

    ScrollTrigger.create({
      trigger: grid,
      start: "top 84%",
      onEnter: (self) => revealCards(self.getVelocity()),
      onEnterBack: (self) => revealCards(self.getVelocity()),
      onLeaveBack: resetCards,
    });
  });

  document.querySelectorAll<HTMLElement>(".hydro-link-card").forEach((card) => {
    card.addEventListener("mousemove", (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--hydro-link-glow-x", `${event.clientX - rect.left}px`);
      card.style.setProperty("--hydro-link-glow-y", `${event.clientY - rect.top}px`);
    });
  });
}

function initMomentsReveal() {
  document.querySelectorAll<HTMLElement>("[data-moment]").forEach((moment, index) => {
    if (!motionEnabled) {
      moment.classList.add("is-visible");
      return;
    }
    ScrollTrigger.create({
      trigger: moment,
      start: "top 88%",
      onEnter: () => {
        gsap.to(moment, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "expo.out",
          delay: (index % 5) * 0.05,
          onStart: () => moment.classList.add("is-visible"),
        });
      },
    });
  });
}

function initLightbox() {
  const lightbox = document.querySelector<HTMLElement>("[data-lightbox]");
  if (!lightbox) return;

  const img = lightbox.querySelector<HTMLImageElement>("[data-lightbox-img]");
  const closeBtn = lightbox.querySelector<HTMLButtonElement>("[data-lightbox-close]");
  const prevBtn = lightbox.querySelector<HTMLButtonElement>("[data-lightbox-prev]");
  const nextBtn = lightbox.querySelector<HTMLButtonElement>("[data-lightbox-next]");
  const counter = lightbox.querySelector<HTMLElement>("[data-lightbox-counter]");

  const triggers = Array.from(document.querySelectorAll<HTMLElement>("[data-lightbox-trigger]"));
  let currentIndex = 0;

  const open = (index: number) => {
    currentIndex = index;
    const src = triggers[index].dataset.src ?? "";
    const alt = triggers[index].dataset.alt ?? "";
    if (!img) return;
    img.classList.add("is-loading");
    img.src = src;
    img.alt = alt;
    img.onload = () => img.classList.remove("is-loading");
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("hydro-menu-lock");
    if (counter) counter.textContent = `${index + 1} / ${triggers.length}`;
    if (prevBtn) prevBtn.style.display = triggers.length > 1 ? "" : "none";
    if (nextBtn) nextBtn.style.display = triggers.length > 1 ? "" : "none";
  };

  const close = () => {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("hydro-menu-lock");
  };

  triggers.forEach((trigger, index) => {
    trigger.addEventListener("click", () => open(index));
  });

  closeBtn?.addEventListener("click", close);
  prevBtn?.addEventListener("click", () => open((currentIndex - 1 + triggers.length) % triggers.length));
  nextBtn?.addEventListener("click", () => open((currentIndex + 1) % triggers.length));

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) close();
  });

  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("is-open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") prevBtn?.click();
    if (e.key === "ArrowRight") nextBtn?.click();
  });
}

initLinkCards();
initMomentsReveal();
initLightbox();

function initBackToTop() {
  const btn = document.querySelector<HTMLButtonElement>("[data-hydro-back-to-top]");
  if (!btn) return;

  const sync = () => btn.classList.toggle("is-visible", window.scrollY > 100);

  sync(); // 刷新时立即同步
  window.addEventListener("scroll", sync, { passive: true });

  btn.addEventListener("click", () => {
    const lenis = (window as unknown as Record<string, unknown>).__lenis as
      | { scrollTo?: (target: number) => void }
      | undefined;
    if (lenis?.scrollTo) {
      lenis.scrollTo(0);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
}

function initFab() {
  const trigger = document.querySelector<HTMLButtonElement>("[data-hydro-fab-trigger]");
  const menu = document.querySelector<HTMLElement>("[data-hydro-fab]");
  if (!trigger || !menu) return;

  const items = Array.from(menu.querySelectorAll<HTMLElement>(".hydro-fab-item"));
  if (items.length === 0) return;

  // 扇形：固定间隔 25°，以 225°（左上）为中心，向两侧展开
  const RADIUS = 80;
  const BTN_SIZE = 40;
  const GAP = 8;
  const MIN_STEP = Math.ceil(((BTN_SIZE + GAP) / RADIUS) * (180 / Math.PI));
  const STEP = Math.max(MIN_STEP, 25);
  const halfSpan = ((items.length - 1) / 2) * STEP;
  // 优先约束在 180°~270° 内；总跨度超过 90° 时以 225° 为中心对称展开（逆时针偏移最小）
  // 约束：最逆时针按钮不超正上方(270°)，即 CENTER + halfSpan ≤ 270
  // 理想中心 225°，按需逆时针旋转（减小 CENTER）
  const CENTER = Math.min(225, 270 - halfSpan);

  items.forEach((item, i) => {
    const deg = CENTER + (i - (items.length - 1) / 2) * STEP;
    const rad = (deg * Math.PI) / 180;
    item.style.setProperty("--fab-x", `${Math.round(Math.cos(rad) * RADIUS)}px`);
    item.style.setProperty("--fab-y", `${Math.round(Math.sin(rad) * RADIUS)}px`);
  });

  let closeTimer: number | undefined;

  const open = () => {
    window.clearTimeout(closeTimer);
    menu.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
  };

  const scheduleClose = () => {
    closeTimer = window.setTimeout(() => {
      menu.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
    }, 300);
  };

  // trigger hover
  trigger.addEventListener("mouseenter", open);
  trigger.addEventListener("mouseleave", scheduleClose);

  // 每个 item 独立绑定，鼠标进入时取消关闭计时器
  items.forEach((item) => {
    item.addEventListener("mouseenter", open);
    item.addEventListener("mouseleave", scheduleClose);
  });

  // 移动端点击
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.contains("is-open")
      ? (window.clearTimeout(closeTimer),
        menu.classList.remove("is-open"),
        trigger.setAttribute("aria-expanded", "false"))
      : open();
  });

  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target as Node) && e.target !== trigger) {
      window.clearTimeout(closeTimer);
      menu.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
    }
  });
}

initBackToTop();
initFab();
