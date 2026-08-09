import { describe, expect, it } from "vitest";
import { products } from "@/lib/site";

describe("LG Thailand Subscription catalog", () => {
  it("contains only models verified in the current official Subscription offering", () => {
    expect(products.map((product) => product.model)).toEqual([
      "WD516AN",
      "FV1413S4M",
      "A9T-ULTRA",
      "WT1410NHEG",
    ]);
  });

  it("keeps the complete WT1410NHEG gallery and official specifications", () => {
    const washTower = products.find((product) => product.model === "WT1410NHEG");

    expect(washTower?.gallery).toHaveLength(16);
    expect(washTower?.gallery?.filter((image) => image.kind === "official")).toHaveLength(15);
    expect(washTower?.specifications).toContainEqual({ label: "ความจุซัก", value: "14 กก." });
    expect(washTower?.reviews).toHaveLength(3);
    expect(washTower?.reviews?.every((review) => review.rating >= 4)).toBe(true);
  });

  it("keeps an official LG Thailand Subscription source for every product", () => {
    expect(products.every((product) => product.subscriptionSource.startsWith("https://www.lg.com/th/"))).toBe(
      true,
    );
  });
});
