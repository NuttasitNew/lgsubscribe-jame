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
  ],
} as const;

export const navigation = [
  { href: "/", label: "หน้าแรก" },
  { href: "/products/", label: "สินค้าทั้งหมด" },
  { href: "/faq/", label: "คำถามที่พบบ่อย" },
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
  /** LG Subscribe source used together with the supplied catalog to verify sales context. */
  subscriptionSource: string;
  highlights: string[];
  /** Public promotion still used as the catalog thumbnail when this model has a matched asset. */
  promotionImage?: string;
  gallery?: ProductGalleryImage[];
  specifications?: { label: string; value: string }[];
  reviews?: ProductReview[];
};

export type ProductGalleryImage = {
  src: string;
  alt: string;
  kind: "official" | "generated" | "promotion";
};

export type CustomerStory = {
  product: string;
  reviewer: string;
  title: string;
  summary: string;
  context: string;
  rating: number;
};

export type ProductReview = CustomerStory;

const washTowerReviews: ProductReview[] = [
  {
    product: "LG WashTower™ WT1410NHEG",
    reviewer: "คุณเมย์",
    title: "ซักและอบจบ ไม่ต้องคอยดูฟ้าฝน",
    summary:
      "ถังใหญ่พอสำหรับเสื้อผ้าทั้งครอบครัว ซักเสร็จแล้วอบต่อได้เลย ช่วยลดเวลางานบ้านในวันที่ฝนตกหรือกลับบ้านดึก",
    context: "ครอบครัว 4 คน · กรุงเทพมหานคร",
    rating: 5,
  },
  {
    product: "LG WashTower™ WT1410NHEG",
    reviewer: "คุณธนา",
    title: "ประหยัดพื้นที่กว่าวางสองเครื่องแยกกัน",
    summary:
      "ชอบแผงควบคุมที่อยู่ตรงกลาง กดใช้งานสะดวกและไม่ต้องเอื้อมสูง ตัวเครื่องแนวตั้งทำให้เหลือพื้นที่เก็บของในห้องซักผ้ามากขึ้น",
    context: "บ้านเดี่ยว · นนทบุรี",
    rating: 5,
  },
  {
    product: "LG WashTower™ WT1410NHEG",
    reviewer: "คุณพิม",
    title: "ดีไซน์สวยและแจ้งเตือนผ่านมือถือได้",
    summary:
      "สีเขียวกับเบจเข้ากับบ้านมากกว่าที่คิด แอปแจ้งเตือนเมื่อทำงานเสร็จช่วยให้จัดเวลาได้ง่าย โดยเฉพาะวันที่ต้องดูแลลูกไปพร้อมกัน",
    context: "ครอบครัวมีเด็กเล็ก · สมุทรปราการ",
    rating: 4,
  },
];

export const customerStories: CustomerStory[] = [
  {
    product: "LG PuriCare Air Purifier",
    reviewer: "คุณออม",
    title: "อากาศในบ้านสะอาดและหายใจสบายขึ้น",
    summary:
      "โหมดสำหรับสัตว์เลี้ยงช่วยจัดการขนและกลิ่นในห้องได้ดีขึ้น เลือกใช้แบบรายเดือนแล้วไม่ต้องกังวลเรื่องการดูแลเครื่องเอง",
    context: "เลี้ยงสุนัข 2 ตัว · กรุงเทพมหานคร",
    rating: 5,
  },
  washTowerReviews[0],
  {
    product: "LG PuriCare Water Purifier",
    reviewer: "คุณฝน",
    title: "ไม่ต้องซื้อน้ำแพ็กเข้าบ้านเป็นประจำ",
    summary:
      "กดน้ำร้อนและน้ำเย็นได้ทันที สะดวกกับบ้านที่มีทั้งเด็กและผู้สูงอายุ และมีเจ้าหน้าที่เข้ามาเปลี่ยนไส้กรองตามรอบ",
    context: "ครอบครัว 4 คน · ปทุมธานี",
    rating: 5,
  },
  {
    product: "LG InstaView™ Refrigerator",
    reviewer: "คุณนัท",
    title: "เริ่มต้นบ้านใหม่โดยไม่ต้องจ่ายเงินก้อนใหญ่",
    summary:
      "เลือกแพ็กเกจรายเดือนแล้วจัดงบแต่งบ้านได้ง่ายขึ้น ฟังก์ชันเคาะดูของด้านในช่วยลดการเปิดตู้เย็นบ่อยและใช้งานสนุกดี",
    context: "คู่แต่งงานใหม่ · ชลบุรี",
    rating: 4,
  },
];

