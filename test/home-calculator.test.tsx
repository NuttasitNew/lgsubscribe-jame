import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeCalculator } from "@/feature/public/home/components/home-calculator";

describe("HomeCalculator product scene", () => {
  it("changes the generated product composite when the selected product changes", () => {
    render(<HomeCalculator />);

    const purifierScene = screen.getByRole("img", {
      name: "ภาพสินค้า เครื่องกรองน้ำ LG PuriCare รุ่น WD516 รุ่น WD516AN",
    });
    expect(purifierScene).toBeInTheDocument();
    expect(purifierScene.getAttribute("src")).toContain("calculator-water-purifier-composite-v2.png");

    fireEvent.change(screen.getByLabelText("เลือกสินค้า"), {
      target: { value: "lg-front-load-fv1413s4m" },
    });

    const washerScene = screen.getByRole("img", {
      name: "ภาพสินค้า เครื่องซักผ้าฝาหน้า LG 13 กก. AI DD™ รุ่น FV1413S4M",
    });
    expect(washerScene).toBeInTheDocument();
    expect(washerScene.getAttribute("src")).toContain("calculator-washer-composite-v2.png");
    expect(screen.getByText("FV1413S4M", { selector: "p" })).toBeInTheDocument();
  });
});
