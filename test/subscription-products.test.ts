import { describe, expect, it } from "vitest";
import { products } from "@/lib/site";

describe("LG Thailand Subscription catalog", () => {
  it("contains only models verified in the current official Subscription offering", () => {
    expect(products.map((product) => product.model)).toEqual([
      "WD516AN",
      "FV1413S4M",
      "A9T-ULTRA",
    ]);
  });

  it("keeps an official LG Thailand Subscription source for every product", () => {
    expect(
      products.every((product) =>
        product.subscriptionSource.startsWith("https://www.lg.com/th/"),
      ),
    ).toBe(true);
  });
});
