/**
 * Unit Tests สำหรับ parse-html-nodes.helper.ts
 *
 * @logic ที่ต้อง verify:
 * - tokenizer ทำงานได้โดยไม่พึ่ง DOMParser (ต้องรันได้ทั้ง server และ browser)
 * - tag ที่ไม่ปิด / ปิดเกิน / ซ้อนผิด ต้องไม่ทำให้ tree พังและข้อความต้องไม่หาย
 * - entity ถูก decode เป็นตัวอักษรจริง
 *
 * @related
 * - ทดสอบ: {@link @/feature/backoffice/seo/seo-article/helper/parse-html-nodes.helper.ts}
 */
import { describe, expect, it } from "vitest";
import {
  decodeHtmlEntities,
  parseHtmlNodes,
  type HtmlElementNode,
  type HtmlNode,
} from "@/feature/backoffice/seo/seo-article/helper/parse-html-nodes.helper";

/** ดึงข้อความทั้งหมดใน tree ออกมาต่อกัน — ใช้ยืนยันว่า parser ไม่ทำข้อความหาย */
function collectAllText(nodes: HtmlNode[]): string {
  return nodes.map((node) => (node.kind === "text" ? node.text : collectAllText(node.children))).join("");
}

function asElement(node: HtmlNode): HtmlElementNode {
  if (node.kind !== "element") throw new Error("คาดว่าเป็น element");
  return node;
}

describe("decodeHtmlEntities", () => {
  it("decode entity ที่มีชื่อ", () => {
    expect(decodeHtmlEntities("A&amp;B &lt;C&gt; &quot;D&quot;")).toBe('A&B <C> "D"');
  });

  it("decode entity แบบเลขฐานสิบและฐานสิบหก", () => {
    expect(decodeHtmlEntities("&#65;&#x42;")).toBe("AB");
  });

  it("entity ที่ไม่รู้จักคงข้อความเดิมไว้ ไม่ทิ้ง", () => {
    expect(decodeHtmlEntities("&notarealentity; ok")).toBe("&notarealentity; ok");
  });

  it("&nbsp; กลายเป็นช่องว่างปกติ", () => {
    expect(decodeHtmlEntities("a&nbsp;b")).toBe("a b");
  });
});

describe("parseHtmlNodes - Happy Path", () => {
  it("parse tag ซ้อนกันเป็น tree ที่ถูกต้อง", () => {
    const nodes = parseHtmlNodes("<p>ก่อน<strong>หนา</strong>หลัง</p>");

    expect(nodes).toHaveLength(1);
    const paragraph = asElement(nodes[0]);
    expect(paragraph.tag).toBe("p");
    expect(paragraph.children).toHaveLength(3);
    expect(asElement(paragraph.children[1]).tag).toBe("strong");
    expect(collectAllText(nodes)).toBe("ก่อนหนาหลัง");
  });

  it("อ่าน attribute ได้ทั้งแบบมี quote และไม่มี quote", () => {
    const nodes = parseHtmlNodes(`<a href="/blog" target=_blank data-x='1'>ลิงก์</a>`);
    const anchor = asElement(nodes[0]);

    expect(anchor.attrs.href).toBe("/blog");
    expect(anchor.attrs.target).toBe("_blank");
    expect(anchor.attrs["data-x"]).toBe("1");
  });

  it("ชื่อ tag แปลงเป็นตัวพิมพ์เล็กเสมอ", () => {
    expect(asElement(parseHtmlNodes("<P>x</P>")[0]).tag).toBe("p");
  });

  it("void tag ไม่กลืนเนื้อหาที่ตามมา", () => {
    const nodes = parseHtmlNodes("<p>บน<br>ล่าง</p>");
    const paragraph = asElement(nodes[0]);

    expect(paragraph.children).toHaveLength(3);
    expect(asElement(paragraph.children[1]).children).toHaveLength(0);
    expect(collectAllText(nodes)).toBe("บนล่าง");
  });
});

describe("parseHtmlNodes - Edge Cases (HTML ไม่สมบูรณ์)", () => {
  it("tag ที่ไม่ได้ปิด ถูกปิดให้ตอนจบ ข้อความไม่หาย", () => {
    const nodes = parseHtmlNodes("<p>ไม่ได้ปิด");
    expect(asElement(nodes[0]).tag).toBe("p");
    expect(collectAllText(nodes)).toBe("ไม่ได้ปิด");
  });

  it("closing tag ที่ไม่มีคู่ ถูกข้ามโดยไม่ทำ tree พัง", () => {
    const nodes = parseHtmlNodes("</div>ข้อความ");
    expect(collectAllText(nodes)).toBe("ข้อความ");
  });

  it("<li> ที่ไม่ปิด ถูกปิดอัตโนมัติเมื่อเจอ <li> ตัวถัดไป", () => {
    const list = asElement(parseHtmlNodes("<ul><li>หนึ่ง<li>สอง</ul>")[0]);

    expect(list.children).toHaveLength(2);
    expect(collectAllText([list.children[0]])).toBe("หนึ่ง");
    expect(collectAllText([list.children[1]])).toBe("สอง");
  });

  it("<p> ที่ไม่ปิด ถูกปิดอัตโนมัติเมื่อเจอ <p> ตัวถัดไป", () => {
    const nodes = parseHtmlNodes("<p>หนึ่ง<p>สอง");
    expect(nodes).toHaveLength(2);
    expect(collectAllText([nodes[1]])).toBe("สอง");
  });

  it("comment ถูกข้าม แต่ข้อความรอบข้างยังอยู่", () => {
    expect(collectAllText(parseHtmlNodes("ก่อน<!-- ซ่อน -->หลัง"))).toBe("ก่อนหลัง");
  });

  it("เครื่องหมาย < ที่ไม่ได้เปิด tag ถูกเก็บเป็นข้อความ", () => {
    expect(collectAllText(parseHtmlNodes("ราคา < 500 บาท"))).toContain("500");
  });

  it("self-closing tag ไม่ push เข้า stack", () => {
    const nodes = parseHtmlNodes("<img src='/a.webp' />ตาม");
    expect(nodes).toHaveLength(2);
    expect(asElement(nodes[0]).attrs.src).toBe("/a.webp");
    expect(collectAllText([nodes[1]])).toBe("ตาม");
  });
});

describe("parseHtmlNodes - Boundary Values", () => {
  it("string ว่างคืน array ว่าง", () => {
    expect(parseHtmlNodes("")).toEqual([]);
  });

  it("ข้อความล้วนไม่มี tag", () => {
    expect(collectAllText(parseHtmlNodes("ข้อความล้วน"))).toBe("ข้อความล้วน");
  });

  it("tag เปล่า <> ไม่ทำให้ล่ม", () => {
    expect(() => parseHtmlNodes("<>ก")).not.toThrow();
  });
});