export const products: Product[] = [
  {
    slug: "lg-puricare-wd516",
    name: "เครื่องกรองน้ำ LG PuriCare รุ่น WD516",
    model: "WD516AN",
    category: "เครื่องกรองน้ำ",
    description: "เครื่องกรองน้ำดีไซน์บางแบบมินิมอล พร้อมการดูแลเปลี่ยนไส้กรองตามรอบโดยทีมบริการ",
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
    description: "เครื่องซักผ้าฝาหน้าระบบ AI DD™ วิเคราะห์เนื้อผ้าและรองรับการควบคุมผ่านสมาร์ทโฟน",
    monthlyPrice: 299,
    contractMonths: 72,
    warrantyYears: 6,
    image: "/images/products/official/washer-fv1413s4m.jpg",
    imageSource: "https://www.lg.com/th/laundry/front-load-washing-machine/fv1413s4m/",
    subscriptionSource: "https://www.lg.com/th/laundry/front-load-washing-machine/fv1413s4m/lgsubscribe-buy/",
    highlights: ["ความจุ 13 กก.", "AI DD™", "Smart Wi-Fi Control"],
  },
  {
    slug: "lg-cordzero-a9t-ultra",
    name: "เครื่องดูดฝุ่น LG CordZero™ All-in-One Tower",
    model: "A9T-ULTRA",
    category: "เครื่องดูดฝุ่น",
    description: "เครื่องดูดฝุ่นไร้สายพร้อม All-in-One Tower จัดเก็บ ชาร์จ และกำจัดฝุ่นได้ในจุดเดียว",
    monthlyPrice: null,
    contractMonths: null,
    warrantyYears: null,
    image: "/images/products/official/vacuum-a9t-ultra.jpg",
    imageSource: "https://www.lg.com/th/vacuum-cleaner/cordless-vacuum-cleaner/a9t-ultra/",
    subscriptionSource: "https://www.lg.com/th/subscribe/",
    highlights: ["All-in-One Tower", "Smart Wi-Fi", "มีหัวถูพื้น"],
  },
  {
    slug: "lg-washtower-wt1410nheg",
    name: "LG WashTower™ รุ่น WT1410NHEG",
    model: "WT1410NHEG",
    category: "เครื่องซักและอบผ้า",
    description:
      "WashTower™ รวมเครื่องอบและเครื่องซักไว้ในตัวเดียว พร้อมแผงควบคุมตรงกลาง AI DD™, TurboWash™ 360 และการควบคุมผ่าน LG ThinQ™",
    monthlyPrice: null,
    contractMonths: null,
    warrantyYears: null,
    image: "/images/products/official/wt1410nheg/01-front.jpeg",
    imageSource: "https://www.lg.com/th/laundry/wash-tower/wt1410nheg/",
    subscriptionSource: "https://www.lg.com/th/laundry/wash-tower/wt1410nheg/",
    highlights: [
      "ซัก 14 กก. / อบ 10 กก.",
      "AI DD™ และ Smart Pairing™",
      "TurboWash™ 360 และ Dry Ready",
      "Allergy Care และ ThinQ™",
    ],
    gallery: [
      {
        src: "/images/products/official/wt1410nheg/01-front.jpeg",
        alt: "LG WashTower WT1410NHEG มุมมองด้านหน้า",
        kind: "official",
      },
      {
        src: "/images/products/official/wt1410nheg/02-front-open.jpeg",
        alt: "LG WashTower WT1410NHEG เปิดประตูเครื่องซักและเครื่องอบ",
        kind: "official",
      },
      ...Array.from({ length: 13 }, (_, index) => ({
        src: `/images/products/official/wt1410nheg/${String(index + 3).padStart(2, "0")}-gallery.jpg`,
        alt: `รายละเอียด LG WashTower WT1410NHEG ภาพที่ ${index + 3}`,
        kind: "official" as const,
      })),
      {
        src: "/images/products/official/wt1410nheg/16-lifestyle-generated.png",
        alt: "ภาพจำลอง LG WashTower WT1410NHEG ในมุมซักผ้าสมัยใหม่",
        kind: "generated",
      },
    ],
    specifications: [
      { label: "ความจุซัก", value: "14 กก." },
      { label: "ความจุอบ", value: "10 กก." },
      { label: "ขนาด (กว้าง × สูง × ลึก)", value: "600 × 1,655 × 660 มม." },
      { label: "ความลึกเมื่อเปิดประตู 90°", value: "1,180 มม." },
      { label: "น้ำหนัก", value: "128 กก." },
      { label: "การเชื่อมต่อ", value: "ThinQ™ (Wi-Fi)" },
      { label: "ระบบซัก", value: "AI DD™ / 6 Motion DD" },
      { label: "ระบบอบ", value: "DUAL Inverter HeatPump™" },
    ],
    reviews: washTowerReviews,
  },
];

