import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SubscribeSteps } from "@/components/subscribe-steps";
import { siteConfig } from "@/lib/site";

afterEach(() => {
  cleanup();
});

describe("SubscribeSteps", () => {
  it("rebuilds the campaign steps as on-site cards instead of a pasted poster", () => {
    render(<SubscribeSteps />);

    expect(
      screen.getByRole("heading", { level: 2, name: "ขั้นตอนการ Subscribe สินค้า LG" }),
    ).toBeInTheDocument();
    expect(screen.getByText("บริการดี อุ่นใจในทุกขั้นตอน")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "เลือกสินค้าจากเว็บไซต์" })).toBeInTheDocument();
    expect(screen.getByText("ชมสินค้าในเว็บไซต์และเลือกสินค้าที่ต้องการ")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: `แอด LINE ${siteConfig.lineId}` })).toBeInTheDocument();
    expect(screen.getByText("แจ้งรุ่นที่สนใจ เพื่อรับโปรโมชัน หรือสอบถามข้อมูล")).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "แจ้งข้อมูลรายละเอียดเบื้องต้น เพื่อทำใบเสนอราคา" }),
    ).toBeInTheDocument();
    expect(screen.getByText("ชื่อ, ที่อยู่, เบอร์โทร")).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "หลังจากได้ใบเสนอราคา กรอกข้อมูลสั่งซื้อ" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("ใส่ข้อมูลสั่งซื้อเพิ่มเติมตามขั้นตอน เพื่อยืนยันการสั่งซื้อ"),
    ).toBeInTheDocument();

    expect(screen.getByText("หากสงสัยหรือติดตรงขั้นตอนไหน สามารถสอบถามได้ทันที")).toBeInTheDocument();
    expect(screen.getByText("ของแท้ 100%")).toBeInTheDocument();
    expect(screen.getByText("ติดตั้งโดยทีมช่าง LG")).toBeInTheDocument();
    expect(screen.getByText("มั่นใจในคุณภาพ")).toBeInTheDocument();
    expect(screen.getByText("คุ้ม ครบ จบในที่เดียว")).toBeInTheDocument();

    const lineLinks = screen.getAllByRole("link", { name: /LINE/ });
    expect(lineLinks.length).toBeGreaterThan(0);
    for (const link of lineLinks) {
      expect(link).toHaveAttribute("href", siteConfig.lineUrl);
    }

    expect(screen.queryByRole("img", { name: /ขั้นตอนการ Subscribe/ })).not.toBeInTheDocument();
  });
});
