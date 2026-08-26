import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ProductViewCount,
  productViewStorageKey,
  resetVisitBonuses,
} from "@/components/live-view-count";

const model = "SEQ13A";

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
