import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import WhatIsPage from "@/feature/public/what-is-lg-subscribe/components/what-is-lg-subscribe-page";

afterEach(() => {
  cleanup();
});

describe("WhatIsPage comparison", () => {
  it("shows a buy-outright versus Subscribe comparison with the campaign copy", () => {
    render(<WhatIsPage />);

    expect(
      screen.getByRole("heading", { level: 2, name: "ซื้อสด vs Subscribe ต่างกันยังไง?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "ซื้อสด" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Subscribe" })).toBeInTheDocument();

    expect(screen.getByText("จ่ายก้อนใหญ่ครั้งเดียว")).toBeInTheDocument();
    expect(screen.getByText("เป็นเจ้าของทันที")).toBeInTheDocument();
    expect(screen.getByText("อาจมีค่าใช้จ่ายเพิ่มเติมภายหลัง")).toBeInTheDocument();
    expect(screen.getByText("ต้องเตรียมงบมากกว่า")).toBeInTheDocument();

    expect(screen.getByText("เริ่มต้นจ่ายสบาย ๆ เป็นรายเดือน")).toBeInTheDocument();
    expect(screen.getByText("ใช้งานสินค้าได้โดยไม่ต้องจ่ายเต็มก้อน")).toBeInTheDocument();
    expect(screen.getByText("มีบริการดูแล พร้อมประกันตลอดอายุสัญญา")).toBeInTheDocument();
    expect(screen.getByText("ชำระผ่านบัตรเครดิต ไม่ล็อควงเงินบัตร")).toBeInTheDocument();
    expect(screen.getByText("มีประกันฯ")).toBeInTheDocument();
    expect(screen.getByText("ไม่ล็อควงเงิน")).toBeInTheDocument();
    expect(screen.getByText("อุ่นใจตลอดสัญญา")).toBeInTheDocument();

    expect(
      screen.getByText("LG Subscribe เหมาะสำหรับคนที่อยากใช้สินค้าคุณภาพ"),
    ).toBeInTheDocument();
    expect(screen.getByText("พร้อมบริหารค่าใช้จ่ายแบบสบายใจ")).toBeInTheDocument();
    expect(screen.getByText("*รายละเอียดและเงื่อนไขเป็นไปตามที่บริษัทกำหนด")).toBeInTheDocument();
  });
});
