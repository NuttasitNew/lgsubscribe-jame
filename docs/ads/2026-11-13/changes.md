# 13 พ.ย. 2569 — เปิดแคมเปญ Maxcon คำสินค้า (LG Subscribe)

บัญชี: Lg Authorized Dealer (758-859-7274)

## Thesis

คนที่ค้น "ชื่อสินค้า + LG" (เครื่องซักผ้า lg, ตู้เย็น lg, แอร์ lg ฯลฯ) มีเจตนาซื้อชัดพอ
ให้ Google ประมูลหา conversion (Contacts = กดติดต่อ LINE/โทร) เองได้ โดยคุมไม่ให้จ่ายต่อคลิกแพงเกิน

Baseline: ต.ค. ฿14,862 / 24 conv = ฿619 ต่อ conv ; Campaign #1 7 วันล่าสุด ฿240 ต่อ conv

## สิ่งที่สร้าง

| รายการ | ค่า |
|---|---|
| แคมเปญ | `LG Product \| Search \| Maxcon tCPA \| Nov 2026` (ID 24461111180) |
| งบ | ฿200/วัน |
| ประมูล | portfolio `LG Product Maxcon tCPA240 cap30` — Target CPA ฿240, **max CPC ฿30** |
| เครือข่าย | Google Search อย่างเดียว (ปิด Search partners, Display) |
| พื้นที่ | ไทย, Presence (คนที่อยู่ในไทย) |
| AI Max / text customization / final URL expansion | ปิดทั้งหมด |
| Keywords (7) | แอร์ lg, เครื่องอบผ้า lg, เครื่องซักผ้า lg, ตู้เย็น lg, เครื่องฟอกอากาศ lg, lg washtower, เครื่องกรองน้ำ lg |
| Negative (25, broad, ระดับแคมเปญ) | ซ่อม, มือสอง, อะไหล่, คู่มือ, อาการเสีย, error, ล้างแอร์, สมัครงาน, สมัครตัวแทน, shopee, lazada, โลตัส, บิ๊กซี, ศรีสวัสดิ์, iphone, ไอโฟน, มือถือ, โทรศัพท์, พัดลมแอร์, แอร์เคลื่อนที่, ตู้แช่, malaysia, login, call center, คอลเซ็นเตอร์ |
| Sitelinks | ดูสินค้าและแพ็กเกจ, ติดต่อและแอด LINE, ตู้เย็น, เครื่องซักผ้า, แอร์ (ไม่ใส่ "สั่งซื้อ-สอบถามข้อมูล" ที่เคยถูกตีกลับ) |

## โฆษณา

1. **RSA หลัก (Enabled)** → `/products/` path `LG-Subscribe/รายเดือน` — Ad Strength **Good** (ตอนสร้าง)
   ไม่มีคำว่า "ผ่อน", ไม่มีเบอร์โทร, ระบุ "ตัวแทน" + รหัส LGF216232
2. **RSA โปร Subscribe Day ลด 15% (Enabled 13 พ.ย. หลังเว็บ deploy)** → `/subscribe-day/` path `Subscribe-Day/โปรลด15` — Ad Strength Poor
   - พักไว้เพราะ ณ วันนี้ `/subscribe-day/` บน production redirect ไปหน้าแรก (โปรเก่าจบแล้ว) ;
     ถ้าเปิดตอนนี้ โฆษณาบอกลด 15% แต่หน้าเว็บไม่มีโปร = เสี่ยงโดน policy และลูกค้างง
   - 13 พ.ย.: เว็บธีมใหม่ deploy แล้ว (`/subscribe-day/` ตอบ 200, มี "ขยายเวลาถึง 15 พ.ย. 69 / ลด 15%") → เปิดโฆษณาแล้ว

## กฎอัตโนมัติ

| กฎ | เงื่อนไข | ความถี่ |
|---|---|---|
| Stop-loss | แคมเปญนี้ Cost > ฿1,499.99 และ Conversions < 0.5 (ข้อมูล All time) → Pause campaign | ทุกชั่วโมง |
| Pause promo ad | หยุด RSA โปร 15% | ครั้งเดียว 16 พ.ย. 2569 00:00–01:00 |

## เกณฑ์ตัดสิน (ตกลงไว้ล่วงหน้า)

- ทบทวน **27 พ.ย. 2569** (14 วัน)
- ผ่าน: ต้นทุนต่อ conversion < ฿240 → ค่อยขยับงบ
- ไม่ผ่าน: ≥ ฿240 → ดู search terms ก่อน ว่าพังที่คำ (เพิ่ม negative) หรือที่หน้าเว็บ
- ใช้ไป ฿1,500 ยังไม่มี conversion → กฎหยุดให้เอง

## ยังไม่ได้ทำ / ต้องทำต่อ

- ยืนยันตัวตนผู้ลงโฆษณา (Advertiser verification) ภายใน **9 ธ.ค. 2569** — เจ้าของบัญชีต้องทำเอง
- ส่ง "ใครซื้อจริง" กลับ Google: เว็บเก็บ gclid แล้ว (`lib/analytics/attribution.ts`) แต่ปิดการขายใน LINE
  จึงต้องมีรหัสอ้างอิงในข้อความ LINE ก่อน แล้วอัปโหลด offline conversion ด้วย `docs/ads/sales-ledger-template.csv`
- Final URL ระดับ keyword ไปหน้าหมวดสินค้า (ตอนนี้ทุกคำลง `/products/`)
- แคมเปญโปรเดิม `LG Subscribe Day | Promo | 31Oct-11Nov 2026` จบไปแล้ว 11 พ.ย. — ยังไม่ได้ต่ออายุ
