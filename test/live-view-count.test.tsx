import { Profiler, type ProfilerOnRenderCallback } from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ProductOrderCount,
  ProductViewCount,
  productViewStorageKey,
  resetVisitBonuses,
} from "@/components/live-view-count";

const model = "SAQ13A";

function visibleCount() {
  return Number(screen.getByTestId("product-view-count").textContent?.replace(/[^\d]/g, ""));
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  resetVisitBonuses();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  resetVisitBonuses();
});

describe("product view visit persistence", () => {
  it("keeps the +1 after leaving a product page so the listing does not roll back", async () => {
    const firstVisit = render(<ProductViewCount model={model} countSession />);
    const base = visibleCount();

    await waitFor(() => expect(visibleCount()).toBe(base + 1), { timeout: 1500 });
    expect(localStorage.getItem(productViewStorageKey(model))).toBe("1");
    firstVisit.unmount();
    resetVisitBonuses();

    render(<ProductViewCount model={model} />);
    await waitFor(() => expect(visibleCount()).toBe(base + 1));
  });

  it("restores a previously counted visit from localStorage on the listing card", async () => {
    const baseline = render(<ProductViewCount model={model} />);
    const base = visibleCount();
    baseline.unmount();
    resetVisitBonuses();

    localStorage.setItem(productViewStorageKey(model), "1");
    render(<ProductViewCount model={model} />);
    await waitFor(() => expect(visibleCount()).toBe(base + 1));
  });
});

describe("live counter redraws", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not commit listing counts every second when the displayed number is unchanged", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T12:00:00+07:00"));

    let commits = 0;
    const onRender: ProfilerOnRenderCallback = () => {
      commits += 1;
    };

    render(
      <Profiler id="live-counts" onRender={onRender}>
        {Array.from({ length: 12 }, (_, index) => (
          <ProductViewCount key={`view-${index}`} model={model} />
        ))}
        {Array.from({ length: 12 }, (_, index) => (
          <ProductOrderCount key={`order-${index}`} model={model} />
        ))}
      </Profiler>,
    );

    const commitsAfterPaint = commits;
    expect(commitsAfterPaint).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(commits).toBe(commitsAfterPaint);
  });
});