export const faqs = [
  {
    question: "LG Subscribe คืออะไร?",
    answer:
      "LG Subscribe คือบริการที่ให้คุณเลือกใช้เครื่องใช้ไฟฟ้า LG พร้อมชำระค่าใช้จ่ายเป็นรายเดือนตามระยะเวลาของสัญญา โดยมีบริการดูแลและความคุ้มครองตามเงื่อนไขที่กำหนด",
  },
  {
    question: "LG Subscribe ต่างจากการซื้อเครื่องใช้ไฟฟ้าทั่วไปอย่างไร?",
    answer:
      "คุณไม่จำเป็นต้องจ่ายค่าสินค้าเต็มจำนวนในครั้งเดียว สามารถแบ่งชำระเป็นรายเดือน ทำให้บริหารค่าใช้จ่ายได้ง่ายขึ้น และไม่ต้องนำเงินก้อนมาใช้ซื้อสินค้า และได้ประกันสินค้าตลอดอายุสัญญา",
  },
  {
    question: "สมัคร LG Subscribe ต้องใช้เงินก้อนไหม?",
    answer:
      "ไม่ต้องจ่ายราคาสินค้าเต็มจำนวนในครั้งเดียว คุณสามารถเริ่มต้นใช้งานด้วยการชำระตามเงื่อนไขของแพ็กเกจและผ่อนชำระเป็นรายเดือน",
  },
  {
    question: "LG Subscribe ต้องใช้วงเงินบัตรเครดิตเต็มราคาสินค้าหรือไม่?",
    answer:
      "ไม่ใช่การผ่อนชำระแบบที่ต้องกันวงเงินบัตรเครดิตเต็มมูลค่าสินค้า ลูกค้าจึงสามารถเก็บวงเงินบัตรเครดิตไว้ใช้สำหรับค่าใช้จ่ายอื่นได้ ทั้งนี้ ช่องทางการชำระเงินและเงื่อนไขเป็นไปตามที่กำหนด",
  },
  {
    question: "ต้องมีบัตรเครดิตเพื่อสมัคร LG Subscribe หรือไม่?",
    answer:
      "ช่องทางการชำระเงินขึ้นอยู่กับแพ็กเกจและเงื่อนไขที่กำหนด โดยสามารถมีช่องทางอื่นนอกเหนือจากบัตรเครดิต เช่น การหักบัญชีธนาคาร และบัตรเดบิต สำหรับช่องทางที่รองรับ",
  },
  {
    question: "ค่าบริการ LG Subscribe ชำระอย่างไร?",
    answer:
      "ชำระเป็นรายเดือนตามจำนวนเงินและระยะเวลาที่ระบุไว้ในสัญญา โดยระบบจะดำเนินการเรียกเก็บผ่านช่องทางการชำระเงินที่ลูกค้าเลือกและรองรับ",
  },
  {
    question: "ถ้าเครื่องเสียระหว่างสัญญาต้องทำอย่างไร?",
    answer:
      "สามารถติดต่อ LG เพื่อขอรับบริการตรวจสอบและซ่อม โดยสิทธิ์ในการรับบริการจะเป็นไปตามเงื่อนไขการรับประกันและแพ็กเกจที่สมัคร",
  },
  {
    question: "LG Subscribe มีการรับประกันและบริการดูแลหรือไม่?",
    answer:
      "มีบริการรับประกันและดูแลสินค้าตามเงื่อนไขของสินค้าและสัญญา โดยรายละเอียดความคุ้มครองอาจแตกต่างกันตามรุ่นและแพ็กเกจ",
  },
  {
    question: "เมื่อชำระครบตามสัญญาแล้ว เครื่องจะเป็นของใคร?",
    answer:
      "เมื่อชำระค่างวดครบถ้วนตามเงื่อนไขของสัญญา กรรมสิทธิ์ในสินค้าจะโอนให้ลูกค้าตามข้อกำหนดของสัญญา",
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
