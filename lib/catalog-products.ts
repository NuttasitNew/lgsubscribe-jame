import { attachPromotionImage } from "@/lib/promotion-images";
import { productKnowledgeGuides } from "@/lib/product-knowledge";
import { products as featuredProducts, type Product } from "@/lib/site";
import { getSubscriptionStartingPrice } from "@/lib/subscription-starting-prices";

type CatalogProductSource = {
  name: string;
  description: string;
  image: string;
  officialUrl: string;
  officialModel?: string;
};

const catalogProductSources: Record<string, CatalogProductSource> = {
  SEQ13A: {
    name: "แอร์อินเวอร์เตอร์ 12,200 BTU LG DUALCOOL AI Air รุ่น SEQ",
    description:
      "แอร์อินเวอร์เตอร์ LG DUALCOOL AI Air รุ่น SEQ13A ขนาด 12,200 Btu Dual Inverter ประหยัดพลังงาน ทนทานรับประกันนาน 10 ปี",
    image: "/images/products/lg-catalog/seq13a.jpg",
    officialUrl: "https://www.lg.com/th/air-conditioner-inverter/air-conditioner-with-air-purifier/seq13a/",
  },
  SAQ13A: {
    name: "แอร์อินเวอร์เตอร์ 12,000 BTU LG DUALCOOL AI Air รุ่น SAQ",
    description:
      "แอร์อินเวอร์เตอร์ LG DUALCOOL AI Air รุ่น SAQ13A ขนาด 12,000 BTU AI Air ปรับอุณหภูมิ ทิศทางลม และแรงลมอัตโนมัติ แอร์อัจฉริยะที่รู้ใจคุณ",
    image: "/images/products/lg-catalog/saq13a.jpg",
    officialUrl: "https://www.lg.com/th/air-conditioner-inverter/energy-saving-air-conditioner/saq13a/",
  },
  AS10GDBY0: {
    name: "เครื่องฟอกอากาศ LG PuriCare 360 รุ่น AS10GDBY0 พร้อมฟังก์ชันสัตว์เลี้ยง",
    description:
      "เครื่องฟอกอากาศ LG PuriCare New 360 รุ่น AS10GDBY0 สีเบญ ด้วยเทคโนโลยีใบพัดแบบอากาศยานจึงสามารถส่งลมได้กว้างขึ้นและลดเสียงขณะทำงาน เหนือกว่าด้วยการกรองหลายขั้นตอน กำจัดเชื้อไวรัสและแบคทีเรียได้ 99.9% ฟอกฝุ่น PM1.0 ได้ถึง 99.999% กำจัดสารก่อภูมิแพ้ได้ 99% พร้อมฟิลเตอร์ Safe Plus ที่ง่ายต่อการถอดล้างทำความสะอาด",
    image: "/images/products/lg-catalog/as10gdby0.jpg",
    officialUrl: "https://www.lg.com/th/air-puricare/puricare-360/as10gdby0/",
  },
  AS65GDBY0: {
    name: "เครื่องฟอกอากาศ LG PuriCare 360 รุ่น AS65GDBY0 พร้อมฟังก์ชันสัตว์เลี้ยง",
    description:
      "เครื่องฟอกอากาศ LG PuriCare New 360 รุ่น AS65GDBY0 สีเบญ ด้วยเทคโนโลยีใบพัดแบบอากาศยานจึงสามารถส่งลมได้กว้างขึ้นและลดเสียงขณะทำงาน เหนือกว่าด้วยการกรองหลายขั้นตอน กำจัดเชื้อไวรัสและแบคทีเรียได้ 99.9% ฟอกฝุ่น PM1.0 ได้ถึง 99.999% กำจัดสารก่อภูมิแพ้ได้ 99% พร้อมฟิลเตอร์ Safe Plus ที่ง่ายต่อการถอดล้างทำความสะอาด",
    image: "/images/products/lg-catalog/as65gdby0.jpg",
    officialUrl: "https://www.lg.com/th/air-puricare/puricare-360/as65gdby0/",
  },
  AS55GGSY0: {
    name: "เครื่องฟอกอากาศ LG PuriCare™ AeroBooster รุ่นสัตว์เลี้ยง",
    description:
      "เครื่องฟอกอากาศ LG PuriCare™ AeroBooster รุ่นสัตว์เลี้ยง พร้อมระบบฟอกอากาศและการควบคุมผ่าน LG ThinQ™",
    image: "/images/products/lg-catalog/as55ggsy0.jpg",
    officialUrl: "https://www.lg.com/hk_en/puricare-air-care/air-purifier/as55ggsy0/",
  },
  AS60GHWG0: {
    name: "เครื่องฟอกอากาศ LG PuriCare 360 Hit รุ่น AS60GHWG0",
    description:
      "เครื่องฟอกอากาศ LG PuriCare 360 Hit ทันสมัย กรองฝุ่น PM 2.5 ได้ 360 องศา ลดสารก่อภูมิแพ้ กลิ่นไม่พึงประสงค์ ซื้อสินค้าและดูรายละเอียดเพิ่มเติมได้ที่นี่",
    image: "/images/products/lg-catalog/as60ghwg0.jpg",
    officialUrl: "https://www.lg.com/th/air-puricare/puricare-360/as60ghwg0/",
  },
  AS25GCBY0: {
    name: "เครื่องฟอกอากาศ LG PuriCare AeroCat Tower รุ่น AS25GCBY0",
    description: "เครื่องฟอกอากาศ LG PuriCare AeroCat Tower รุ่น AS25GCBY0 ฟอกอากาศสะอาด แถมใส่ใจเจ้าเหมียว",
    image: "/images/products/lg-catalog/as25gcby0.jpg",
    officialUrl: "https://www.lg.com/th/air-puricare/puricare-aerotower/as25gcby0/",
  },
  AS35GGW10: {
    name: "เครื่องฟอกอากาศ LG PuriCare AeroHit รุ่น AS35GGW10",
    description:
      "สำรวจ LG AS35GGW10. คลิกเพื่อดูรูปภาพ รีวิว และสเปคทางเทคนิคสำหรับ LG เครื่องฟอกอากาศ LG PuriCare AeroHit รุ่น AS35GGW10.",
    image: "/images/products/lg-catalog/as35ggw10.jpg",
    officialUrl: "https://www.lg.com/th/air-puricare/puricare-360/as35ggw10/",
  },
  DD23GMWE1: {
    name: "เครื่องลดความชื้น LG PuriCare Dehumidifier 23 รุ่น DD23GMWE1 40 ลิตร",
    description:
      "เครื่องลดความชื้น LG PuriCare รุ่น DD23GMWE1 ลดความชื้นสูงสุด 40 ลิตรต่อวันภายใต้เงื่อนไขทดสอบ พร้อม DUAL Inverter และ LG ThinQ™",
    image: "/images/products/lg-catalog/dd23gmwe1.jpg",
    officialUrl: "https://www.lg.com/th/dehumidifier/dd23gmwe1/",
  },
  DFC533FV: {
    name: "เครื่องล้างจาน DFC533FV สีเงิน WI-FI control",
    description:
      "เครื่องล้างจานรุ่น DFC533FV สีเงิน ล้างทำความสะอาดด้วยระบบ TrueSteam ไอน้ำบริสุทธิ์กำจัดแบคทีเรียและเชื้อโรคแบบ 4 ทิศทางปรับระดับแรงดันน้ำได้",
    image: "/images/products/lg-catalog/dfc533fv.jpg",
    officialUrl: "https://www.lg.com/th/dishwasher/dfc533fv/",
  },
  DFC335HM: {
    name: "เครื่องล้างจาน DFC335HM สีดำ มี WI-FI control",
    description:
      "เครื่องล้างจาน DFC335HM สีดำ ล้างทำความสะอาดด้วยระบบ TrueSteam ไอน้ำบริสุทธิ์กำจัดแบคทีเรียและเชื้อโรคแบบ 4 ทิศทางปรับระดับแรงดันน้ำได้ ไม่ส่งเสียงรบกวน",
    image: "/images/products/lg-catalog/dfc335hm.jpg",
    officialUrl: "https://www.lg.com/th/dishwasher/dfc335hm/",
  },
  MS4295DIS: {
    name: "ไมโครเวฟระบบอุ่นอาหาร รุ่น MS4295DIS ขนาด 42 ลิตร สีดำ",
    description:
      "ไมโครเวฟระบบอุ่นอาหาร ขนาด 42 ลิตร สีดำ รุ่น MS4295DIS ดีไซน์กระจกบานเดียวไร้ขอบ ทำความสะอาดง่าย มีไฟส่องอาหาร เทคโนโลยี Smart Inverter ทำงานสม่ำเสมอ",
    image: "/images/products/lg-catalog/ms4295dis.jpg",
    officialUrl: "https://www.lg.com/th/microwave-ovens/solo-microwave/mc4295dis/",
  },
  X257CMEW: {
    name: "ตู้เย็น Instaview Side by Side 22.4 คิว GC-X257CMEW Smart Inverter Compressor™",
    description:
      "สำรวจ LG GC-X257CMEW. คลิกเพื่อดูรูปภาพ รีวิว และสเปคทางเทคนิคสำหรับ LG ตู้เย็น Instaview Side by Side 22.4 คิว GC-X257CMEW Smart Inverter Compressor™.",
    image: "/images/products/lg-catalog/x257cmew.jpg",
    officialUrl: "https://www.lg.com/th/refrigerators/side-by-side-refrigerator/gc-x257cmew/",
  },
  X257CMHW: {
    name: "ตู้เย็น Multi-Door รุ่น GC-X257CMHW ขนาด 22.4 คิว ระบบ Inverter Compressor",
    description:
      "ตู้เย็น Side-by-side 22.4 คิว รุ่น GC-X257CMHW ระบบ Smart Inverter Compressor Instaview เคาะ2ครั้งเผื่อเห็นด้านใน FRESH Converter™ ช่องตั้งค่าอุณหภูมิตามอาหารที่แช่",
    image: "/images/products/lg-catalog/x257cmhw.jpg",
    officialUrl: "https://www.lg.com/th/refrigerators/side-by-side-refrigerator/gc-x257cmhw/",
  },
  L257KQKW: {
    name: "ตู้เย็น Side by Side GC-L257KQKW 22.4 คิว",
    description:
      "สำรวจ LG GC-L257KQKW. คลิกเพื่อดูรูปภาพ รีวิว และสเปคทางเทคนิคสำหรับ LG ตู้เย็น Side by Side GC-L257KQKW 22.4 คิว.",
    image: "/images/products/lg-catalog/l257kqkw.jpg",
    officialUrl: "https://www.lg.com/th/refrigerators/side-by-side-refrigerator/gc-l257kqkw/",
  },
  X24FFCRB: {
    name: "ตู้เย็น Multi-Door รุ่น GC-X24FFCRB ขนาด 22.5 คิว ระบบ Smart Inverter Compressor",
    description:
      "ตู้เย็น Multi-Door 22.5 คิว รุ่น GC-X24FFCRB ระบบ Smart Inverter Compressor พร้อมคงความสดของอาหารได้ยาวนานถึง 7 วัน",
    image: "/images/products/lg-catalog/x24ffcrb.jpg",
    officialUrl: "https://www.lg.com/th/refrigerators/multi-door-refrigerator/gc-x24ffcrb/",
  },
  G24FFQKB: {
    name: "ตู้เย็น Instaview Multi-Door 22.5 คิว GC-G24FFQKB Smart Inverter Compressor",
    description:
      "ตู้เย็น Multi-Door 22.5 คิว รุ่น GC-G24FFQKB ระบบ Smart Inverter Compressor เพียงเคาะ 2 ครั้ง ก็เห็นอาหารด้านใน พร้อมคงความสดของอาหารได้ยาวนานถึง 7 วัน",
    image: "/images/products/lg-catalog/g24ffqkb.jpg",
    officialUrl: "https://www.lg.com/th/refrigerators/multi-door-refrigerator/gc-g24ffqkb/",
  },
  S3MFC: {
    name: "LG Styler ตู้ถนอมผ้า รุ่น S3MFC",
    description:
      "สำรวจ LG S3MFC. คลิกเพื่อดูรูปภาพ รีวิว และสเปคทางเทคนิคสำหรับ LG LG Styler ตู้ถนอมผ้า รุ่น S3MFC.",
    image: "/images/products/lg-catalog/s3mfc.jpg",
    officialUrl: "https://www.lg.com/th/laundry/styler/s3mfc/",
  },
  S5G0C: {
    name: "ตู้ถนอมผ้า LG Styler รุ่น S5GOC ความจุ 5 เซต ขจัดเชื้อโรค ลดรอยยับและกลิ่นอับ ควบคุมผ่านมือถือด้วย ThinQ ครบวงจรเรื่องการดูแลเสื้อผ้า",
    description:
      "ตู้ถนอมผ้า LG Styler ดีไซน์สวยงาม อบผ้าแห้งสะอาด ลดรอยยับ ฆ่าเชื้อบนเนื้อผ้า ถนอมเนื้อผ้าลดกลิ่น โดยไม่ต้องซัก ซื้อสินค้าและดูรายละเอียดเพิ่มเติมที่นี่",
    image: "/images/products/lg-catalog/s5g0c.jpg",
    officialUrl: "https://www.lg.com/th/laundry/styler/s5goc/",
    officialModel: "S5GOC",
  },
  QNED86B: {
    name: 'ทีวี 55" LG QNED evo AI Mini LED QNED86 4K Smart TV 2026 รุ่น 55QNED86BSA',
    description:
      "ทีวี AI อัจฉริยะรุ่นใหม่ล่าสุดจาก LG รุ่น 55QNED86BS เพื่อประสบการณ์การรับชมที่ดีที่สุดที่ปรับแต่งให้เหมาะกับคุณผ่านคุณสมบัติ AI อัจฉริยะของแพลตฟอร์ม webOS คลิกเพื่อดูรูปภาพ รีวิว และข้อมูลจำเพาะทางเทคนิคของ LG QNED evo AI QNED86 Mini LED 4K Smart TV ขนาด 55 นิ้ว",
    image: "/images/products/lg-catalog/qned86b.jpg",
    officialUrl: "https://www.lg.com/th/tv-soundbars/qned-evo/55qned86bsa/",
    officialModel: "55QNED86BSA",
  },
  QNED80B: {
    name: 'ทีวี 55" LG QNED evo AI Mini LED QNED80 4K Smart TV 2026 รุ่น 55QNED80BSA',
    description:
      "ค้นพบทีวี AI อัจฉริยะรุ่นใหม่ล่าสุดจาก LG รุ่น 55QNED80BSA เพื่อประสบการณ์การรับชมที่ดีที่สุดที่ปรับแต่งให้เหมาะกับคุณผ่านคุณสมบัติ AI อัจฉริยะของแพลตฟอร์ม webOS คลิกเพื่อดูภาพ รีวิว และข้อมูลจำเพาะทางเทคนิคของ LG QNED evo AI QNED80 Mini LED 4K Smart TV ขนาด 55 นิ้ว",
    image: "/images/products/lg-catalog/qned80b.jpg",
    officialUrl: "https://www.lg.com/th/tv-soundbars/qned-evo/55qned80bsa/",
    officialModel: "55QNED80BSA",
  },
  NU855B: {
    name: 'ทีวี 55" LG NANO 4K UHD AI NU85 4K Smart TV 2026 รุ่น 55NU855BPSA',
    description:
      "ทีวี AI อัจฉริยะรุ่นใหม่ล่าสุดจาก LG รุ่น 55NU855BPSA เพื่อประสบการณ์การรับชมที่ดีที่สุดที่ปรับแต่งให้เหมาะกับคุณผ่านคุณสมบัติ AI อัจฉริยะของแพลตฟอร์ม webOS คลิกเพื่อดูภาพ รีวิว และข้อมูลจำเพาะทางเทคนิคของ LG NANO 4K UHD AI NU85 ทีวี Smart TV 4K ขนาด 55 นิ้ว",
    image: "/images/products/lg-catalog/nu855b.jpg",
    officialUrl: "https://www.lg.com/th/tv-soundbars/nano-4k-uhd/55nu855bpsa/",
    officialModel: "55NU855BPSA",
  },
  S95TR: {
    name: "LG ซาวด์บาร์ สำหรับ TV with Dolby Atmos 9.1.5 channel รุ่น S95TR",
    description:
      "LG ซาวด์บาร์ สำหรับ TV with Dolby Atmos 9.1.5 channel รุ่น S95TR เสียงรอบทิศทาง 9.1.5 ch เต็มอรรถรส เข้ากับ LG ทีวีได้อย่างลงตัว ออกแบบมาเพื่อยกระดับเสียงจากทีวี LG ให้สมบูรณ์แบบ",
    image: "/images/products/lg-catalog/s95tr.jpg",
    officialUrl: "https://www.lg.com/th/speakers/home-theater-soundbar/s95tr/",
  },
  S70TY: {
    name: "ลำโพง SoundBar รุ่น S70TY |3.1.1 ch 400W | Dolby Atmos",
    description: "LG Soundbar สำหรับทีวี พร้อม Dolby Atmos 3.1.1 channel S70TY",
    image: "/images/products/lg-catalog/s70ty.jpg",
    officialUrl: "https://www.lg.com/th/speakers/soundbars/s70ty/",
  },
  GRAB: {
    name: "ลำโพงพกพา LG xboom Grab tuned by will.i.am รุ่น Grab",
    description:
      "ลำโพงพกพา LG xboom Grab ปรับแต่งโดย will.i.am พร้อมโดมทวีตเตอร์จาก Peerless กันน้ำกันฝุ่นระดับ IP67 และเล่นต่อเนื่องสูงสุด 20 ชั่วโมง",
    image: "/images/products/lg-catalog/grab.jpg",
    officialUrl: "https://www.lg.com/th/speakers/xboom/grab/",
  },
  BOUNCE: {
    name: "ลำโพงพกพา LG xboom Bounce by will.i.am รุ่น Bounce",
    description:
      "ลำโพงพกพา LG xboom Bounce ปรับแต่งโดย will.i.am พร้อมทวีตเตอร์โดมคู่ กันน้ำกันฝุ่นระดับ IP67 และเล่นต่อเนื่องสูงสุด 30 ชั่วโมง",
    image: "/images/products/lg-catalog/bounce.jpg",
    officialUrl: "https://www.lg.com/th/speakers/xboom/bounce/",
  },
  STAGE301: {
    name: "LG xboom Stage 301 tuned by will.i.am",
    description:
      "ลำโพงปาร์ตี้ LG xboom Stage 301 ปรับแต่งโดย will.i.am กำลังขับ 120 วัตต์ กันน้ำระดับ IPX4 และเล่นต่อเนื่องสูงสุด 12 ชั่วโมง",
    image: "/images/products/lg-catalog/stage301.jpg",
    officialUrl: "https://www.lg.com/th/speakers/party-speakers/stage301/",
  },
  "StandbyME 2": {
    name: "LG StanbyME2 รุ่น 27LX6TDGA | Super Portable Screen | Motion Art",
    description:
      "LG StanbyME 2 หน้าจอขนาด 27 นิ้ว หน้าจอสัมผัสแบบพกพา สามารถถอดได้ พกพาสะดวก พร้อม USB-C และแบตเตอรี่ในตัว เล่นได้ 4 ชั่วโมง",
    image: "/images/products/lg-catalog/standbyme-2.jpg",
    officialUrl: "https://www.lg.com/th/lifestyle-screens/stanbyme/27lx6tdga/",
    officialModel: "27LX6TDGA",
  },
  "A9T-ULTRA": {
    name: "เครื่องดูดฝุ่น LG CordZero™ รุ่น A9T-ULTRA แบบด้ามจับ All-in-One Tower พร้อม Smart WI-FI control ควบคุมสั่งงานผ่านสมาร์ทโฟน",
    description:
      "สัมผัสพลังการทำความสะอาดด้วยเครื่องดูดฝุ่น Handstick ที่มีดีไซน์ล้ำสมัยและใช้งานง่าย พร้อมเทคโนโลยีใหม่ล่าสุด A9T-ULTRA",
    image: "/images/products/lg-catalog/a9t-ultra.jpg",
    officialUrl: "https://www.lg.com/th/vacuum-cleaner/cordless-vacuum-cleaner/a9t-ultra/",
  },
  "A9T-CORE": {
    name: "เครื่องดูดฝุ่น LG CordZero™ รุ่น A9T-CORE แบบด้ามจับ All-in-One Tower",
    description:
      "เครื่องดูดฝุ่นไร้สาย All-in-One Tower รุ่น A9T-CORE Smart Inverter Motor พร้อมระบบกำจัดฝุ่นอัตโนมัต และแบตเตอรี่แบบ Dual PowerPack™",
    image: "/images/products/lg-catalog/a9t-core.jpg",
    officialUrl: "https://www.lg.com/th/vacuum-cleaner/cordless-vacuum-cleaner/a9t-core/",
  },
  "A9T-LITE": {
    name: "เครื่องดูดฝุ่น LG CordZero™ รุ่น A9T-LITE แบบด้ามจับ All-in-One Tower",
    description:
      "เครื่องดูดฝุ่นไร้สาย All-in-One Tower รุ่น A9T-LITE Smart Inverter Motor พร้อมระบบกำจัดฝุ่นอัตโนมัต และแบตเตอรี่แบบ Dual PowerPack™",
    image: "/images/products/lg-catalog/a9t-lite.jpg",
    officialUrl: "https://www.lg.com/th/vacuum-cleaner/cordless-vacuum-cleaner/a9t-lite/",
  },
  WT1410NHEG: {
    name: "LG WashTower™ รุ่น WT1410NHEG พร้อม AI DD™ และ Smart Wi-Fi Control",
    description:
      "WashTower™ รวมเครื่องซักและเครื่องอบไว้ในดีไซน์แนวตั้ง พร้อมแผงควบคุมตรงกลาง AI DD™, TurboWash™ 360 และการควบคุมผ่าน LG ThinQ™",
    image: "/images/products/lg-catalog/wt1410nheg.jpg",
    officialUrl: "https://www.lg.com/th/laundry/wash-tower/wt1410nheg/",
  },
  WT2116SHEG: {
    name: "WashTower ซักผ้า 21 กก. และอบ 16 กก. รุ่น WT2116SHEG ระบบ AI DD™ พร้อม Smart WI-FI control ควบคุมสั่งงานผ่านสมาร์ทโฟน",
    description:
      "เครื่องซักอบผ้า Wash Tower ความจุซัก 21 กก./อบ 16 กก รุ่น WT2116SHEG ดีไซน์สวยหรูประหยัดพื้นที่ ซักอบจบที่เดียว แผงควบคุมกดได้สะดวก ซื้อและดูรายละเอียดที่นี่",
    image: "/images/products/lg-catalog/wt2116sheg.jpg",
    officialUrl: "https://www.lg.com/th/laundry/wash-tower/wt2116sheg/",
  },
  WT2520NHEG: {
    name: "Wash Tower รุ่น WT2520NHEG ระบบ AI DD™ ความจุเครื่องซักผ้า 25 กก./ เครื่องอบผ้า 20 กก. พร้อม Smart WI-FI control ควบคุมสั่งงานผ่านสมาร์ทโฟน",
    description:
      "Wash Tower ซัก 25 กก./ อบ 20 กก. รุ่น WT2520NHEG ระบบ Inverter Direct Drive ระบบ AIDD ถนอมผ้าอัจฉริยะ ซักผ้าและอบผ้าได้ในเครื่องเดียว",
    image: "/images/products/lg-catalog/wt2520nheg.jpg",
    officialUrl: "https://www.lg.com/th/laundry/wash-tower/wt2520nheg/",
  },
  FV1413H4M: {
    name: "เครื่องซักผ้า 13 กก. / อบ 8 กก. รุ่น FV1413H4M ระบบ AI DD™ พร้อม Smart WI-FI control ควบคุมสั่งงานผ่านสมาร์ทโฟน",
    description:
      "เครื่องซักอบ ซัก13กก./อบ 8กก.FV1413H4M ระบบซักผ้าอัจฉริยะ AIDDTMถนอมเนื้อผ้ามากขึ้น หอมยาวนาน ระบบ Stream ขจัดสารก่อภูมิแพ้ ซื้อสินค้าและดูรายละเอียดที่นี่",
    image: "/images/products/lg-catalog/fv1413h4m.jpg",
    officialUrl: "https://www.lg.com/th/laundry/front-load-washing-machine/fv1413h4m/",
  },
  F2520RNTB: {
    name: "เครื่องซักผ้าฝาหน้า ซัก 20/ อบ 10 กก. F2520RNTB ระบบ AI DD™",
    description:
      "เครื่องซักผ้าฝาหน้า 20 กก./ อบ 10 กก. รุ่น F2520RNTB ระบบ Inverter Direct Drive ระบบ AIDD ถนอมผ้าอัจฉริยะ พร้อมพลังซักทรงพลังและรวดเร็ว",
    image: "/images/products/lg-catalog/f2520rntb.jpg",
    officialUrl: "https://www.lg.com/th/laundry/front-load-washing-machine/f2520rntb/",
  },
  TX2725AT9G: {
    name: "เครื่องซักผ้าฝาบน 25 กก รุ่น TX2725AT9G ระบบ Inverter Direct Drive",
    description:
      "เครื่องซักผ้าฝาบน 25 กก. รุ่น TX2725AT9G ระบบ Inverter Direct Drive ระบบ AIDD ซักสะอาดและรวดเร็วด้วย TurboWash3D™",
    image: "/images/products/lg-catalog/tx2725at9g.jpg",
    officialUrl: "https://www.lg.com/th/laundry/top-load-washing-machine/tx2725at9g/",
  },
  TX2723ST5J: {
    name: "เครื่องซักผ้าฝาบน 23 กก รุ่น TX2723ST5J ระบบ Inverter Direct Drive",
    description:
      "เครื่องซักผ้าฝาบน 23 กก. รุ่น TX2723ST5J ระบบ Inverter Direct Drive ระบบ AIDD ซักสะอาดและรวดเร็วด้วย TurboWash3D™",
    image: "/images/products/lg-catalog/tx2723st5j.jpg",
    officialUrl: "https://www.lg.com/th/laundry/top-load-washing-machine/tx2723st5j/",
  },
  RC90V9AV2W: {
    name: "เครื่องอบผ้า LG 9 กก. DUAL Inverter Heat Pump™ รุ่น RC90V9AV2W",
    description:
      "เครื่องอบผ้าความจุ 9 กก. พร้อม DUAL Inverter Heat Pump™, EcoHybrid™, ระบบทำความสะอาดคอนเดนเซอร์อัตโนมัติ และ LG ThinQ™",
    image: "/images/products/lg-catalog/rc90v9av2w.jpg",
    officialUrl: "https://www.lg.com/pt/tratamento-roupa/maquinas-de-secar-roupa/rc90v9av2w/",
  },
  WS510SN: {
    name: "เครื่องกรองน้ำแบบตั้งพื้น รุ่น WS510SN สีขาว",
    description:
      "เครื่องกรองน้ำ LG PuriCare แบบตั้งพื้น รุ่น WS510SN ระบบ Smart Inverter ถังเก็บน้ำเย็นขนาดใหญ่ ดื่มน้ำได้อย่างสะอาด ด้วยตัวกรอง 4 ขั้นตอน",
    image: "/images/products/lg-catalog/ws510sn.jpg",
    officialUrl: "https://www.lg.com/th/water-purifiers/ws510sn/",
  },
  WD516AN: {
    name: "เครื่องกรองน้ำ LG PuriCare รุ่น WD516AN.ASLPLMT สีเงิน (Silver)",
    description:
      "เครื่องกรองน้ำ LG PuriCare กรอง 4 ขั้นตอนแบบไร้ถัง พร้อมระบบ ทำน้ำร้อน/เย็น/อุณภูมิห้อง รุ่น WD516AN.ASLPLMT สีบรอน น้ำที่สะอาด ด้วยเครื่องกรองน้ำ LG",
    image: "/images/products/lg-catalog/wd516an.jpg",
    officialUrl: "https://www.lg.com/th/water-purifiers/wd516an-aslplmt/",
  },
  WD518AN: {
    name: "เครื่องกรองน้ำ สีเบจ LG PuriCare Objet Collection รุ่น WD518AN.ABGPLMT",
    description:
      "สำรวจ LG WD518AN.ABGPLMT. คลิกเพื่อดูรูปภาพ รีวิว และสเปคทางเทคนิคสำหรับ LG เครื่องกรองน้ำ สีเบจ LG PuriCare Objet Collection รุ่น WD518AN.ABGPLMT.",
    image: "/images/products/lg-catalog/wd518an.jpg",
    officialUrl: "https://www.lg.com/th/water-purifiers/wd518an-abgplmt/",
  },
  WD110AN: {
    name: "เครื่องกรองน้ำ LG PuriCare รุ่น WD110AN",
    description: "เครื่องกรองน้ำ LG PuriCare รุ่น WD110AN น้ำที่สะอาด ด้วยเครื่องกรองน้ำ LG",
    image: "/images/products/lg-catalog/wd110an.jpg",
    officialUrl: "https://www.lg.com/th/subscribe/",
  },
  WD110MN: {
    name: "เครื่องกรองน้ำ สีเบจ LG PuriCare Objet Collection รุ่น WD110MN.ABGPLMT",
    description:
      "เครื่องกรองน้ำ LG PuriCare Objet Collection รุ่น WD110MN.ABGPLMT สีเบจ น้ำที่สะอาด ด้วยเครื่องกรองน้ำ LG",
    image: "/images/products/lg-catalog/wd110mn.jpg",
    officialUrl: "https://www.lg.com/th/water-purifiers/wd110mn/",
  },
  "32GS95UV-B": {
    name: '32" UltraGear™ Dual-Mode OLED gaming monitor | 4K UHD, 0.03ms (GtG)',
    description: '32" UltraGear™ Dual-Mode OLED gaming monitor | 4K UHD, 0.03ms (GtG)',
    image: "/images/products/lg-catalog/32gs95uv-b.jpg",
    officialUrl: "https://www.lg.com/th/monitors/gaming/32gs95uv-b/",
  },
  "27GX790A-B": {
    name: '27" UltraGear™ OLED QHD 480Hz Gaming Monitor | 0.03ms (GtG)',
    description:
      '27" UltraGear™ OLED QHD 480Hz Gaming Monitor | 0.03ms (GtG) | DisplayHDR True Black 400 | NVIDIA® G-SYNC® Compatible / VESA Certified AdaptiveSync / AMD FreeSync™ Premium Pro',
    image: "/images/products/lg-catalog/27gx790a-b.jpg",
    officialUrl: "https://www.lg.com/th/monitors/gaming/27gx790a-b/",
  },
  "34WR50QK-B": {
    name: '34" Curved UltraWide™ WQHD HDR 10 100Hz Monitor with AMD FreeSync™',
    description: '34" Curved UltraWide™ WQHD HDR 10 100Hz Monitor with AMD FreeSync™',
    image: "/images/products/lg-catalog/34wr50qk-b.jpg",
    officialUrl: "https://www.lg.com/th/monitors/ultrawide/34wr50qk-b/",
  },
  "32SR85U-W": {
    name: "LG MyView 32” 4K UHD IPS Smart Monitor พร้อม webOS และ webcam FHD",
    description: '32" 4K UHD IPS Smart Monitor พร้อม webOS และ webcam FHD ตอบสนองทุกความต้องการ',
    image: "/images/products/lg-catalog/32sr85u-w.jpg",
    officialUrl: "https://www.lg.com/th/monitors/smart-monitors/32sr85u-w/",
  },
  "32U889SA": {
    name: 'จอมอนิเตอร์ 31.5" 4K IPS Smart Monitor Swing จอสัมผัส ขาตั้งหมุนได้',
    description: "31.5-inch Smart Monitor Swing 4K UHD IPS พร้อมหน้าจอสัมผัส และขาตั้งแบบมีล้อเลื่อน",
    image: "/images/products/lg-catalog/32u889sa.jpg",
    officialUrl: "https://www.lg.com/th/monitors/smart-monitors/32u889sa-w/",
    officialModel: "32U889SA-W",
  },
  "24U421A-B": {
    name: "จอมอนิเตอร์ FHD Curved ขนาด 24 นิ้ว พร้อม USB-C",
    description: "FHD Curved ขนาด 24 นิ้ว พร้อม USB-C อัตราการรีเฟรช 100Hz / sRGB 99% (Typ.)",
    image: "/images/products/lg-catalog/24u421a-b.jpg",
    officialUrl: "https://www.lg.com/th/monitors/fhd-qhd/24u421a-b/",
  },
};

