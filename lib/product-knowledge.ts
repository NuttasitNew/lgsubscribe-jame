export type ProductKnowledgeGuide = {
  slug: string;
  category: string;
  eyebrow: string;
  summary: string;
  models: string[];
  highlights: string[];
  selectionCriteria: string[];
  installation: string[];
  care: string;
};

export type KnowledgeSourceGroup = {
  group: string;
  files: string[];
};

/**
 * Public-facing summaries synthesized from the supplied training library.
 * The source decks are marked for internal training, so this copy deliberately
 * avoids reproducing slide layouts, sales scripts, and unqualified test claims.
 */
export const productKnowledgeGuides: ProductKnowledgeGuide[] = [
  {
    slug: "air-conditioner",
    category: "เครื่องปรับอากาศ",
    eyebrow: "เย็นสบายและจัดการพลังงาน",
    summary:
      "เลือก BTU ให้สัมพันธ์กับขนาดห้อง ลักษณะการใช้งาน และความร้อนสะสม พร้อมพิจารณาระบบ Inverter, การกระจายลม และการควบคุมผ่าน LG ThinQ™ ตามรุ่น",
    models: [
      "ART13A",
      "ART18A",
      "SAQ11A",
      "SAQ13A",
      "SAQ18B",
      "SAQ24B",
      "SIQ11B",
      "SIQ13B",
      "SIQ18B",
      "SIQ24B",
      "ZT4Q18GPLA1",
      "ZT4Q24GPLA1",
      "ZT4Q36GNLA1",
      "ZT4Q48GMLA1",
      "ZT1Q12GULA1",
      "ZT1Q18GTLA1",
      "ZT1Q24GTLA1",
      "ZTRQ36GYLA1",
      "ZTRQ48GYLA1",
    ],
    highlights: [
      "DUAL Inverter Compressor",
      "AI Air และ Soft Air",
      "Dual Vane",
      "แผ่นกรอง PM2.5 และ Pre-Filter",
    ],
    selectionCriteria: [
      "วัดพื้นที่ห้อง ความสูงฝ้า และจำนวนด้านที่รับแดด",
      "แจ้งจำนวนคน เครื่องใช้ที่ให้ความร้อน และช่วงเวลาที่เปิดใช้งาน",
      "เลือกรุ่นจาก BTU และฉลากประหยัดไฟ ไม่เลือกจากขนาดห้องเพียงอย่างเดียว",
    ],
    installation: [
      "สำรวจตำแหน่งคอยล์เย็น คอยล์ร้อน ทางเดินท่อ และทางระบายน้ำก่อนสั่งซื้อ",
      "ค่าอุปกรณ์หรือระยะท่อที่เกินมาตรฐานต้องประเมินจากหน้างานล่าสุด",
    ],
    care: "รอบล้างและเปลี่ยนแผ่นกรองขึ้นอยู่กับแพ็กเกจและสภาพการใช้งาน ควรยืนยันรายการบริการในใบคำสั่งซื้อ",
  },
  {
    slug: "air-purifier",
    category: "เครื่องฟอกอากาศ",
    eyebrow: "เลือกจากพื้นที่และมลพิษที่ต้องจัดการ",
    summary:
      "กลุ่ม LG PuriCare™ มีทั้งทรง 360 องศา รุ่นส่งลมด้วย Clean Booster และรุ่นสำหรับบ้านที่มีสัตว์เลี้ยง โดยพื้นที่ครอบคลุม เซ็นเซอร์ และชนิดไส้กรองแตกต่างกัน",
    models: ["AS10GDBY0", "AS65GDBY0", "AS60GHWG0", "AS25GCBY0"],
    highlights: [
      "ระบบฟอกอากาศ 360°",
      "H13 HEPA และ Pet Filter ตามรุ่น",
      "เซ็นเซอร์ฝุ่น PM1.0 และกลิ่น",
      "LG ThinQ™",
    ],
    selectionCriteria: [
      "เทียบพื้นที่ครอบคลุมกับขนาดห้องจริงและรูปแบบการเปิดประตู",
      "บ้านที่มีสัตว์เลี้ยงควรดูทั้งไส้กรอง กลิ่น ขน และตำแหน่งวางเครื่อง",
      "ตรวจระดับเสียงต่ำสุดหากใช้ในห้องนอน",
    ],
    installation: [
      "เว้นช่องรอบตัวเครื่องให้อากาศไหลเข้าออกได้",
      "หลีกเลี่ยงมุมอับและตำแหน่งที่มีสิ่งกีดขวางช่องดูดอากาศ",
    ],
    care: "Pre-Filter ทำความสะอาดได้ตามสภาพฝุ่น ส่วนรอบเปลี่ยน H13 HEPA/Carbon หรือ Pet Filter ให้ยึดรุ่นและแพ็กเกจบริการ",
  },
  {
    slug: "dehumidifier",
    category: "เครื่องลดความชื้น",
    eyebrow: "ควบคุมความชื้น ลดกลิ่นอับ",
    summary:
      "LG PuriCare Dehumidifier รุ่น DD23GMWE1 รองรับการลดความชื้นสูงสุด 40 ลิตรต่อวันภายใต้เงื่อนไขทดสอบ 30°C/RH80% มีถัง 5 ลิตรและต่อท่อน้ำทิ้งได้",
    models: ["DD23GMWE1"],
    highlights: [
      "Dual Inverter Compressor",
      "โหมด Smart+, Silent, Laundry และ Spot",
      "UVnano™ และ Ionizer",
      "LG ThinQ™",
    ],
    selectionCriteria: [
      "ดูขนาดพื้นที่และระดับความชื้นจริง",
      "เลือกวิธีทิ้งน้ำระหว่างถัง 5 ลิตรกับการต่อท่อ",
      "พิจารณาโหมดตากผ้าหรือเป่าเฉพาะจุดตามการใช้งาน",
    ],
    installation: ["เผื่อพื้นที่สำหรับลมเข้าออกและการดึงถังน้ำ", "หากต่อท่อถาวรต้องมีทางระบายน้ำที่เหมาะสม"],
    care: "ทำความสะอาด Pre-Filter และถังน้ำสม่ำเสมอ พร้อมตรวจรอบบริการจริงในสัญญา",
  },
  {
    slug: "dishwasher",
    category: "เครื่องล้างจาน",
    eyebrow: "ล้างด้วยน้ำร้อนและจัดพื้นที่ได้ยืดหยุ่น",
    summary:
      "เครื่องล้างจาน LG เน้นการฉีดน้ำหลายทิศทาง การจัดชั้นวางให้เหมาะกับภาชนะไทย และระบบไอน้ำในรุ่นที่รองรับ ควรเลือกจากจำนวนชุดภาชนะและพื้นที่ครัว",
    models: ["DFC533FV", "DFC335HM"],
    highlights: ["QuadWash™", "TrueSteam™ ตามรุ่น", "EasyRack™ Plus", "Inverter Direct Drive และ LG ThinQ™"],
    selectionCriteria: [
      "ประเมินจำนวนจานต่อวันและขนาดหม้อกระทะ",
      "ตรวจโปรแกรมอบแห้งและระบบเปิดประตูอัตโนมัติตามรุ่น",
      "ดูจำนวนชั้นวางและความยืดหยุ่นในการปรับระดับ",
    ],
    installation: [
      "ต้องมีจุดน้ำเข้า ทางน้ำทิ้ง ปลั๊กไฟ และช่องติดตั้งตามขนาดรุ่น",
      "วัดหน้าบาน ทางเปิดประตู และพื้นที่ยืนใช้งานก่อนติดตั้ง",
    ],
    care: "นำเศษอาหารชิ้นใหญ่ออก ทำความสะอาดตัวกรองและแขนฉีดน้ำตามคู่มือ และยึดรอบดูแลตามแพ็กเกจ",
  },
  {
    slug: "microwave",
    category: "ไมโครเวฟ",
    eyebrow: "อุ่นและปรุงอาหารได้สม่ำเสมอ",
    summary:
      "LG NeoChef™ รุ่น MS3032JAS ความจุ 30 ลิตร เคลือบ EasyClean™ ช่วยให้เช็ดทำความสะอาดภายในได้ง่ายขึ้น และมีไฟ LED ส่องอาหารภายใน",
    models: ["MS3032JAS"],
    highlights: ["EasyClean™", "ความจุ 30 ลิตร", "ดีไซน์บางกะทัดรัด", "ไฟ LED ภายใน"],
    selectionCriteria: [
      "เทียบความจุกับขนาดภาชนะที่ใช้จริง",
      "ตรวจโหมดอุ่น ละลายน้ำแข็ง และปรุงอาหารที่ต้องการ",
      "วัดความลึกเคาน์เตอร์และพื้นที่เปิดประตู",
    ],
    installation: [
      "วางบนพื้นผิวแข็งแรงและเว้นช่องระบายอากาศตามคู่มือ",
      "ใช้เต้ารับที่เหมาะสมและไม่กีดขวางช่องระบายความร้อน",
    ],
    care: "เช็ดคราบภายในหลังใช้งานและหลีกเลี่ยงภาชนะโลหะหรือวัสดุที่ไม่รองรับไมโครเวฟ",
  },
  {
    slug: "refrigerator",
    category: "ตู้เย็น",
    eyebrow: "เลือกความจุและระบบน้ำให้เหมาะกับบ้าน",
    summary:
      "ไลน์อัปครอบคลุม Side-by-Side และ 4 ประตู มีตัวเลือก InstaView™, ระบบจ่ายน้ำ/ทำน้ำแข็ง และรุ่นต่อท่อน้ำ โดยฟังก์ชันจริงแตกต่างกันในแต่ละรุ่น",
    models: [
      "X257CMEW",
      "X257CMHW",
      "L257SFZW",
      "J257SQZW",
      "X24FFCRB",
      "G24FFQKB",
      "V22FFQMB",
      "B48FPGAM",
      "GV-V25FFGRB",
      "GN-F452PQAK",
      "GN-V389FQEF",
    ],
    highlights: [
      "Multi Air Flow",
      "Fresh Balancer™ ตามรุ่น",
      "UVnano™ ในระบบจ่ายน้ำตามรุ่น",
      "Smart Inverter Compressor และ LG ThinQ™",
    ],
    selectionCriteria: [
      "เลือกความจุจากจำนวนสมาชิกและพฤติกรรมซื้ออาหาร",
      "ตัดสินใจระหว่างรุ่นต่อท่อน้ำกับเติมน้ำเอง",
      "ตรวจชนิดน้ำแข็ง พื้นที่ช่องแช่ และรูปแบบชั้นวาง",
    ],
    installation: [
      "วัดประตู ลิฟต์ ทางเลี้ยว และพื้นที่เปิดบาน 90° ก่อนจัดส่ง",
      "รุ่นต่อท่อน้ำต้องสำรวจแรงดัน จุดจ่ายน้ำ ทางเดินท่อ และไส้กรอง",
    ],
    care: "แพ็กเกจอาจรวมการตรวจและทำความสะอาดทุก 2 ปี ส่วนรุ่นต่อท่อน้ำมีรอบไส้กรองเฉพาะ ให้ตรวจใบคำสั่งซื้อของรุ่นจริง",
  },
  {
    slug: "styler",
    category: "ตู้ถนอมผ้า",
    eyebrow: "ดูแลเสื้อผ้าที่ไม่ควรซักบ่อย",
    summary:
      "LG Styler ใช้ไอน้ำและไม้แขวนเคลื่อนไหวเพื่อช่วยรีเฟรชเสื้อผ้า ลดกลิ่น ฝุ่น และรอยยับ เหมาะกับสูท ชุดทำงาน เสื้อโค้ต และผ้าที่ต้องการดูแลอย่างอ่อนโยน",
    models: ["S3MFC"],
    highlights: ["TrueSteam™", "Moving Hanger", "Pants Crease Care", "Heat Pump Drying"],
    selectionCriteria: [
      "ดูจำนวนไม้แขวนและพื้นที่ดูแลกางเกง",
      "ตรวจขนาดเสื้อผ้าชิ้นยาวและชนิดผ้าที่ใช้ประจำ",
      "เลือกความจุจากจำนวนชิ้นต่อรอบ ไม่ใช่จำนวนสมาชิกเพียงอย่างเดียว",
    ],
    installation: [
      "วัดประตู ทางเดิน และความสูงพื้นที่ตั้ง",
      "เผื่อระยะเปิดประตูและพื้นที่ระบายอากาศตามคู่มือ",
    ],
    care: "ทำความสะอาดตัวกรอง เติมน้ำสะอาดและเทถังน้ำทิ้งตามการใช้งาน รอบอุปกรณ์สิ้นเปลืองขึ้นอยู่กับแพ็กเกจ",
  },
  {
    slug: "tv-av",
    category: "ทีวีและเครื่องเสียง",
    eyebrow: "ภาพ เสียง และการเล่นเกม",
    summary:
      "ไลน์อัปปี 2026 ครอบคลุม OLED, QNED MiniLED, NanoCell และชุด Soundbar ควรเลือกระดับภาพ ขนาดจอ รีเฟรชเรต และช่องเชื่อมต่อให้เหมาะกับคอนเทนต์",
    models: [
      "QNED80B",
      "65QNED80BSA",
      "85QNED80BSA",
      "100QNED86BS",
      "100MRGB96BS",
      "OLED55C6PSA",
      "OLED65C6PSA",
      "OLED77C6PSA",
      "OLED55C6PSA.S30A",
      "OLED65C6PSA.S80TY",
      "OLED77C6PSA.S80TY",
      "65NU855BPSA",
      "75NU855BPSA",
      "S95TR",
      "S70TY",
      "StandbyME 2",
      "27LX6TDGA.GRAB",
      "32LX6BDGA",
    ],
    highlights: [
      "4K UHD และ webOS",
      "Dolby Vision/Atmos ตามรุ่น",
      "VRR, ALLM และ HDMI 2.1 ตามรุ่น",
      "Magic Remote และ LG ThinQ™",
    ],
    selectionCriteria: [
      "คำนวณขนาดจอจากระยะนั่งและความละเอียด",
      "เกมเมอร์ควรตรวจรีเฟรชเรต VRR และจำนวน HDMI 2.1",
      "เลือก Soundbar จากขนาดห้อง รูปแบบลำโพง และ eARC",
    ],
    installation: [
      "ตรวจความแข็งแรงของผนัง จุดปลั๊ก และการซ่อนสายก่อนแขวน",
      "วางแผนระยะ Soundbar และตำแหน่งลำโพงหลังหากมี",
    ],
    care: "หลีกเลี่ยงความชื้นและแสงแดดโดยตรง ใช้ผ้านุ่มทำความสะอาดจอ และตรวจเงื่อนไขบริการของรุ่นจริง",
  },
  {
    slug: "speakers",
    category: "ลำโพง",
    eyebrow: "ลำโพงพกพาและลำโพงปาร์ตี้",
    summary:
      "กลุ่ม LG xboom มีทั้ง Grab, Bounce และ Stage 301 เลือกจากขนาด กำลังขับ ระดับกันน้ำ และเวลาเล่นต่อรอบชาร์จ ไม่ใช่ซาวด์บาร์สำหรับทีวี",
    models: ["GRAB", "BOUNCE", "STAGE301"],
    highlights: [
      "ปรับแต่งเสียงโดย will.i.am",
      "AI Sound และ Space Calibration",
      "Party Link และ Auracast™",
      "กันน้ำตามรุ่น IP67 หรือ IPX4",
    ],
    selectionCriteria: [
      "เทียบขนาดและกำลังขับกับพื้นที่ใช้งานจริง",
      "ดูระดับกันน้ำของรุ่นนั้นโดยตรง Grab และ Bounce เป็น IP67 ส่วน Stage 301 เป็น IPX4",
      "ดูเวลาเล่นต่อรอบชาร์จ และว่าแบตเตอรี่ถอดเปลี่ยนได้หรือไม่",
    ],
    installation: [
      "ไม่ต้องติดตั้งแบบเครื่องใหญ่ วางบนพื้นเรียบหรือใช้สายสะพายตามรุ่น",
      "ชาร์จด้วย USB-C หรืออะแดปเตอร์ตามรุ่น และไม่ชาร์จในที่เปียก",
    ],
    care: "เช็ดตัวเครื่องด้วยผ้านุ่มและยึดระดับกันน้ำของรุ่นนั้น แพ็กเกจ Subscribe กลุ่มนี้เป็น No Service จึงนำส่งศูนย์บริการเมื่อต้องซ่อม",
  },
  {
    slug: "vacuum-cleaner",
    category: "เครื่องดูดฝุ่น",
    eyebrow: "ทำความสะอาดและจัดการฝุ่นในจุดเดียว",
    summary:
      "LG CordZero™ กลุ่ม All-in-One Tower รวมแท่นชาร์จ จัดเก็บอุปกรณ์ และระบบทิ้งฝุ่นอัตโนมัติในรุ่นที่รองรับ ความแตกต่างหลักอยู่ที่หัวดูด แบตเตอรี่ และอุปกรณ์ในชุด",
    models: ["A9T-ULTRA", "A9T-CORE", "A9T-LITE"],
    highlights: ["All-in-One Tower", "Kompressor™", "ระบบกรองหลายชั้น", "LG ThinQ™ ตามรุ่น"],
    selectionCriteria: [
      "เลือกหัวดูดจากพื้นแข็ง พรม ที่นอน หรือการถูพื้น",
      "ดูจำนวนแบตเตอรี่และเวลาทำงานที่ต้องการ",
      "พิจารณาพื้นที่วาง Tower และจุดทิ้งฝุ่น",
    ],
    installation: [
      "วาง Tower บนพื้นเรียบใกล้เต้ารับและเผื่อพื้นที่ถอดถัง/อุปกรณ์",
      "หลีกเลี่ยงพื้นที่เปียกหรือร้อนจัด",
    ],
    care: "เทฝุ่น ล้างชิ้นส่วนที่คู่มืออนุญาต และปล่อยให้แห้งสนิทก่อนประกอบกลับ รอบเปลี่ยนอุปกรณ์ขึ้นอยู่กับแพ็กเกจ",
  },
  {
    slug: "washing-machine",
    category: "เครื่องซักผ้าและอบผ้า",
    eyebrow: "เลือกจากปริมาณผ้าและพื้นที่ติดตั้ง",
    summary:
      "มีทั้งเครื่องฝาหน้า เครื่องซักอบในตัว เครื่องฝาบน และ WashTower™ ตั้งแต่ขนาดกะทัดรัดถึงครอบครัวใหญ่ โดยความจุซักกับอบต้องพิจารณาแยกกัน",
    models: [
      "WT1410NHEG",
      "WT1410NHEN",
      "WT2116SHEG",
      "WT2520NHEG",
      "WT2520NHEN",
      "FV1413H4M",
      "FV1413S4M",
      "F2520RNTB",
      "TX2723ST5J",
      "TX2315DT5G",
      "RV10VHP2B",
    ],
    highlights: [
      "AI DD™ และ 6 Motion™",
      "TurboWash™ 360 ตามรุ่น",
      "Steam+™ ตามรุ่น",
      "Inverter Direct Drive และ LG ThinQ™",
    ],
    selectionCriteria: [
      "เทียบกิโลกรัมซักและอบกับปริมาณผ้าต่อรอบ",
      "เลือกฝาหน้า ฝาบน ซักอบ หรือ WashTower จากพื้นที่และขั้นตอนใช้งาน",
      "ตรวจโปรแกรมสำหรับผ้านวม เสื้อเด็ก สัตว์เลี้ยง หรือผ้าที่ใช้ประจำ",
    ],
    installation: [
      "วัดประตู ทางเดิน จุดน้ำเข้า น้ำทิ้ง และปลั๊กก่อนส่งสินค้า",
      "WashTower WT1410NHEG มีขนาดอ้างอิง 600 × 1,655 × 660 มม. และต้องเผื่อพื้นที่เปิดประตู",
    ],
    care: "ทำความสะอาดลิ้นชัก ขอบยาง และตัวกรองสม่ำเสมอ แพ็กเกจ Visit Service อาจมีรอบตรวจรายปีตามรุ่น",
  },
  {
    slug: "water-purifier",
    category: "เครื่องกรองน้ำ",
    eyebrow: "เลือกระบบน้ำและรูปแบบดูแล",
    summary:
      "LG PuriCare™ มีทั้งรุ่น Tankless แบบตั้งโต๊ะและรุ่นน้ำอุณหภูมิปกติ ฟังก์ชันน้ำร้อน น้ำเย็น และการฆ่าเชื้อแตกต่างกันตามรุ่น",
    models: ["WD516AN", "WD518AN", "WD110MN"],
    highlights: [
      "ระบบกรอง 4 ขั้นตอนตามรุ่น",
      "Tankless และท่อน้ำสแตนเลสตามรุ่น",
      "การฆ่าเชื้อทางน้ำ/หัวจ่ายตามรุ่น",
      "LG ThinQ™ และ Smart Diagnosis ตามรุ่น",
    ],
    selectionCriteria: [
      "เลือกอุณหภูมิน้ำและปริมาณการใช้งานต่อวัน",
      "ตัดสินใจระหว่าง Visit Service กับ Self Service",
      "ตรวจขนาดตัวเครื่อง พื้นที่วางภาชนะ และจุดต่อท่อน้ำ",
    ],
    installation: [
      "สำรวจแรงดันน้ำ จุดจ่ายน้ำ ปลั๊ก ทางเดินท่อ และระยะจากอ่างล้าง",
      "คุณภาพน้ำต้นทางและหน้างานต้องผ่านเกณฑ์ติดตั้งของรุ่น",
    ],
    care: "รอบไส้กรองต่างกันตามรุ่น โดยตัวอย่างแพ็กเกจมี Pre-Carbon ทุก 6 เดือนและ UF Membrane ทุก 12 เดือน ต้องยึดใบคำสั่งซื้อจริง",
  },
  {
    slug: "monitor",
    category: "จอมอนิเตอร์",
    eyebrow: "เกม งาน และความบันเทิง",
    summary:
      "กลุ่มจอในรายการ Subscribe มีทั้ง UltraGear สำหรับเกม UltraFine สำหรับงาน และ Smart Monitor Swing สำหรับใช้งานทั่วไป",
    models: ["32U889SA", "32U889SA.GRAB", "45GX950A-B", "52G930B-B", "40U990A-W", "34U650A-B"],
    highlights: [
      "OLED และ IPS ตามรุ่น",
      "UltraWide 21:9 ตามรุ่น",
      "USB-C และ Thunderbolt ตามรุ่น",
      "รีเฟรชสูงสุด 240Hz ตามรุ่น",
    ],
    selectionCriteria: [
      "เลือกขนาด ความละเอียด และอัตราส่วนจากระยะมองและประเภทงาน",
      "เกมเมอร์ควรตรวจ refresh rate, response time และ Adaptive Sync",
      "งานภาพควรดูชนิดพาเนล ขอบเขตสี และพอร์ตเชื่อมต่อ",
    ],
    installation: [
      "ตรวจขนาดโต๊ะ ระยะสาย และมาตรฐาน VESA หากใช้แขนจับ",
      "จัดระดับจอและแสงรอบโต๊ะเพื่อลดแสงสะท้อน",
    ],
    care: "ใช้ผ้านุ่มสำหรับจอภาพ หลีกเลี่ยงน้ำยาที่มีฤทธิ์แรง และทำตามแนวทางป้องกันภาพค้างของรุ่น OLED",
  },
];

