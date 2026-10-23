import { describe, expect, it } from "vitest";
import {
  classifyServiceDemand,
  type ServiceDemandInput,
} from "@/feature/backoffice/seo/seo-article/helper/classify-service-demand.helper";

/** สร้างบริการแบบสั้น ๆ ให้อ่านเทสต์ง่าย */
const service = (serviceName: string, orderCount: number, servicePrice: number | null = null): ServiceDemandInput => ({
  serviceName,
  orderCount,
  servicePrice,
});

/** map ชื่อบริการ → ระดับ ไว้ assert แบบไม่ต้องพึ่งลำดับใน array */
const tierByName = (services: ServiceDemandInput[]) =>
  Object.fromEntries(classifyServiceDemand(services).map((row) => [row.serviceName, row.tier]));

describe("classifyServiceDemand", () => {
  describe("การจัดระดับตามอันดับ", () => {
    it("แบ่ง 10 บริการเป็น 20% แรก HIGH / ถึง 50% MEDIUM / ที่เหลือ LOW", () => {
      const services = Array.from({ length: 10 }, (_, index) => service(`s${index}`, 100 - index * 10));

      const tiers = tierByName(services);

      expect(tiers.s0).toBe("HIGH");
      expect(tiers.s1).toBe("HIGH");
      expect(tiers.s2).toBe("MEDIUM");
      expect(tiers.s4).toBe("MEDIUM");
      expect(tiers.s5).toBe("LOW");
      expect(tiers.s9).toBe("LOW");
    });

    it("หมวดเล็ก (3 บริการ) ยังมี HIGH อย่างน้อย 1 ตัว — เกณฑ์เป็นอันดับไม่ใช่ยอดตายตัว", () => {
      const tiers = tierByName([service("a", 5), service("b", 3), service("c", 1)]);

      expect(tiers.a).toBe("HIGH");
      expect(Object.values(tiers)).toContain("LOW");
    });

    it("บริการเดียวที่มีงาน = HIGH", () => {
      expect(tierByName([service("only", 1)]).only).toBe("HIGH");
    });
  });

  describe("ยอดเท่ากัน", () => {
    it("บริการที่ยอดเท่ากันได้ระดับเดียวกัน ไม่ถูกแยกตามลำดับที่บังเอิญเรียงมา", () => {
      // ทุกตัวยอด 10 เท่ากันหมด → อันดับเดียวกัน → ต้องเป็น HIGH ทั้งชุด
      const tiers = tierByName([service("a", 10), service("b", 10), service("c", 10), service("d", 10)]);

      expect(new Set(Object.values(tiers)).size).toBe(1);
      expect(tiers.a).toBe("HIGH");
    });
  });

  describe("UNTAPPED — บริการที่ยังไม่เคยขาย", () => {
    it("ยอด 0 เป็น UNTAPPED เสมอ ไม่เข้าการจัดอันดับกับตัวที่มีงาน", () => {
      const tiers = tierByName([service("ขายดี", 100), service("ขายบ้าง", 5), service("ไม่เคยขาย", 0)]);

      expect(tiers["ไม่เคยขาย"]).toBe("UNTAPPED");
      expect(tiers["ขายบ้าง"]).not.toBe("UNTAPPED");
    });

    it("ตัวที่ยอด 0 ไม่ทำให้เส้นแบ่งของตัวที่มีงานเพี้ยน", () => {
      const withOrdersOnly = tierByName([service("a", 10), service("b", 5)]);
      const withZeros = tierByName([
        service("a", 10),
        service("b", 5),
        ...Array.from({ length: 20 }, (_, i) => service(`z${i}`, 0)),
      ]);

      expect(withZeros.a).toBe(withOrdersOnly.a);
      expect(withZeros.b).toBe(withOrdersOnly.b);
    });

    it("กลุ่ม UNTAPPED เรียงของแพงขึ้นก่อน — เป็นช่องว่างที่คุ้มที่สุด", () => {
      const result = classifyServiceDemand([service("ถูก", 0, 500), service("แพง", 0, 9000), service("กลาง", 0, 3000)]);

      expect(result.map((row) => row.serviceName)).toEqual(["แพง", "กลาง", "ถูก"]);
    });
  });

  describe("isHighTicket", () => {
    it("ราคาตั้งแต่ percentile 75 ขึ้นไปติดป้ายงานราคาสูง", () => {
      const result = classifyServiceDemand([
        service("a", 1, 100),
        service("b", 1, 200),
        service("c", 1, 300),
        service("d", 1, 400),
      ]);

      const highTicket = result.filter((row) => row.isHighTicket).map((row) => row.serviceName);
      expect(highTicket).toEqual(["d"]);
    });

    it("บริการราคาเหมา (price = null) ไม่ถูกนับเป็นงานราคาสูง — ไม่มีราคาให้เทียบ", () => {
      const result = classifyServiceDemand([service("เหมา", 1, null), service("ถูก", 1, 300), service("แพง", 1, 9000)]);

      expect(result.find((row) => row.serviceName === "เหมา")?.isHighTicket).toBe(false);
      expect(result.find((row) => row.serviceName === "แพง")?.isHighTicket).toBe(true);
    });

    it("ทั้งหมวดไม่มีราคาป้ายเลย = ไม่มีตัวไหนเป็นงานราคาสูง (ไม่ crash)", () => {
      const result = classifyServiceDemand([service("a", 1, null), service("b", 0, null)]);

      expect(result.every((row) => row.isHighTicket === false)).toBe(true);
    });

    it("ราคาเท่ากันทั้งหมวด = ไม่ติดป้ายใครเลย (ไม่มีใครแพงกว่าใคร ป้ายจะหมดความหมาย)", () => {
      const result = classifyServiceDemand([service("a", 3, 1000), service("b", 2, 1000), service("c", 1, 1000)]);

      expect(result.every((row) => row.isHighTicket === false)).toBe(true);
    });

    it("ของแพงที่ยังไม่เคยขายก็ยังติดป้ายงานราคาสูง (ป้ายผูกกับราคา ไม่ใช่ยอดขาย)", () => {
      const result = classifyServiceDemand([service("ถูกขายดี", 50, 300), service("แพงไม่เคยขาย", 0, 9000)]);

      const untapped = result.find((row) => row.serviceName === "แพงไม่เคยขาย");
      expect(untapped?.tier).toBe("UNTAPPED");
      expect(untapped?.isHighTicket).toBe(true);
    });
  });

  describe("ขอบเขต", () => {
    it("ส่ง array ว่างคืน array ว่าง", () => {
      expect(classifyServiceDemand([])).toEqual([]);
    });

    it("ยอดติดลบ (ข้อมูลเพี้ยน) ถูกจัดเป็น UNTAPPED ไม่ใช่ HIGH", () => {
      expect(tierByName([service("เพี้ยน", -5), service("ปกติ", 10)])["เพี้ยน"]).toBe("UNTAPPED");
    });
  });
});