export const catalogProducts: Product[] = productKnowledgeGuides.flatMap((guide) =>
  guide.models.map((model) => {
    const source = catalogProductSources[model];
    if (!source) throw new Error(`Missing official LG catalog data for ${model}`);

    const featuredProduct = featuredProducts.find((product) => product.model === model);
    const slug =
      featuredProduct?.slug ??
      `lg-${model
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}`;
    return attachPromotionImage({
      slug,
      name: source.name,
      model,
      category: guide.category,
      description: source.description,
      monthlyPrice:
        getSubscriptionStartingPrice(model, guide.category) ?? featuredProduct?.monthlyPrice ?? null,
      contractMonths: featuredProduct?.contractMonths ?? null,
      warrantyYears: featuredProduct?.warrantyYears ?? null,
      image: source.image,
      imageSource: source.officialUrl,
      subscriptionSource: "https://www.lg.com/th/subscribe/",
      highlights: guide.highlights.slice(0, 4),
      specifications: source.officialModel
        ? [{ label: "รหัสสินค้าเพิ่มเติม", value: source.officialModel }]
        : featuredProduct?.specifications,
      gallery: featuredProduct?.gallery,
      reviews: featuredProduct?.reviews,
    });
  }),
);

const catalogModelCodes = new Set(catalogProducts.map((product) => product.model));

export const allProducts = [
  ...catalogProducts,
  ...featuredProducts
    .filter((product) => !catalogModelCodes.has(product.model))
    .map((product) =>
      attachPromotionImage({
        ...product,
        monthlyPrice: getSubscriptionStartingPrice(product.model, product.category) ?? product.monthlyPrice,
      }),
    ),
];

export function getCatalogProduct(slug: string) {
  return catalogProducts.find((product) => product.slug === slug);
}