/** Every supplied PDF is accounted for here; the .ai logo source is a duplicate
 * of the logo-guideline PDF and .DS_Store contains no product knowledge. */
export const knowledgeSourceGroups: KnowledgeSourceGroup[] = [
  { group: "brand", files: ["LG Subscribe Logo Guideline Ver2.0"] },
  {
    group: "air-conditioner",
    files: [
      "2026/Air Conditioner_SUB",
      "Air Conditioner Remote Control User Guide 2026",
      "Basic Installation Guide AC 020226",
      "Installation Feasibility",
      "LG AIR 270326",
      "รายละเอียดค่าอุปกรณ์ส่วนเกินมาตรฐาน เครื่องปรับอากาศ RAC 221225",
      "เอกสารประกอบการสอน Air Conditioner 080925",
      "เอกสารประกอบการอบรม SAC เครื่องปรับอากาศเชิงพาณิชย์",
      "ค่าใช้จ่ายส่วนเกินมาตรฐาน",
    ],
  },
  {
    group: "air-purifier",
    files: ["2026/Air Purifier_SUB", "LG AeroCatTower 070326", "เอกสารประกอบการสอน Air Purifier 170725"],
  },
  {
    group: "dehumidifier",
    files: ["2026/Dehumidifier_SUB", "Dehumidifier_SUB", "เอกสารประกอบการสอน Dehumidifier 060125"],
  },
  { group: "dishwasher", files: ["2026/Dishwasher_SUB", "LG Dishwasher 170226"] },
  { group: "microwave", files: ["2026/Microwave_SUB", "เอกสารประกอบการสอน Microwave 241224"] },
  {
    group: "refrigerator",
    files: [
      "2026/Refrigerator_SUB",
      "Basic Installation Guide REF Plumbing+Water Filter 020226",
      "Basic Installation Guide Refrigerator",
      "Ice Solution X24",
      "Refrigerator 170226",
    ],
  },
  { group: "styler", files: ["2026/Styler_SUB", "LG Styler 200226", "LG Styler SalesTalk 270326"] },
  { group: "tv-av", files: ["2026/TV AV_SUB", "LG StandbyME 2", "เอกสารประกอบการสอน TV + AV 110725"] },
  { group: "vacuum-cleaner", files: ["2026/Vacuum Cleaner_SUB", "เอกสารประกอบการสอน Vacuum 080125"] },
  {
    group: "washing-machine",
    files: [
      "2026/Washing Machine_SUB",
      "How to prepare the installation area for LG WashTower",
      "เอกสารประกอบการสอน Washing Machine & LG Styler 150525",
    ],
  },
  {
    group: "water-purifier",
    files: [
      "2026/Water Purifier",
      "TEST REPORT LG Puricare Water Purifier",
      "Why Change To LG Water Purifier",
      "เอกสารประกอบการสอน Water-Purifier 110325",
    ],
  },
  { group: "monitor", files: ["เอกสารประกอบการสอน Monitor 110725"] },
  { group: "care-service", files: ["Care Service 2026"] },
];

export const knowledgeInventory = {
  pdfCount: knowledgeSourceGroups.reduce((total, group) => total + group.files.length, 0),
  productPdfCount: knowledgeSourceGroups
    .filter((group) => group.group !== "brand")
    .reduce((total, group) => total + group.files.length, 0),
  categoryCount: productKnowledgeGuides.length,
  modelCount: new Set(productKnowledgeGuides.flatMap((guide) => guide.models)).size,
} as const;

export function getProductKnowledgeGuide(category: string) {
  const categoryAliases: Record<string, string> = {
    เครื่องซักผ้า: "washing-machine",
    เครื่องซักและอบผ้า: "washing-machine",
    เครื่องดูดฝุ่น: "vacuum-cleaner",
    เครื่องกรองน้ำ: "water-purifier",
  };

  const guideSlug = categoryAliases[category];
  return productKnowledgeGuides.find((guide) => guide.slug === guideSlug || guide.category === category);
}
