import Lenis from "@studio-freight/lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import "./styles/main.css";

gsap.registerPlugin(ScrollTrigger);

const motionEnabled = document.body.dataset.enableMotion !== "false";

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

  lenis.on("scroll", () => ScrollTrigger.update());
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

function initNavigation() {
  const nav = document.querySelector<HTMLElement>("[data-hydro-nav]");
  const searchToggle = document.querySelector<HTMLButtonElement>("[data-hydro-search-toggle]");
  const searchPanel = document.querySelector<HTMLElement>("[data-hydro-search-panel]");
  const mobileToggle = document.querySelector<HTMLButtonElement>("[data-hydro-mobile-toggle]");
  const mobileMenu = document.querySelector<HTMLElement>("[data-hydro-mobile-menu]");
  let navMode: "top" | "pill" = window.scrollY > 100 ? "pill" : "top";
  let navTimers: number[] = [];

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

  const syncNav = () => {
    if (!nav) {
      return;
    }

    const shouldBePill = window.scrollY > 100;

    if (shouldBePill && navMode !== "pill") {
      clearNavTimers();
      resetNavTransitionClasses();
      navMode = "pill";
      nav.classList.add("is-nav-transitioning", "is-exiting-top");
      navTimers.push(
        window.setTimeout(() => {
          nav.classList.remove("is-exiting-top");
          nav.classList.add("is-scrolled", "is-entering-pill");
        }, 150),
        window.setTimeout(() => {
          nav.classList.remove("is-entering-pill", "is-nav-transitioning");
        }, 760),
      );
      return;
    }

    if (!shouldBePill && navMode !== "top") {
      clearNavTimers();
      resetNavTransitionClasses();
      navMode = "top";
      nav.classList.add("is-nav-transitioning", "is-leaving-pill");
      navTimers.push(
        window.setTimeout(() => {
          nav.classList.remove("is-scrolled", "is-leaving-pill");
          nav.classList.add("is-entering-top");
        }, 320),
        window.setTimeout(() => {
          nav.classList.remove("is-entering-top", "is-nav-transitioning");
        }, 760),
      );
    }
  };

  syncNav();
  window.addEventListener("scroll", syncNav, { passive: true });

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
        gsap.to(image, { duration: 0.1, y: self.progress * -50 });
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
    const cards = section.querySelectorAll("[data-tilt-card]");

    gsap.fromTo(
      title,
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "expo.out",
        scrollTrigger: { trigger: section, start: "top 80%", toggleActions: "play none none reverse" },
      },
    );

    cards.forEach((card, index) => {
      gsap.fromTo(
        card,
        { opacity: 0, rotateX: 45, y: 100 },
        {
          opacity: 1,
          rotateX: 0,
          y: 0,
          duration: 0.8,
          ease: "expo.out",
          delay: index * 0.1,
          scrollTrigger: { trigger: section, start: "top 70%", toggleActions: "play none none reverse" },
        },
      );
    });
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

function initTiltCards() {
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
  if (!motionEnabled) {
    return;
  }

  let lastScrollY = window.scrollY;
  let ticking = false;

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) {
        return;
      }
      window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const velocity = currentScrollY - lastScrollY;
        const rotateX = Math.max(-2, Math.min(2, velocity * 0.05));
        gsap.to(".tilt-on-scroll", { duration: 0.3, ease: "power2.out", rotateX });
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

initNavigation();
initScrambleLinks();
initLenis();
initHero();
initRevealAnimations();
initTiltCards();
initCategoryCursor();
initScrollTilt();
initFooterMarquee();
