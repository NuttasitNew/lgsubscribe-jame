/** node ข้อความล้วน */
export interface HtmlTextNode {
  kind: "text";
  text: string;
}

/** node ที่เป็น tag */
export interface HtmlElementNode {
  kind: "element";
  tag: string; // ชื่อ tag ตัวพิมพ์เล็กเสมอ
  attrs: Record<string, string>;
  children: HtmlNode[];
}

export type HtmlNode = HtmlTextNode | HtmlElementNode;

/** tag ที่ไม่มี children และไม่ต้องมี closing tag */
const VOID_TAGS = new Set(["br", "hr", "img", "input", "meta", "link", "source", "col", "area", "base"]);

/** tag ที่เจอตัวเดียวกันซ้อนไม่ได้ — เจอ tag ใหม่ให้ปิดตัวเก่าอัตโนมัติ (เช่น `<li>a<li>b`) */
const AUTO_CLOSE_SELF = new Set(["li", "p", "tr"]);

/** tag ในตารางที่ต้องปิดก่อนเปิดช่องใหม่ */
const TABLE_CELL_TAGS = new Set(["td", "th"]);

/** entity ที่พบได้จริงในเนื้อหาบทความ */
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  laquo: "«",
  raquo: "»",
  times: "×",
  middot: "·",
};

/**
 * @description แปลง HTML entity เป็นตัวอักษรจริง (รองรับทั้งชื่อ, &#65;, &#x41;)
 * @logic entity ที่ไม่รู้จักคืนข้อความเดิมทั้งก้อน ไม่ทิ้ง
 */
export function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      const code = Number.parseInt(body.slice(2), 16);
      return Number.isNaN(code) ? whole : String.fromCodePoint(code);
    }
    if (body.startsWith("#")) {
      const code = Number.parseInt(body.slice(1), 10);
      return Number.isNaN(code) ? whole : String.fromCodePoint(code);
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named ?? whole;
  });
}

/**
 * @description อ่าน attribute จากเนื้อในของ tag เช่น `href="/x" target=_blank disabled`
 * @logic รองรับทั้ง double quote / single quote / ไม่มี quote / attribute เปล่า
 */
function parseAttributes(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const pattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

  let match = pattern.exec(raw);
  while (match !== null) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    attrs[name] = decodeHtmlEntities(value);
    match = pattern.exec(raw);
  }
  return attrs;
}

/**
 * @description parse HTML fragment เป็น tree ของ node — ทำงานได้ทั้งฝั่ง server และ browser
 * @logic
 * - เป็น tokenizer เขียนเอง ไม่พึ่ง DOMParser (ไม่มีบน server) และไม่พึ่ง jsdom (เป็น devDependency)
 * - comment `<!-- -->` และ `<!DOCTYPE>` ถูกข้าม
 * - closing tag ที่ไม่มี opening คู่กัน → ข้ามทิ้ง (ไม่ทำให้ tree พัง)
 * - opening tag ที่ไม่มี closing → ปิดให้อัตโนมัติตอนจบสตริง เนื้อหาข้างในไม่หาย
 * - void tag (br/hr/img/...) ไม่ push เข้า stack
 * - `<li>a<li>b` และ `<p>a<p>b` ปิดตัวก่อนหน้าให้อัตโนมัติ
 * - ข้อความถูก decode entity แล้ว → node.text เป็น plain text พร้อมใช้
 * @param html HTML fragment (ไม่ต้องมี html/body ครอบ)
 * @returns array ของ node ระดับบนสุด
 * @used-by {@link convert-legacy-article.helper.ts}
 */
export function parseHtmlNodes(html: string): HtmlNode[] {
  const root: HtmlElementNode = { kind: "element", tag: "#root", attrs: {}, children: [] };
  const stack: HtmlElementNode[] = [root];

  const pushText = (raw: string) => {
    if (raw.length === 0) return;
    const text = decodeHtmlEntities(raw);
    if (text.length === 0) return;
    stack[stack.length - 1].children.push({ kind: "text", text });
  };

  let cursor = 0;
  while (cursor < html.length) {
    const nextTagStart = html.indexOf("<", cursor);

    if (nextTagStart === -1) {
      pushText(html.slice(cursor));
      break;
    }

    pushText(html.slice(cursor, nextTagStart));

    // comment
    if (html.startsWith("<!--", nextTagStart)) {
      const end = html.indexOf("-->", nextTagStart + 4);
      cursor = end === -1 ? html.length : end + 3;
      continue;
    }

    // doctype / CDATA / อื่น ๆ ที่ขึ้นต้นด้วย <!
    if (html.startsWith("<!", nextTagStart)) {
      const end = html.indexOf(">", nextTagStart);
      cursor = end === -1 ? html.length : end + 1;
      continue;
    }

    const tagEnd = html.indexOf(">", nextTagStart);
    if (tagEnd === -1) {
      // `<` ลอย ๆ ที่ไม่ได้เปิด tag จริง — คืนเป็นข้อความ ไม่ทิ้ง
      pushText(html.slice(nextTagStart));
      break;
    }

    const rawTag = html.slice(nextTagStart + 1, tagEnd).trim();
    cursor = tagEnd + 1;

    if (rawTag.length === 0) {
      pushText("<>");
      continue;
    }

    // closing tag
    if (rawTag.startsWith("/")) {
      const closingTag = rawTag.slice(1).trim().toLowerCase();
      const openIndex = stack.findLastIndex((node) => node.tag === closingTag);
      if (openIndex > 0) {
        stack.length = openIndex;
      }
      continue;
    }

    const selfClosing = rawTag.endsWith("/");
    const body = selfClosing ? rawTag.slice(0, -1) : rawTag;
    const nameMatch = /^([a-zA-Z][-a-zA-Z0-9:]*)/.exec(body);

    if (nameMatch === null) {
      // ไม่ใช่ tag ที่ถูกต้อง — คืนเป็นข้อความดิบ ไม่ทิ้งเงียบ
      pushText(`<${rawTag}>`);
      continue;
    }

    const tag = nameMatch[1].toLowerCase();
    const attrs = parseAttributes(body.slice(nameMatch[1].length));

    // ปิด tag เดิมอัตโนมัติเมื่อเจอ tag ที่ซ้อนตัวเองไม่ได้
    if (AUTO_CLOSE_SELF.has(tag)) {
      const sameIndex = stack.findLastIndex((node) => node.tag === tag);
      if (sameIndex > 0) stack.length = sameIndex;
    }
    if (TABLE_CELL_TAGS.has(tag)) {
      const cellIndex = stack.findLastIndex((node) => TABLE_CELL_TAGS.has(node.tag));
      if (cellIndex > 0) stack.length = cellIndex;
    }

    const element: HtmlElementNode = { kind: "element", tag, attrs, children: [] };
    stack[stack.length - 1].children.push(element);

    if (!selfClosing && !VOID_TAGS.has(tag)) {
      stack.push(element);
    }
  }

  return root.children;
}
