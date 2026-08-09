import type { Metadata } from "next";

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lgsubscribe-jame.vercel.app";

export const siteConfig = {
  name: "LG Subscribe Thailand",
  shortName: "LG Subscribe",
  title: "LG Subscribe Thailand | เช่าใช้เครื่องใช้ไฟฟ้า พร้อมบริการดูแลถึงบ้าน",
  description:
    "เช่าใช้เครื่องใช้ไฟฟ้า LG แบบชำระรายเดือน ไม่กันวงเงินบัตร พร้อมบริการดูแลโดยช่าง LG ถึงบ้านและการคุ้มครองตลอดอายุสัญญา",
  url: rawSiteUrl.replace(/\/$/, ""),
  lineId: "@lgsubscribe",
  lineUrl: "https://line.me/R/ti/p/%40lgsubscribe",
  phoneNumbers: [
    { label: "084-974-8429", href: "tel:+66849748429" },
    { label: "086-551-5949", href: "tel:+66865515949" },
  ],
  email: "lgsubscribe.th@gmail.com",
  offerReviewedAt: "9 สิงหาคม 2569",
  keywords: [
    "LG Subscribe",
    "เช่าใช้เครื่องใช้ไฟฟ้า",
    "ผ่อนเครื่องใช้ไฟฟ้า LG",
    "ผ่อนทีวี LG",
    "ผ่อนตู้เย็น LG",
    "ผ่อนเครื่องซักผ้า LG",
    "LG PuriCare",
    "บริการช่าง LG ถึงบ้าน",
    "LG Subscribe ดีไหม",
    "LG Subscribe ไม่มีบัตรเครดิต",
    "LG Subscribe ยกเลิกสัญญา",
  ],
} as const;

export const navigation = [
  { href: "/", label: "หน้าแรก" },
  { href: "/products/", label: "สินค้าทั้งหมด" },
  { href: "/authorized/", label: "ความน่าเชื่อถือ" },
  { href: "/terms/", label: "เงื่อนไขการเช่าใช้" },
  { href: "/contact/", label: "ติดต่อเรา" },
] as const;

export type Product = {
  slug: string;
  name: string;
  model: string;
  category: string;
  description: string;
  monthlyPrice: number | null;
  contractMonths: number | null;
  warrantyYears: number | null;
  /** Exact product packshot from the matching official LG product page. */
  image: string;
  /** Official LG page used to verify both the model code and product artwork. */
  imageSource: string;
  /** Official LG Thailand source confirming this model is offered through Subscription. */
  subscriptionSource: string;
  highlights: string[];
};

export const products: Product[] = [
  {
    slug: "lg-puricare-wd516",
    name: "เครื่องกรองน้ำ LG PuriCare รุ่น WD516",
    model: "WD516AN",
    category: "เครื่องกรองน้ำ",
    description:
      "เครื่องกรองน้ำดีไซน์บางแบบมินิมอล พร้อมการดูแลเปลี่ยนไส้กรองตามรอบโดยทีมบริการ",
    monthlyPrice: 149,
    contractMonths: 84,
    warrantyYears: 7,
    image: "/images/products/official/puricare-wd516an-aslplmt.jpg",
    imageSource: "https://www.lg.com/th/water-purifiers/wd516an-aslplmt/",
    subscriptionSource: "https://www.lg.com/th/subscribe/",
    highlights: ["ดีไซน์ Slim", "น้ำสะอาดพร้อมดื่ม", "ดูแลไส้กรองตามรอบ"],
  },
  {
    slug: "lg-front-load-fv1413s4m",
    name: "เครื่องซักผ้าฝาหน้า LG 13 กก. AI DD™",
    model: "FV1413S4M",
    category: "เครื่องซักผ้า",
    description:
      "เครื่องซักผ้าฝาหน้าระบบ AI DD™ วิเคราะห์เนื้อผ้าและรองรับการควบคุมผ่านสมาร์ทโฟน",
    monthlyPrice: 299,
    contractMonths: 72,
    warrantyYears: 6,
    image: "/images/products/official/washer-fv1413s4m.jpg",
    imageSource: "https://www.lg.com/th/laundry/front-load-washing-machine/fv1413s4m/",
    subscriptionSource:
      "https://www.lg.com/th/laundry/front-load-washing-machine/fv1413s4m/lgsubscribe-buy/",
    highlights: ["ความจุ 13 กก.", "AI DD™", "Smart Wi-Fi Control"],
  },
  {
    slug: "lg-cordzero-a9t-ultra",
    name: "เครื่องดูดฝุ่น LG CordZero™ All-in-One Tower",
    model: "A9T-ULTRA",
    category: "เครื่องดูดฝุ่น",
    description:
      "เครื่องดูดฝุ่นไร้สายพร้อม All-in-One Tower จัดเก็บ ชาร์จ และกำจัดฝุ่นได้ในจุดเดียว",
    monthlyPrice: null,
    contractMonths: null,
    warrantyYears: null,
    image: "/images/products/official/vacuum-a9t-ultra.jpg",
    imageSource: "https://www.lg.com/th/vacuum-cleaner/cordless-vacuum-cleaner/a9t-ultra/",
    subscriptionSource: "https://www.lg.com/th/subscribe/",
    highlights: ["All-in-One Tower", "Smart Wi-Fi", "มีหัวถูพื้น"],
  },
];

export const faqs = [
  {
    question: "LG Subscribe คืออะไร?",
    answer:
      "บริการเช่าใช้เครื่องใช้ไฟฟ้า LG แบบชำระรายเดือน พร้อมบริการดูแลตามแพ็กเกจตลอดอายุสัญญา ช่วยให้เข้าถึงสินค้าพรีเมียมโดยไม่ต้องชำระเงินก้อนใหญ่ครั้งเดียว",
  },
  {
    question: "ต้องใช้บัตรเครดิตหรือกันวงเงินบัตรหรือไม่?",
    answer:
      "ช่องทางชำระและเกณฑ์อนุมัติขึ้นอยู่กับเงื่อนไขของบริษัทและแพ็กเกจที่เลือก กรุณาตรวจสอบรายละเอียดกับเจ้าหน้าที่ก่อนยืนยันสัญญา",
  },
  {
    question: "มีบริการซ่อมและบำรุงรักษาหรือไม่?",
    answer:
      "มีบริการดูแลโดยทีมช่างตามขอบเขตของแพ็กเกจและระยะสัญญา รายละเอียดความคุ้มครองของสินค้าแต่ละกลุ่มอาจแตกต่างกัน",
  },
  {
    question: "สมัครใช้บริการอย่างไร?",
    answer:
      "เลือกสินค้าที่สนใจ แล้วติดต่อฝ่ายขายผ่าน LINE OA @lgsubscribe จากนั้นเจ้าหน้าที่จะอธิบายแพ็กเกจ เอกสาร และขั้นตอนพิจารณาก่อนทำสัญญา",
  },
] as const;

export function createPageMetadata({
  title,
  description,
  path,
  image = "/brand/lg-logo-social.png",
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
}): Metadata {
  const canonicalPath = path.startsWith("/") ? path : `/${path}`;
  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      type: "website",
      locale: "th_TH",
      siteName: siteConfig.shortName,
      images: [{ url: image, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
