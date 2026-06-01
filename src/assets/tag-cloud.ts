export type HydroTagCloudItem = {
  chars: number;
  index: number;
  label: string;
  weight: number;
};

export type HydroTagCloudPoint = {
  depth: number;
  drift: number;
  lane: number;
  orbit: number;
  phase: number;
  rise: number;
  scale: number;
  x: number;
  y: number;
};

export type HydroPlacedTagCloudPoint = HydroTagCloudPoint & {
  radiusX: number;
  radiusY: number;
};

const SKY_COLUMNS = [12, 25, 38, 51, 64, 77, 88];
const SKY_ROWS = [16, 28, 40, 52, 64, 76];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hashLabel(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seededUnit(seed: number) {
  let value = seed >>> 0;

  return () => {
    value = Math.imul(value ^ (value >>> 15), 2246822519);
    value = Math.imul(value ^ (value >>> 13), 3266489917);
    value ^= value >>> 16;

    return (value >>> 0) / 4294967295;
  };
}

function estimateCloudRadius(item: HydroTagCloudItem) {
  const charFactor = clamp(item.chars, 2, 16);
  const weightFactor = clamp(item.weight, 0, 12);

  return {
    radiusX: 4.8 + charFactor * 0.78 + weightFactor * 0.16,
    radiusY: 4.2 + charFactor * 0.1 + weightFactor * 0.22,
  };
}

function getOverlapScore(candidate: HydroPlacedTagCloudPoint, placed: HydroPlacedTagCloudPoint[]) {
  return placed.reduce((score, point) => {
    const dx = Math.abs(candidate.x - point.x) / (candidate.radiusX + point.radiusX);
    const dy = Math.abs(candidate.y - point.y) / (candidate.radiusY + point.radiusY);
    const distance = Math.hypot(dx, dy);

    if (distance >= 1) {
      return score;
    }

    return score + (1 - distance) * (1 - distance);
  }, 0);
}

export function createHydroTagCloudPoint(
  item: HydroTagCloudItem,
  placed: HydroPlacedTagCloudPoint[] = [],
): HydroTagCloudPoint {
  const seed = hashLabel(`${item.index}:${item.label}:${item.chars}:${item.weight}`);
  const random = seededUnit(seed);
  const radius = estimateCloudRadius(item);
  const candidates: HydroPlacedTagCloudPoint[] = [];

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const column =
      SKY_COLUMNS[(item.index * 3 + attempt * 2 + Math.floor(random() * SKY_COLUMNS.length)) % SKY_COLUMNS.length] ??
      50;
    const row =
      SKY_ROWS[(item.index * 5 + attempt * 3 + Math.floor(random() * SKY_ROWS.length)) % SKY_ROWS.length] ?? 50;
    const jitterX = (random() - 0.5) * 8.5;
    const jitterY = (random() - 0.5) * 7.5;
    const depth = Math.floor(random() * 5);
    const weightLift = clamp(item.weight, 0, 8) * 0.65;
    const longLabelDrop = clamp(item.chars - 6, 0, 10) * 0.46;
    const edgeInset = radius.radiusX * 0.42;

    candidates.push({
      ...radius,
      depth,
      drift: Math.floor(random() * 13),
      lane: Math.floor(random() * 9),
      orbit: Math.floor(random() * 17),
      phase: Math.floor(random() * 19),
      rise: Math.floor(random() * 11),
      scale: 0.94 + depth * 0.025 + clamp(item.weight, 0, 8) * 0.008,
      x: clamp(column + jitterX, 8 + edgeInset, 92 - edgeInset),
      y: clamp(row + jitterY - weightLift + longLabelDrop, 12, 82),
    });
  }

  const best =
    candidates.sort((a, b) => getOverlapScore(a, placed) - getOverlapScore(b, placed))[0] ??
    ({
      ...radius,
      depth: 0,
      drift: 6,
      lane: 4,
      orbit: 8,
      phase: 0,
      rise: 5,
      scale: 1,
      x: 50,
      y: 50,
    } satisfies HydroPlacedTagCloudPoint);

  return {
    depth: best.depth,
    drift: best.drift,
    lane: best.lane,
    orbit: best.orbit,
    phase: best.phase,
    rise: best.rise,
    scale: Number(best.scale.toFixed(3)),
    x: Number(best.x.toFixed(2)),
    y: Number(best.y.toFixed(2)),
  };
}

export function createHydroTagCloudLayout(items: HydroTagCloudItem[]) {
  const placed: HydroPlacedTagCloudPoint[] = [];

  return items.map((item) => {
    const point = createHydroTagCloudPoint(item, placed);
    placed.push({
      ...point,
      ...estimateCloudRadius(item),
    });

    return point;
  });
}

function readCssNumber(element: HTMLElement, property: string, fallback: number) {
  const value = Number.parseFloat(window.getComputedStyle(element).getPropertyValue(property));

  return Number.isFinite(value) ? value : fallback;
}

function applyPoint(element: HTMLElement, point: HydroTagCloudPoint) {
  element.style.setProperty("--tag-x", String(point.x));
  element.style.setProperty("--tag-y", String(point.y));
  element.style.setProperty("--tag-lane", String(point.lane));
  element.style.setProperty("--tag-drift", String(point.drift));
  element.style.setProperty("--tag-rise", String(point.rise));
  element.style.setProperty("--tag-orbit", String(point.orbit));
  element.style.setProperty("--tag-depth", String(point.depth));
  element.style.setProperty("--tag-phase", String(point.phase));
  element.style.setProperty("--tag-scale", String(point.scale));
}

export function initHydroTagCloud(root: ParentNode = document) {
  const cloud = root.querySelector<HTMLElement>(".hydro-tags-cloud");

  if (!cloud) {
    return;
  }

  const items = Array.from(cloud.querySelectorAll<HTMLElement>(".hydro-tag-chip"));

  if (items.length === 0) {
    return;
  }

  const layout = () => {
    if (!window.matchMedia("(min-width: 721px)").matches) {
      cloud.dataset.hydroTagCloudReady = "true";
      return;
    }

    const points = createHydroTagCloudLayout(
      items.map((element, index) => ({
        chars: readCssNumber(element, "--tag-chars", element.textContent?.trim().length || 2),
        index,
        label:
          element.querySelector<HTMLElement>(".hydro-tag-chip__name")?.textContent?.trim() ||
          element.textContent?.trim() ||
          "",
        weight: readCssNumber(element, "--tag-weight", 0),
      })),
    );

    points.forEach((point, index) => {
      applyPoint(items[index], point);
    });

    cloud.dataset.hydroTagCloudReady = "true";
  };

  layout();
  window.addEventListener("resize", layout, { passive: true });
}
