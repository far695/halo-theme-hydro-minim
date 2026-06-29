export type HydroProgrammaticScrollProfile = "back-to-top" | "default";

export type HydroLenisScrollOptions = {
  duration?: number;
  easing?: (progress: number) => number;
  force?: boolean;
  immediate?: boolean;
  lock?: boolean;
  offset?: number;
  onComplete?: () => void;
};

export type HydroProgrammaticScrollInput = {
  currentTop: number;
  mobileViewport: boolean;
  motionEnabled: boolean;
  profile: HydroProgrammaticScrollProfile;
  smoothScrollEnabled: boolean;
  targetTop: number;
};

export type HydroProgrammaticScrollPlan = {
  completionDelayMs: number;
  lenisOptions?: HydroLenisScrollOptions;
  nativeBehavior: ScrollBehavior;
};

export function createHydroProgrammaticScrollPlan(input: HydroProgrammaticScrollInput): HydroProgrammaticScrollPlan {
  const targetTop = Math.max(0, input.targetTop);
  const currentTop = Math.max(0, input.currentTop);
  const distance = Math.abs(currentTop - targetTop);

  if (!input.motionEnabled || !input.smoothScrollEnabled) {
    return {
      completionDelayMs: 0,
      lenisOptions: { force: true, immediate: true },
      nativeBehavior: "auto",
    };
  }

  if (input.profile === "back-to-top" && input.mobileViewport && targetTop === 0 && distance > 1) {
    return {
      completionDelayMs: 0,
      lenisOptions: { force: true, immediate: true },
      nativeBehavior: "auto",
    };
  }

  return {
    completionDelayMs: 0,
    nativeBehavior: "smooth",
  };
}
