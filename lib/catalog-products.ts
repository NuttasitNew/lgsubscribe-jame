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
  ART13A: {
    name: "แอร์อินเวอร์เตอร์ 11,942 BTU LG ARTCOOL รุ่น ART13A",
    description:
      "แอร์อินเวอร์เตอร์ LG ARTCOOL รุ่น ART13A ขนาด 11,942 Btu Dual Inverter ประหยัดพลังงาน ทนทานรับประกันนาน 10 ปี",
    image: "/images/products/lg-catalog/art13a.jpg",
    officialUrl: "https://www.lg.com/th/air-conditioner-inverter/energy-saving-air-conditioner/art13a/",
    officialModel: "ART13A.SR1",
  },
  ART18A: {
    name: "แอร์อินเวอร์เตอร์ 18,084 BTU LG ARTCOOL รุ่น ART18A",
    description:
      "แอร์อินเวอร์เตอร์ LG ARTCOOL รุ่น ART18A ขนาด 18,084 Btu Dual Inverter ประหยัดพลังงาน ทนทานรับประกันนาน 10 ปี",
    image: "/images/products/lg-catalog/art18a.jpg",
    officialUrl: "https://www.lg.com/th/air-conditioner-inverter/energy-saving-air-conditioner/art18a/",
    officialModel: "ART18A.SR1",
  },
  SAQ11A: {
    name: "แอร์อินเวอร์เตอร์ 9,200 BTU LG DUALCOOL AI Air รุ่น SAQ11A",
    description:
      "แอร์อินเวอร์เตอร์ LG DUALCOOL AI Air รุ่น SAQ11A ขนาด 9,200 BTU AI Air ปรับอุณหภูมิ ทิศทางลม และแรงลมอัตโนมัติ แอร์อัจฉริยะที่รู้ใจคุณ",
    image: "/images/products/lg-catalog/saq11a.jpg",
    officialUrl: "https://www.lg.com/th/air-conditioner-inverter/energy-saving-air-conditioner/saq11a/",
  },
  SAQ13A: {
    name: "แอร์อินเวอร์เตอร์ 12,000 BTU LG DUALCOOL AI Air รุ่น SAQ",
    description:
      "แอร์อินเวอร์เตอร์ LG DUALCOOL AI Air รุ่น SAQ13A ขนาด 12,000 BTU AI Air ปรับอุณหภูมิ ทิศทางลม และแรงลมอัตโนมัติ แอร์อัจฉริยะที่รู้ใจคุณ",
    image: "/images/products/lg-catalog/saq13a.jpg",
    officialUrl: "https://www.lg.com/th/air-conditioner-inverter/energy-saving-air-conditioner/saq13a/",
  },
  SAQ18B: {
    name: "แอร์อินเวอร์เตอร์ 18,084 BTU LG DUALCOOL AI Air รุ่น SAQ18B",
    description:
      "แอร์อินเวอร์เตอร์ LG DUALCOOL AI Air รุ่น SAQ18B ขนาด 18,000 Btu Dual Inverter ประหยัดพลังงาน ทนทานรับประกันคอมเพรสเซอร์นาน 10 ปี",
    image: "/images/products/lg-catalog/saq18b.jpg",
    officialUrl: "https://www.lg.com/th/air-conditioner-inverter/energy-saving-air-conditioner/saq18b/",
  },
  SAQ24B: {
    name: "แอร์อินเวอร์เตอร์ 24,225 BTU LG DUALCOOL AI Air รุ่น SAQ24B",
    description:
      "แอร์อินเวอร์เตอร์ LG DUALCOOL AI Air รุ่น SAQ24B ขนาด 24,000 Btu Dual Inverter ประหยัดพลังงาน ทนทานรับประกันคอมเพรสเซอร์นาน 10 ปี",
    image: "/images/products/lg-catalog/saq24b.jpg",
    officialUrl: "https://www.lg.com/th/air-conditioner-inverter/energy-saving-air-conditioner/saq24b/",
  },
  SIQ11B: {
    name: "แอร์อินเวอร์เตอร์ 9,212 BTU LG DUALCOOL AI Air รุ่น SIQ11B",
    description:
      "แอร์อินเวอร์เตอร์ LG DUALCOOL AI Air รุ่น SIQ11B ขนาด 9,212 Btu Dual Inverter ประหยัดพลังงาน ทนทานรับประกันนาน 10 ปี",
    image: "/images/products/lg-catalog/siq11b.jpg",
    officialUrl: "https://www.lg.com/th/air-conditioner-inverter/air-conditioner-with-air-purifier/siq11b/",
  },
  SIQ13B: {
    name: "แอร์อินเวอร์เตอร์ 12,283 BTU LG DUALCOOL AI Air รุ่น SIQ13B",
    description:
      "แอร์อินเวอร์เตอร์ LG DUALCOOL AI Air รุ่น SIQ13B ขนาด 12,283 Btu Dual Inverter ประหยัดพลังงาน ทนทานรับประกันนาน 10 ปี",
    image: "/images/products/lg-catalog/siq13b.jpg",
    officialUrl: "https://www.lg.com/th/air-conditioner-inverter/air-conditioner-with-air-purifier/siq13b/",
  },
  SIQ18B: {
    name: "แอร์อินเวอร์เตอร์ 18,084 BTU LG DUALCOOL AI Air รุ่น SIQ18B",
    description:
      "แอร์อินเวอร์เตอร์ LG DUALCOOL AI Air รุ่น SIQ18B ขนาด 18,084 Btu Dual Inverter ประหยัดพลังงาน ทนทานรับประกันนาน 10 ปี",
    image: "/images/products/lg-catalog/siq18b.jpg",
    officialUrl: "https://www.lg.com/th/air-conditioner-inverter/air-conditioner-with-air-purifier/siq18b/",
  },
  SIQ24B: {
    name: "แอร์อินเวอร์เตอร์ 22,178 BTU LG DUALCOOL AI Air รุ่น SIQ24B",
    description:
      "แอร์อินเวอร์เตอร์ LG DUALCOOL AI Air รุ่น SIQ24B ขนาด 22,178 Btu Dual Inverter ประหยัดพลังงาน ทนทานรับประกันนาน 10 ปี",
    image: "/images/products/lg-catalog/siq24b.jpg",
    officialUrl: "https://www.lg.com/th/air-conditioner-inverter/air-conditioner-with-air-purifier/siq24b/",
  },
  ZT4Q18GPLA1: {
    name: "แอร์ฝังฝ้า 4 ทิศทาง 18,000 BTU LG รุ่น ZT4Q18GPLA1",
    description:
      "แอร์ฝังฝ้า 4 ทิศทาง LG รุ่น ZT4Q18GPLA1 ขนาด 18,000 BTU กระจายลมสี่ทิศทาง ติดตั้งฝังฝ้าเพดาน สำหรับพื้นที่กว้าง",
    image: "/images/products/lg-catalog/zt4q18gpla1.jpg",
    officialUrl: "https://www.lg.com/th/business/hvac/commercial-solutions/single-split/ceiling-mounted-cassette/",
    officialModel: "ZT4Q18GPLA1.EWGHATH",
  },
  ZT4Q24GPLA1: {
    name: "แอร์ฝังฝ้า 4 ทิศทาง 24,500 BTU LG รุ่น ZT4Q24GPLA1",
    description:
      "แอร์ฝังฝ้า 4 ทิศทาง LG รุ่น ZT4Q24GPLA1 ขนาด 24,500 BTU กระจายลมสี่ทิศทาง ติดตั้งฝังฝ้าเพดาน สำหรับพื้นที่กว้าง",
    image: "/images/products/lg-catalog/zt4q24gpla1.jpg",
    officialUrl: "https://www.lg.com/th/business/hvac/commercial-solutions/single-split/ceiling-mounted-cassette/",
    officialModel: "ZT4Q24GPLA1.EWGHATH",
  },
  ZT4Q36GNLA1: {
    name: "แอร์ฝังฝ้า 4 ทิศทาง 36,200 BTU LG รุ่น ZT4Q36GNLA1",
    description:
      "แอร์ฝังฝ้า 4 ทิศทาง LG รุ่น ZT4Q36GNLA1 ขนาด 36,200 BTU ระบบ 220 โวลต์ กระจายลมสี่ทิศทาง ติดตั้งฝังฝ้าเพดาน",
    image: "/images/products/lg-catalog/zt4q36gnla1.jpg",
    officialUrl: "https://www.lg.com/th/business/hvac/commercial-solutions/single-split/ceiling-mounted-cassette/",
    officialModel: "ZT4Q36GNLA1.EWGHATH",
  },
  ZT4Q48GMLA1: {
    name: "แอร์ฝังฝ้า 4 ทิศทาง 48,000 BTU LG รุ่น ZT4Q48GMLA1",
    description:
      "แอร์ฝังฝ้า 4 ทิศทาง LG รุ่น ZT4Q48GMLA1 ขนาด 48,000 BTU ระบบ 220 โวลต์ กระจายลมสี่ทิศทาง ติดตั้งฝังฝ้าเพดาน",
    image: "/images/products/lg-catalog/zt4q48gmla1.jpg",
    officialUrl: "https://www.lg.com/th/business/hvac/commercial-solutions/single-split/ceiling-mounted-cassette/",
    officialModel: "ZT4Q48GMLA1.EWGHATH",
  },
  ZT1Q12GULA1: {
    name: "แอร์ฝังฝ้า 1 ทิศทาง 10,500 BTU LG รุ่น ZT1Q12GULA1",
    description:
      "แอร์ฝังฝ้า 1 ทิศทาง LG รุ่น ZT1Q12GULA1 ขนาด 10,500 BTU ตัวเครื่องบาง ติดตั้งฝังฝ้าเพดาน กระจายลมทางเดียว",
    image: "/images/products/lg-catalog/zt1q12gula1.jpg",
    officialUrl: "https://www.lg.com/th/business/hvac/commercial-solutions/single-split/",
    officialModel: "ZT1Q12GULA1.EWGHATH",
  },
  ZT1Q18GTLA1: {
    name: "แอร์ฝังฝ้า 1 ทิศทาง 18,000 BTU LG รุ่น ZT1Q18GTLA1",
    description:
      "แอร์ฝังฝ้า 1 ทิศทาง LG รุ่น ZT1Q18GTLA1 ขนาด 18,000 BTU ตัวเครื่องบาง ติดตั้งฝังฝ้าเพดาน กระจายลมทางเดียว",
    image: "/images/products/lg-catalog/zt1q18gtla1.jpg",
    officialUrl: "https://www.lg.com/th/business/hvac/commercial-solutions/single-split/",
    officialModel: "ZT1Q18GTLA1.EWGHATH",
  },
  ZT1Q24GTLA1: {
    name: "แอร์ฝังฝ้า 1 ทิศทาง 23,500 BTU LG รุ่น ZT1Q24GTLA1",
    description:
      "แอร์ฝังฝ้า 1 ทิศทาง LG รุ่น ZT1Q24GTLA1 ขนาด 23,500 BTU ตัวเครื่องบาง ติดตั้งฝังฝ้าเพดาน กระจายลมทางเดียว",
    image: "/images/products/lg-catalog/zt1q24gtla1.jpg",
    officialUrl: "https://www.lg.com/th/business/hvac/commercial-solutions/single-split/",
    officialModel: "ZT1Q24GTLA1.EWGHATH",
  },
  ZTRQ36GYLA1: {
    name: "แอร์ฝังฝ้าวงกลม 36,700 BTU LG รุ่น ZTRQ36GYLA1",
    description:
      "แอร์ฝังฝ้าวงกลม LG รุ่น ZTRQ36GYLA1 ขนาด 36,700 BTU คาสเซ็ทรอบทิศทาง ระบบ 220 โวลต์ สำหรับพื้นที่กว้าง",
    image: "/images/products/lg-catalog/ztrq36gyla1.jpg",
    officialUrl: "https://www.lg.com/th/business/hvac/commercial-solutions/single-split/round-cassette/",
    officialModel: "ZTRQ36GYLA1.EWGHATH",
  },
  ZTRQ48GYLA1: {
    name: "แอร์ฝังฝ้าวงกลม 47,300 BTU LG รุ่น ZTRQ48GYLA1",
    description:
      "แอร์ฝังฝ้าวงกลม LG รุ่น ZTRQ48GYLA1 ขนาด 47,300 BTU คาสเซ็ทรอบทิศทาง ระบบ 220 โวลต์ สำหรับพื้นที่กว้าง",
    image: "/images/products/lg-catalog/ztrq48gyla1.jpg",
    officialUrl: "https://www.lg.com/th/business/hvac/commercial-solutions/single-split/round-cassette/",
    officialModel: "ZTRQ48GYLA1.EWGHATH",
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
  MS3032JAS: {
    name: "ไมโครเวฟอุ่นอาหาร ขนาด 30 ลิตร สีดำ รุ่น MS3032JAS",
    description:
      "ไมโครเวฟอุ่นอาหาร ขนาด 30 ลิตร สีดำ รุ่น MS3032JAS เคลือบ EasyClean™ ทำความสะอาดง่าย ดีไซน์บางกะทัดรัด และมีไฟ LED ส่องภายใน",
    image: "/images/products/lg-catalog/ms3032jas.jpg",
    officialUrl: "https://www.lg.com/th/microwave-ovens/solo-microwave/ms3032jas/",
    officialModel: "MS3032JAS.BBKPETH",
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
  L257SFZW: {
    name: "ตู้เย็น Side-by-Side 22.4 คิว รุ่น GC-L257SFZW รองรับ Smart Wi-Fi",
    description:
      "LG GC-L257SFZW ตู้เย็น Side-by-Side 22.4 คิว ที่มากับฟังก์ชันอำนวยความสะดวก เช่น ที่กดน้ำดื่ม DoorCooling และ Hygiene Fresh",
    image: "/images/products/lg-catalog/l257sfzw.jpg",
    officialUrl: "https://www.lg.com/th/refrigerators/side-by-side-refrigerator/gc-l257sfzw/",
    officialModel: "GC-L257SFZW.APYPLMT",
  },
  J257SQZW: {
    name: "ตู้เย็น Side by Side GC-J257SQZW 22.4 คิว",
    description:
      "สำรวจ LG GC-J257SQZW. คลิกเพื่อดูรูปภาพ รีวิว และสเปคทางเทคนิคสำหรับ LG ตู้เย็น Side by Side GC-J257SQZW 22.4 คิว.",
    image: "/images/products/lg-catalog/j257sqzw.jpg",
    officialUrl: "https://www.lg.com/th/refrigerators/side-by-side-refrigerator/gc-j257sqzw/",
    officialModel: "GC-J257SQZW.AEPPLMT",
  },
  V22FFQMB: {
    name: "ตู้เย็น Instaview Multi-Door 18.7 คิว GC-V22FFQMB Smart Inverter",
    description:
      "ตู้เย็น Multi-Door 18.7 คิว รุ่น GC-V22FFQMB ระบบ Smart Inverter ระบบกระจายลมเย็นหลายทิศทาง มอบความสดสม่ำเสมอและพื้นที่ว่างขนาดใหญ่",
    image: "/images/products/lg-catalog/v22ffqmb.jpg",
    officialUrl: "https://www.lg.com/th/refrigerators/multi-door-refrigerator/gc-v22ffqmb/",
    officialModel: "GC-V22FFQMB.AEPPLMT",
  },
  B48FPGAM: {
    name: "ตู้เย็น Multi-Door รุ่น GC-B48FPGAM ขนาด 17.4 คิว ระบบ Inverter Compressor",
    description:
      "ตู้เย็น Multi-Door 17.4 คิว รุ่น GC-B48FPGAM ระบบ Inverter Compressor กระจายลมเย็นได้ทั่วถึง ช่องแช่ผักและผลไม้ขนาดใหญ่ ดีไซน์แบบ Built-in",
    image: "/images/products/lg-catalog/b48fpgam.jpg",
    officialUrl: "https://www.lg.com/th/refrigerators/multi-door-refrigerator/gc-b48fpgam/",
    officialModel: "GC-B48FPGAM.ADBPLMT",
  },
  "GV-V25FFGRB": {
    name: "ตู้เย็น Instaview Multi-Door 21.8 คิว GV-V25FFGRB Smart Inverter Compressor",
    description:
      "ตู้เย็น Multi-Door 21.8 คิว รุ่น GV-V25FFGRB ระบบ Smart Inverter Compressor มีฟังก์ชัน InstaView เคาะ 2 ครั้งเพื่อดูด้านใน",
    image: "/images/products/lg-catalog/v25ffgrb.jpg",
    officialUrl: "https://www.lg.com/th/refrigerators/multi-door-refrigerator/gv-v25ffgrb/",
    officialModel: "GV-V25FFGRB.ABMPLMT",
  },
  "GN-F452PQAK": {
    name: "ตู้เย็น 2 ประตู ขนาด 16.2 คิว รุ่น GN-F452PQAK ระบบ Smart Inverter",
    description:
      "ตู้เย็น 2 ประตู 16.2 คิว GN-F452PQAK สีดำ ระบบ Smart Inverter ประหยัดไฟ มีระบบทำน้ำแข็งอัตโนมัติพร้อมช่องกดน้ำ",
    image: "/images/products/lg-catalog/f452pqak.jpg",
    officialUrl: "https://www.lg.com/th/refrigerators/2-door-refrigerator/gn-f452pqak/",
    officialModel: "GN-F452PQAK.AEPPLMT",
  },
  "GN-V389FQEF": {
    name: "ตู้เย็น 2 ประตู Instaview 12 คิว รุ่น GN-V389FQEF ระบบ Smart Inverter",
    description:
      "ตู้เย็นสองประตู 12 คิว Instaview รุ่น GN-V389FQEF เคาะกระจกสองครั้งเพื่อดูข้างใน ระบบคุมอุณหภูมิให้สม่ำเสมอ",
    image: "/images/products/lg-catalog/v389fqef.jpg",
    officialUrl: "https://www.lg.com/th/refrigerators/2-door-refrigerator/gn-v389fqef/",
    officialModel: "GN-V389FQEF.AEPPLMT",
  },
  S3MFC: {
    name: "LG Styler ตู้ถนอมผ้า รุ่น S3MFC",
    description:
      "สำรวจ LG S3MFC. คลิกเพื่อดูรูปภาพ รีวิว และสเปคทางเทคนิคสำหรับ LG LG Styler ตู้ถนอมผ้า รุ่น S3MFC.",
    image: "/images/products/lg-catalog/s3mfc.jpg",
    officialUrl: "https://www.lg.com/th/laundry/styler/s3mfc/",
  },
  QNED80B: {
    name: 'ทีวี 55" LG QNED evo AI Mini LED QNED80 4K Smart TV 2026 รุ่น 55QNED80BSA',
    description:
      "ค้นพบทีวี AI อัจฉริยะรุ่นใหม่ล่าสุดจาก LG รุ่น 55QNED80BSA เพื่อประสบการณ์การรับชมที่ดีที่สุดที่ปรับแต่งให้เหมาะกับคุณผ่านคุณสมบัติ AI อัจฉริยะของแพลตฟอร์ม webOS คลิกเพื่อดูภาพ รีวิว และข้อมูลจำเพาะทางเทคนิคของ LG QNED evo AI QNED80 Mini LED 4K Smart TV ขนาด 55 นิ้ว",
    image: "/images/products/lg-catalog/qned80b.jpg",
    officialUrl: "https://www.lg.com/th/tv-soundbars/qned-evo/55qned80bsa/",
    officialModel: "55QNED80BSA",
  },
  "65QNED80BSA": {
    name: 'ทีวี 65" LG QNED evo AI Mini LED QNED80 4K Smart TV 2026 รุ่น 65QNED80BSA',
    description:
      "ทีวี AI อัจฉริยะรุ่นใหม่ล่าสุดจาก LG รุ่น 65QNED80BSA เพื่อประสบการณ์การรับชมที่ดีที่สุดผ่านคุณสมบัติ AI ของแพลตฟอร์ม webOS",
    image: "/images/products/lg-catalog/65qned80bsa.jpg",
    officialUrl: "https://www.lg.com/th/tv-soundbars/qned-evo/65qned80bsa/",
  },
  "85QNED80BSA": {
    name: 'ทีวี 85" LG QNED evo AI Mini LED QNED80 4K Smart TV 2026 รุ่น 85QNED80BSA',
    description:
      "ทีวี AI อัจฉริยะรุ่นใหม่ล่าสุดจาก LG รุ่น 85QNED80BSA เพื่อประสบการณ์การรับชมที่ดีที่สุดผ่านคุณสมบัติ AI ของแพลตฟอร์ม webOS",
    image: "/images/products/lg-catalog/85qned80bsa.jpg",
    officialUrl: "https://www.lg.com/th/tv-soundbars/qned-evo/85qned80bsa/",
  },
  "100QNED86BS": {
    name: 'ทีวี 100" LG QNED evo AI Mini LED QNED86 4K Smart TV 2026 รุ่น 100QNED86BS',
    description:
      "ทีวี AI อัจฉริยะรุ่นใหม่ล่าสุดจาก LG รุ่น 100QNED86BS เพื่อประสบการณ์การรับชมที่ดีที่สุดผ่านคุณสมบัติ AI ของแพลตฟอร์ม webOS",
    image: "/images/products/lg-catalog/100qned86bs.jpg",
    officialUrl: "https://www.lg.com/th/tv-soundbars/qned-evo/100qned86bs/",
  },
  "100MRGB96BS": {
    name: 'ทีวี 100" LG Micro RGB evo AI MRGB96 4K Smart TV 2026 รุ่น 100MRGB96BS',
    description:
      "ทีวี AI อัจฉริยะรุ่นใหม่ล่าสุดจาก LG รุ่น 100MRGB96BS เพื่อประสบการณ์การรับชมที่ดีที่สุดผ่านคุณสมบัติ AI ของแพลตฟอร์ม webOS",
    image: "/images/products/lg-catalog/100mrgb96bs.jpg",
    officialUrl: "https://www.lg.com/th/tv-soundbars/micro-rgb-evo/100mrgb96bs/",
    officialModel: "100MRGB96BS.ATM",
  },
  OLED77C6PSA: {
    name: 'ทีวี 77" LG OLED evo C6 4K Smart TV 2026 รุ่น OLED77C6PSA',
    description:
      'ทีวี 77" LG OLED evo C6 4K Smart TV 2026 รุ่น OLED77C6PSA α11 AI Processor Gen 3, Perfect Black, Dolby Vision & Dolby Atmos, webOS 26',
    image: "/images/products/lg-catalog/oled77c6psa.jpg",
    officialUrl: "https://www.lg.com/th/tv-soundbars/oled-evo/oled77c6psa/",
  },
  OLED65C6PSA: {
    name: 'ทีวี 65" LG OLED evo C6 4K Smart TV 2026 รุ่น OLED65C6PSA',
    description:
      'ทีวี 65" LG OLED evo C6 4K Smart TV 2026 รุ่น OLED65C6PSA α11 AI Processor Gen 3, Perfect Black, Dolby Vision & Dolby Atmos, webOS 26',
    image: "/images/products/lg-catalog/oled65c6psa.jpg",
    officialUrl: "https://www.lg.com/th/tv-soundbars/oled-evo/oled65c6psa/",
  },
  OLED55C6PSA: {
    name: 'ทีวี 55" LG OLED evo C6 4K Smart TV 2026 รุ่น OLED55C6PSA',
    description:
      'ทีวี 55" LG OLED evo C6 4K Smart TV 2026 รุ่น OLED55C6PSA α11 AI Processor Gen 3, Perfect Black, Dolby Vision & Dolby Atmos, webOS 26',
    image: "/images/products/lg-catalog/oled55c6psa.jpg",
    officialUrl: "https://www.lg.com/th/tv-soundbars/oled-evo/oled55c6psa/",
  },
  "OLED77C6PSA.S80TY": {
    name: 'ทีวี 77" LG OLED evo C6 พร้อมซาวด์บาร์ S80TY',
    description:
      "ชุดทีวี OLED77C6PSA พร้อมซาวด์บาร์ S80TY กำลังขับ 480W สำหรับรับชมภาพและเสียงในชุดเดียว",
    image: "/images/products/lg-catalog/oled77c6psa-s80ty.jpg",
    officialUrl: "https://www.lg.com/th/tv-soundbars/oled-evo/oled77c6psa/",
    officialModel: "OLED77C6PSA.S80TY",
  },
  "OLED65C6PSA.S80TY": {
    name: 'ทีวี 65" LG OLED evo C6 พร้อมซาวด์บาร์ S80TY',
    description:
      "ชุดทีวี OLED65C6PSA พร้อมซาวด์บาร์ S80TY กำลังขับ 480W สำหรับรับชมภาพและเสียงในชุดเดียว",
    image: "/images/products/lg-catalog/oled65c6psa-s80ty.jpg",
    officialUrl: "https://www.lg.com/th/tv-soundbars/oled-evo/oled65c6psa/",
    officialModel: "OLED65C6PSA.S80TY",
  },
  "OLED55C6PSA.S30A": {
    name: 'ทีวี 55" LG OLED evo C6 พร้อมซาวด์บาร์ S30A',
    description:
      "ชุดทีวี OLED55C6PSA พร้อมซาวด์บาร์ S30A กำลังขับ 150W สำหรับรับชมภาพและเสียงในชุดเดียว",
    image: "/images/products/lg-catalog/oled55c6psa-s30a.jpg",
    officialUrl: "https://www.lg.com/th/tv-soundbars/oled-evo/oled55c6psa/",
    officialModel: "OLED55C6PSA.S30A",
  },
  "32LX6BDGA": {
    name: "LG StanbyME 2 Max LX6 จอไลฟ์สไตล์ไร้สาย 4K ขนาด 32 นิ้ว รุ่น 32LX6BDGA",
    description: "LG StanbyME 2 Max เพลิดเพลินไปกับหน้าจอ 4K UHD ขนาด 32 นิ้วที่ถอดและแขวนได้",
    image: "/images/products/lg-catalog/32lx6bdga.jpg",
    officialUrl: "https://www.lg.com/th/lifestyle-screens/stanbyme/32lx6bdga/",
    officialModel: "32LX6BDGA.ATM",
  },
  "65NU855BPSA": {
    name: 'ทีวี 65" LG NANO 4K UHD AI NU85 4K Smart TV 2026 รุ่น 65NU855BPSA',
    description:
      "ทีวี AI อัจฉริยะรุ่นใหม่ล่าสุดจาก LG รุ่น 65NU855BPSA เพื่อประสบการณ์การรับชมที่ดีที่สุดที่ปรับแต่งให้เหมาะกับคุณผ่านคุณสมบัติ AI อัจฉริยะของแพลตฟอร์ม webOS คลิกเพื่อดูภาพ รีวิว และข้อมูลจำเพาะทางเทคนิคของ LG NANO 4K UHD AI NU85 ทีวี Smart TV 4K ขนาด 65 นิ้ว",
    image: "/images/products/lg-catalog/65nu855bpsa.jpg",
    officialUrl: "https://www.lg.com/th/tv-soundbars/nano-4k-uhd/65nu855bpsa/",
  },
  "75NU855BPSA": {
    name: 'ทีวี 75" LG NANO 4K UHD AI NU85 4K Smart TV 2026 รุ่น 75NU855BPSA',
    description:
      "ทีวี AI อัจฉริยะรุ่นใหม่ล่าสุดจาก LG รุ่น 75NU855BPSA เพื่อประสบการณ์การรับชมที่ดีที่สุดที่ปรับแต่งให้เหมาะกับคุณผ่านคุณสมบัติ AI อัจฉริยะของแพลตฟอร์ม webOS คลิกเพื่อดูภาพ รีวิว และข้อมูลจำเพาะทางเทคนิคของ LG NANO 4K UHD AI NU85 ทีวี Smart TV 4K ขนาด 75 นิ้ว",
    image: "/images/products/lg-catalog/75nu855bpsa.jpg",
    officialUrl: "https://www.lg.com/th/tv-soundbars/nano-4k-uhd/75nu855bpsa/",
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
  "27LX6TDGA.GRAB": {
    name: "LG StanbyME 2 พร้อมลำโพง xboom Grab",
    description: "ชุดจอไลฟ์สไตล์ StanbyME 2 รุ่น 27LX6TDGA พร้อมลำโพงพกพา LG xboom Grab",
    image: "/images/products/lg-catalog/standbyme-2.jpg",
    officialUrl: "https://www.lg.com/th/lifestyle-screens/stanbyme/27lx6tdga/",
    officialModel: "27LX6TDGA.GRAB",
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
  WT2520NHEN: {
    name: "Wash Tower รุ่น WT2520NHEN ระบบ AI DD™ ความจุซัก 25 กก./อบ 20 กก.",
    description:
      "Wash Tower ซัก 25 กก./ อบ 20 กก. รุ่น WT2520NHEN ระบบ Inverter Direct Drive ระบบ AIDD ถนอมผ้าอัจฉริยะ ซักผ้าและอบผ้าได้ในเครื่องเดียว",
    image: "/images/products/lg-catalog/wt2520nhen.jpg",
    officialUrl: "https://www.lg.com/th/laundry/wash-tower/wt2520nhen/",
    officialModel: "WT2520NHEN.ABNPETH",
  },
  WT1410NHEN: {
    name: "WashTower รุ่น WT1410NHEN ระบบ AI DD™ ความจุซัก 14 กก./อบ 10 กก. สี Navy/Beige",
    description:
      "Wash Tower ซัก 14 กก./ อบ 10 กก. รุ่น WT1410NHEN สี Navy/Beige ระบบ Inverter Direct Drive ระบบ AIDD ถนอมผ้าอัจฉริยะ",
    image: "/images/products/lg-catalog/wt1410nhen.jpg",
    officialUrl: "https://www.lg.com/th/laundry/wash-tower/wt1410nhen/",
    officialModel: "WT1410NHEN.ABNPQTH",
  },
  FV1413H4M: {
    name: "เครื่องซักผ้า 13 กก. / อบ 8 กก. รุ่น FV1413H4M ระบบ AI DD™ พร้อม Smart WI-FI control ควบคุมสั่งงานผ่านสมาร์ทโฟน",
    description:
      "เครื่องซักอบ ซัก13กก./อบ 8กก.FV1413H4M ระบบซักผ้าอัจฉริยะ AIDDTMถนอมเนื้อผ้ามากขึ้น หอมยาวนาน ระบบ Stream ขจัดสารก่อภูมิแพ้ ซื้อสินค้าและดูรายละเอียดที่นี่",
    image: "/images/products/lg-catalog/fv1413h4m.jpg",
    officialUrl: "https://www.lg.com/th/laundry/front-load-washing-machine/fv1413h4m/",
  },
  FV1413S4M: {
    name: "เครื่องซักผ้า 13 กก. รุ่น FV1413S4M AI DD™",
    description:
      "เครื่องซักผ้าฝาหน้า LG ขนาดถังซัก 13 กก. สีดำ ระบบ AIDD ประหยัดไฟ เพิ่มประสิทธิภาพการซัก Steam กำจัดเชื้อโรคและสารก่อภูมิแพ้",
    image: "/images/products/lg-catalog/fv1413s4m.jpg",
    officialUrl: "https://www.lg.com/th/laundry/front-load-washing-machine/fv1413s4m/",
    officialModel: "FV1413S4M.AMBPETH",
  },
  F2520RNTB: {
    name: "เครื่องซักผ้าฝาหน้า ซัก 20/ อบ 10 กก. F2520RNTB ระบบ AI DD™",
    description:
      "เครื่องซักผ้าฝาหน้า 20 กก./ อบ 10 กก. รุ่น F2520RNTB ระบบ Inverter Direct Drive ระบบ AIDD ถนอมผ้าอัจฉริยะ พร้อมพลังซักทรงพลังและรวดเร็ว",
    image: "/images/products/lg-catalog/f2520rntb.jpg",
    officialUrl: "https://www.lg.com/th/laundry/front-load-washing-machine/f2520rntb/",
  },
  TX2723ST5J: {
    name: "เครื่องซักผ้าฝาบน 23 กก รุ่น TX2723ST5J ระบบ Inverter Direct Drive",
    description:
      "เครื่องซักผ้าฝาบน 23 กก. รุ่น TX2723ST5J ระบบ Inverter Direct Drive ระบบ AIDD ซักสะอาดและรวดเร็วด้วย TurboWash3D™",
    image: "/images/products/lg-catalog/tx2723st5j.jpg",
    officialUrl: "https://www.lg.com/th/laundry/top-load-washing-machine/tx2723st5j/",
  },
  TX2315DT5G: {
    name: "เครื่องซักผ้าฝาบน 15 กก รุ่น TX2315DT5G ระบบ Inverter Direct Drive",
    description:
      "เครื่องซักผ้าฝาบน 15 กก. รุ่น TX2315DT5G ระบบ Inverter Direct Drive ระบบ AIDD ซักสะอาดและรวดเร็วด้วย TurboWash™",
    image: "/images/products/lg-catalog/tx2315dt5g.jpg",
    officialUrl: "https://www.lg.com/th/laundry/top-load-washing-machine/tx2315dt5g/",
    officialModel: "TX2315DT5G.DEGPETH",
  },
  RV10VHP2B: {
    name: "เครื่องอบผ้า รุ่น RV10VHP2B ระบบ DUAL Inverter Heat Pump™ ความจุ 10 กก.",
    description:
      "เครื่องอบผ้า ขนาด 10 กก. ประหยัดพลังงานด้วย DUAL Inverter Heat Pump ลดไรฝุ่นและแบคทีเรีย ถนอมผ้าป้องกันผ้าหดตัว",
    image: "/images/products/lg-catalog/rv10vhp2b.jpg",
    officialUrl: "https://www.lg.com/th/laundry/dryer/rv10vhp2b/",
    officialModel: "RV10VHP2B.BBLPETH",
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
  WD110MN: {
    name: "เครื่องกรองน้ำ สีเบจ LG PuriCare Objet Collection รุ่น WD110MN.ABGPLMT",
    description:
      "เครื่องกรองน้ำ LG PuriCare Objet Collection รุ่น WD110MN.ABGPLMT สีเบจ น้ำที่สะอาด ด้วยเครื่องกรองน้ำ LG",
    image: "/images/products/lg-catalog/wd110mn.jpg",
    officialUrl: "https://www.lg.com/th/water-purifiers/wd110mn/",
  },
  "32U889SA": {
    name: 'จอมอนิเตอร์ 31.5" 4K IPS Smart Monitor Swing จอสัมผัส ขาตั้งหมุนได้',
    description: "31.5-inch Smart Monitor Swing 4K UHD IPS พร้อมหน้าจอสัมผัส และขาตั้งแบบมีล้อเลื่อน",
    image: "/images/products/lg-catalog/32u889sa.jpg",
    officialUrl: "https://www.lg.com/th/monitors/smart-monitors/32u889sa-w/",
    officialModel: "32U889SA-W",
  },
  "32U889SA.GRAB": {
    name: 'จอมอนิเตอร์ 31.5" Smart Monitor Swing พร้อมลำโพง xboom Grab',
    description:
      "ชุดจอมอนิเตอร์ 32U889SA-W พร้อมลำโพงพกพา LG xboom Grab สำหรับใช้งานจอและลำโพงในชุดเดียว",
    image: "/images/products/lg-catalog/32u889sa.jpg",
    officialUrl: "https://www.lg.com/th/monitors/smart-monitors/32u889sa-w/",
    officialModel: "32U889.GRAB",
  },
  "45GX950A-B": {
    name: 'LG UltraGear™ 45" OLED Dual-Mode 5K2K 0.03ms, DisplayHDR True Black',
    description:
      "LG UltraGear™ 45-inch OLED Dual-Mode 5K2K Gaming Monitor | 0.03ms (GtG), DisplayHDR True Black 400, DP 2.1 และ USB-C",
    image: "/images/products/lg-catalog/45gx950a-b.jpg",
    officialUrl: "https://www.lg.com/th/monitors/gaming/45gx950a-b/",
    officialModel: "45GX950A-B.ATM",
  },
  "52G930B-B": {
    name: 'LG UltraGear evo G9 จอเกมมิ่ง 52” 5K2K 240Hz',
    description:
      "จอเกมมิ่ง UltraGear evo G9 ขนาด 52 นิ้ว ความละเอียด 5K2K รีเฟรช 240Hz อัตราส่วน 21:9",
    image: "/images/products/lg-catalog/52g930b-b.jpg",
    officialUrl: "https://www.lg.com/th/monitors/gaming/52g930b-b/",
    officialModel: "52G930B-B.ATM",
  },
  "40U990A-W": {
    name: "LG UltraFine™ 40 นิ้ว 40U990A Nano IPS Black 5K2K with Thunderbolt™ 5",
    description: "LG UltraFine™ 40 นิ้ว รุ่น 40U990A Nano IPS Black 5K2K พร้อม Thunderbolt 5",
    image: "/images/products/lg-catalog/40u990a-w.jpg",
    officialUrl: "https://www.lg.com/th/monitors/uhd-4k-5k/40u990a-w/",
    officialModel: "40U990A-W.ATM",
  },
  "34U650A-B": {
    name: 'จอมอนิเตอร์ 34" WQHD IPS 100Hz โค้ง 3800R รุ่น 34U650A-B',
    description: 'จอมอนิเตอร์ 34 นิ้ว WQHD IPS 100Hz โค้ง 3800R รุ่น 34U650A-B สำหรับงานและมัลติทาสก์',
    image: "/images/products/lg-catalog/34u650a-b.jpg",
    officialUrl: "https://www.lg.com/th/monitors/",
    officialModel: "34U650A-B.ATM",
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
