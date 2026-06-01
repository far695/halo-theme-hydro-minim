// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { createHydroTagCloudLayout, createHydroTagCloudPoint, type HydroTagCloudItem } from "./tag-cloud";

const sampleTags: HydroTagCloudItem[] = [
  { chars: 2, index: 0, label: "笑话", weight: 4 },
  { chars: 2, index: 1, label: "js", weight: 2 },
  { chars: 3, index: 2, label: "css", weight: 1 },
  { chars: 6, index: 3, label: "Python", weight: 2 },
  { chars: 3, index: 4, label: "php", weight: 2 },
  { chars: 4, index: 5, label: "java", weight: 2 },
  { chars: 2, index: 6, label: "小说", weight: 1 },
  { chars: 2, index: 7, label: "语文", weight: 3 },
  { chars: 2, index: 8, label: "化学", weight: 2 },
  { chars: 7, index: 9, label: "秦时明月汉时关", weight: 0 },
];

describe("createHydroTagCloudLayout", () => {
  it("creates deterministic sky positions within the visible cloud field", () => {
    const first = createHydroTagCloudLayout(sampleTags);
    const second = createHydroTagCloudLayout(sampleTags);

    expect(second).toEqual(first);
    expect(first).toHaveLength(sampleTags.length);
    first.forEach((point) => {
      expect(point.x).toBeGreaterThanOrEqual(8);
      expect(point.x).toBeLessThanOrEqual(92);
      expect(point.y).toBeGreaterThanOrEqual(12);
      expect(point.y).toBeLessThanOrEqual(82);
    });
  });

  it("spreads labels across both axes instead of producing a linear diagonal", () => {
    const points = createHydroTagCloudLayout(sampleTags);
    const uniqueColumns = new Set(points.map((point) => Math.round(point.x / 10)));
    const uniqueRows = new Set(points.map((point) => Math.round(point.y / 10)));

    expect(uniqueColumns.size).toBeGreaterThanOrEqual(5);
    expect(uniqueRows.size).toBeGreaterThanOrEqual(5);
  });
});

describe("createHydroTagCloudPoint", () => {
  it("keeps larger labels inset from the horizontal edge", () => {
    const point = createHydroTagCloudPoint({ chars: 14, index: 2, label: "extra-long-label", weight: 8 });

    expect(point.x).toBeGreaterThan(12);
    expect(point.x).toBeLessThan(88);
    expect(point.scale).toBeGreaterThan(0.94);
  });
});
