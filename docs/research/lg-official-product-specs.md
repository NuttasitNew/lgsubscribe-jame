# LG official product specifications for every product-detail route

ตรวจสอบล่าสุด: 12 สิงหาคม 2569 (2026-08-12)

เอกสารนี้เป็น research handoff สำหรับนำข้อมูลไปสร้าง `specifications` บนหน้ารายละเอียดสินค้า ไม่ใช่ข้อความโฆษณาสำเร็จรูป ขอบเขตคือ `allProducts` ปัจจุบันทั้งหมด 51 route: 50 model จาก `productKnowledgeGuides` และ featured model `FV1413S4M` ที่ถูก append เพิ่มเพราะ guide catalog มี `FV1413H4M` คนละรุ่น

## ผลการยืนยัน model

- `EXACT-TH` 37 รุ่น: รหัสในระบบเป็น model/base model ที่ LG Thailand ประกาศบน PDP โดยตรง
- `EXACT-LG-OTHER` 1 รุ่น: รหัสตรงรุ่น แต่หา public PDP ได้เฉพาะ LG ประเทศอื่น (`AS55GGSY0` จาก Hong Kong) ข้อมูลด้านไฟฟ้า/ฉลากพลังงานจึงห้ามตีความเป็นสเปกตลาดไทย
- `MAPPED` 11 รุ่น: รหัสในระบบเป็น alias, รหัสที่ตัด prefix/suffix, หรือ typo แต่ระบุ official SKU ปลายทางได้แน่นอน
- `UNRESOLVED` 1 รุ่น: `WD110AN` ไม่มี exact official public PDP; ห้ามนำสเปก `WD110MN` มาใช้แทน

ดังนั้น 50/51 route ผูกกับ official LG PDP ของสินค้าที่ระบุได้ และ 1/51 route ยังต้องแก้รหัสหรือหาเอกสารยืนยันเพิ่ม

### Mapping ที่ต้องเก็บไว้ใน data model

| รหัสในระบบ    | Official model | ชนิด                                        |
| ------------- | -------------- | ------------------------------------------- |
| `X257CMEW`    | `GC-X257CMEW`  | ตัด prefix `GC-`                            |
| `X257CMHW`    | `GC-X257CMHW`  | ตัด prefix `GC-`                            |
| `L257KQKW`    | `GC-L257KQKW`  | ตัด prefix `GC-`                            |
| `X24FFCRB`    | `GC-X24FFCRB`  | ตัด prefix `GC-`                            |
| `G24FFQKB`    | `GC-G24FFQKB`  | ตัด prefix `GC-`                            |
| `S5G0C`       | `S5GOC`        | typo: รหัส LG ใช้ตัวอักษร `O` ไม่ใช่เลข `0` |
| `QNED86B`     | `55QNED86BSA`  | series alias → SKU ขนาด 55 นิ้ว             |
| `QNED80B`     | `55QNED80BSA`  | series alias → SKU ขนาด 55 นิ้ว             |
| `NU855B`      | `55NU855BPSA`  | series alias → SKU ขนาด 55 นิ้ว             |
| `StandbyME 2` | `27LX6TDGA`    | marketing name → SKU                        |
| `32U889SA`    | `32U889SA-W`   | suffix สี/variant ถูกตัดออก                 |

`WD516AN`, `WD518AN`, `WD110MN` เป็น base model ที่หน้าไทยเติม market/color suffix เช่น `.ASLPLMT`, `.ABGPLMT`; ถือว่าตรง base model แต่เวลาแสดงสีต้องผูกกับ variant URL ที่เลือกเท่านั้น

## วิธีดึงข้อมูลแบบทำซ้ำได้

หน้า LG รุ่นปัจจุบันส่งข้อมูลสเปกมากับ HTML อยู่แล้ว จึงไม่ต้อง scrape จาก search snippet:

1. ตรวจ model จาก `<h1>`, breadcrumb/copy-model text และ product schema (`mpn`) ก่อน
2. อ่าน key specs จาก product schema ที่ฝังใน script รูปแบบ `self.__next_s.push(...)` โดย parse descriptor JSON ก่อน แล้วจึง parse string ใน `children`; `additionalProperty` เป็นเพียง subset และบาง PDP ไม่มี field นี้
3. อ่าน full specs จาก `.c-compare-selling--all .c-compare-selling__table` แยกตาม heading แล้วจับคู่ direct `.c-compare-selling__item` ด้วย `.c-compare-selling__spec-name` และ `.c-compare-selling__spec-desc`; เก็บเป็น ordered arrays เพราะ label ซ้ำได้ และต้องรักษาค่า `0`, `No`, `ไม่`, `ใช่` ตามต้นฉบับ ห้ามแปลงเป็น object ด้วย label key หรือ dedupe อัตโนมัติ ส่วน `.c-compare-selling--pick-out` เป็นเพียง key-summary subset
4. PDP รุ่นเก่าบางหน้า (`FV1413H4M`) ไม่มี full-spec rows ใน HTML ปัจจุบัน ให้ใช้เฉพาะชื่อรุ่นและ feature copy ที่หน้า LG ระบุ ห้ามเติมค่าจากรุ่นใกล้เคียง
5. Next/AEM payload เต็มมี endpoint รูปแบบ `https://www.lg.com/content/lge/th/th/<product-path>/jcr:content.ncms-v2.json`; ใช้เป็น fallback ได้ แต่ต้องตรวจว่าค่าอยู่ใต้ product รุ่นเดียวกัน ไม่ใช่ recommendation/compare card
6. Hidden element `[data-pim-model_id]` มี `data-pim-sku`, model id/year/category ที่ใช้ cross-check fidelity ได้

จาก actual 48 URLs: พบ product schema 47, full-spec table 45, และ `additionalProperty` ใช้เป็น key specs ได้เพียง 27; นี่คือเหตุผลที่ห้ามพึ่ง JSON-LD อย่างเดียว สองหน้าที่ไม่มี full table คือ legacy PDP `FV1413H4M` และ generic `/th/subscribe/` ที่โค้ดผูกให้ `WD110AN`

### Official search/discovery endpoint

ถ้า canonical path ในโค้ดไม่มีหรือสงสัยว่าเป็น alias ใช้ LG search infrastructure เพื่อ discovery ได้:

- GET `https://www.lg.com/ncms/asia/api/v1/coveo/token` เพื่อรับ public short-lived token
- POST `https://platform-eu.cloud.coveo.com/rest/search/v2` พร้อม Bearer token, `searchHub: "TH-B2C-Search"`, `locale: "th-TH"` และ filter `@commonsource=="Product"`
- exact model filter ใช้ `@ec_model_name=="MODEL"`; อย่าพึ่ง free-text query โดยเฉพาะ model ที่มี hyphen เพราะ tokenizer อาจคืนรุ่นใกล้เคียง
- ใช้ `ec_model_url_path` เพื่อเปิด canonical LG PDP แล้ว cite/scrape PDP นั้นอีกครั้ง Search API ใช้หา path ไม่ใช่หลักฐานสุดท้ายของสเปก

การ crawl 2–3 MB ต่อ PDP ควรจำกัด concurrency, cache snapshot และ retry/backoff; ห้ามใช้ `?search=MODEL` เพราะเป็น client-only route และ query search ถูก robots rule จำกัด

ค่าด้านล่างคัดเฉพาะสิ่งที่ useful ต่อ product detail และยังคงหน่วย/คำตอบตาม LG; ไม่ควรแปลง `ใช่/มี`, ลำดับมิติ หรือหน่วยโดยเดา

## เครื่องปรับอากาศ

| รหัส route | Status / official model                                                | สเปกที่ยืนยันจาก LG                                                                                                                                            | Official source                                                                                                  |
| ---------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `SEQ13A`   | `EXACT-TH`; sales model `SEQ13A`, technical indoor model `S3-Q120AKDA` | 12,200 BTU; cooling rated/min 3,605/645 W; input rated/min 1,150/200 W; indoor 799 × 307 × 235 mm; outdoor 717 × 495 × 230 mm; energy 1 star; R32; ThinQ Wi-Fi | [LG Thailand — SEQ13A](https://www.lg.com/th/air-conditioner-inverter/air-conditioner-with-air-purifier/seq13a/) |
| `SAQ13A`   | `EXACT-TH`; sales model `SAQ13A`, technical indoor model `S3-Q121L1CA` | 12,000 BTU; cooling rated/min 3,517/630 W; input rated/min 850/200 W; indoor 895 × 307 × 235 mm; outdoor 770 × 545 × 288 mm; energy 5 stars; R32; ThinQ Wi-Fi  | [LG Thailand — SAQ13A](https://www.lg.com/th/air-conditioner-inverter/energy-saving-air-conditioner/saq13a/)     |

หมายเหตุ: `SEQ13A`/`SAQ13A` เป็นรหัสขายที่ LG แสดงและให้ copy model ได้จริง แต่ตาราง technical specs ระบุชื่อ indoor/outdoor unit แยกอีกชุด จึงควรเก็บทั้งสองช่อง ไม่แทนค่ากัน

## เครื่องฟอกอากาศ

| รหัส route  | Status / official model      | สเปกที่ยืนยันจาก LG                                                                                                                       | Official source                                                                                |
| ----------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `AS10GDBY0` | `EXACT-TH`                   | recommended area 104.0 m²; CADR 810 CMH; 377 × 1,100 × 377 mm; 20.6 kg; 72 W; noise 53/26 dB; H13 dual V-Pet filters; UVnano; ThinQ Wi-Fi | [LG Thailand — AS10GDBY0](https://www.lg.com/th/air-puricare/puricare-360/as10gdby0/)          |
| `AS65GDBY0` | `EXACT-TH`                   | recommended area 61.2 m²; CADR 478 CMH; 347 × 612 × 347 mm; 12.5 kg; 48 W; noise 53/26 dB; ThinQ Wi-Fi                                    | [LG Thailand — AS65GDBY0](https://www.lg.com/th/air-puricare/puricare-360/as65gdby0/)          |
| `AS55GGSY0` | `EXACT-LG-OTHER` (Hong Kong) | recommended area 52.8 m²; CADR 411 CMH; 240 × 997 × 240 mm; 9.3 kg; 55 W; noise 52/21 dB; H13 V-Pet filter; UVnano; ThinQ Wi-Fi           | [LG Hong Kong — AS55GGSY0](https://www.lg.com/hk_en/puricare-air-care/air-purifier/as55ggsy0/) |
| `AS60GHWG0` | `EXACT-TH`                   | recommended area 61 m²; CADR 483 CMH; 315 × 511 × 315 mm; 6.75 kg; 41 W; noise 53/25 dB; ThinQ Wi-Fi                                      | [LG Thailand — AS60GHWG0](https://www.lg.com/th/air-puricare/puricare-360/as60ghwg0/)          |
| `AS25GCBY0` | `EXACT-TH`                   | recommended area 24.8 m²; CADR 3.22 CMM (LG leaves CMH as `No`); 710 × 800 × 422 mm; 11.6 kg; 52 W; noise 52/21 dB; ThinQ Wi-Fi           | [LG Thailand — AS25GCBY0](https://www.lg.com/th/air-puricare/puricare-aerotower/as25gcby0/)    |
| `AS35GGW10` | `EXACT-TH`                   | recommended area 32 m²; CADR 250 CMH; 240 × 500 × 240 mm; 4.2 kg; 35 W; noise 53/25 dB; ThinQ Wi-Fi                                       | [LG Thailand — AS35GGW10](https://www.lg.com/th/air-puricare/puricare-360/as35ggw10/)          |

## เครื่องลดความชื้น

| รหัส route  | Status / official model                      | สเปกที่ยืนยันจาก LG                                                                                                                                                           | Official source                                                          |
| ----------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `DD23GMWE1` | `EXACT-TH`; full table model `DD23GMWE1.ATH` | dehumidification 23 L/day; 40 L/day at 30°C/RH 80%; tank 5.0 L; 410 × 640 × 210 mm; 16.0 kg; 379 W; noise 40/34 dB; Dual Inverter/twin-rotary compressor; UVnano; ThinQ Wi-Fi | [LG Thailand — DD23GMWE1](https://www.lg.com/th/dehumidifier/dd23gmwe1/) |

ชื่อหน้าใช้ “40 ลิตร” แต่ full specs แยก 23 L/day ออกจาก 40 L/day ภายใต้เงื่อนไข 30°C/RH 80%; UI ต้องแสดงเงื่อนไขคู่กับเลข 40 เสมอ

## เครื่องล้างจาน

| รหัส route | Status / official model | สเปกที่ยืนยันจาก LG                                                                                                      | Official source                                                      |
| ---------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `DFC533FV` | `EXACT-TH`              | 14 place settings; 600 × 850 × 600 mm; 47 kg; 44 dBA; water 9.9 L; TrueSteam; QuadWash; ThinQ Wi-Fi; auto-open door: no  | [LG Thailand — DFC533FV](https://www.lg.com/th/dishwasher/dfc533fv/) |
| `DFC335HM` | `EXACT-TH`              | 14 place settings; 600 × 850 × 600 mm; 51 kg; 41 dBA; water 9.5 L; TrueSteam; QuadWash; ThinQ Wi-Fi; auto-open door: yes | [LG Thailand — DFC335HM](https://www.lg.com/th/dishwasher/dfc335hm/) |

## ไมโครเวฟ

| รหัส route  | Status / official model                                                         | สเปกที่ยืนยันจาก LG                                                                                                                                      | Official source                                                                            |
| ----------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `MS4295DIS` | `EXACT-TH`; URL slug สะกด `mc4295dis` แต่ H1/copy model/schema ระบุ `MS4295DIS` | solo microwave 42 L; 544 × 308 × 432 mm; 11.0 kg; microwave output 1,200 W; total/input 1,350 W; 220 V/50 Hz; Smart Inverter; EasyClean; ThinQ Wi-Fi: no | [LG Thailand — MS4295DIS](https://www.lg.com/th/microwave-ovens/solo-microwave/mc4295dis/) |

URL mismatch ของรุ่นนี้เป็น slug typo ฝั่ง LG ไม่ใช่เหตุผลให้เปลี่ยน model เป็น `MC4295DIS`

## ตู้เย็น

| รหัส route | Status / official model  | สเปกที่ยืนยันจาก LG                                                                                             | Official source                                                                                         |
| ---------- | ------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `X257CMEW` | `MAPPED` → `GC-X257CMEW` | InstaView side-by-side; 22.4 cu.ft.; 913 × 1,790 × 735 mm; 131 kg; 850 kWh/year; ThinQ Wi-Fi                    | [LG Thailand — GC-X257CMEW](https://www.lg.com/th/refrigerators/side-by-side-refrigerator/gc-x257cmew/) |
| `X257CMHW` | `MAPPED` → `GC-X257CMHW` | total 635 L; freezer 190 L; 913 × 1,790 × 735 mm; 129 kg; 850 kWh/year; ThinQ Wi-Fi                             | [LG Thailand — GC-X257CMHW](https://www.lg.com/th/refrigerators/side-by-side-refrigerator/gc-x257cmhw/) |
| `L257KQKW` | `MAPPED` → `GC-L257KQKW` | full table: 22.6 cu.ft./641 L; freezer 192 L; 913 × 1,790 × 735 mm; 105 kg; 603 kWh/year; ThinQ Wi-Fi: no       | [LG Thailand — GC-L257KQKW](https://www.lg.com/th/refrigerators/side-by-side-refrigerator/gc-l257kqkw/) |
| `X24FFCRB` | `MAPPED` → `GC-X24FFCRB` | full table: 22.7 cu.ft./642 L; freezer 246 L; 914 × 1,792 × 729 mm; 149 kg; 800 kWh/year; ThinQ Wi-Fi           | [LG Thailand — GC-X24FFCRB](https://www.lg.com/th/refrigerators/multi-door-refrigerator/gc-x24ffcrb/)   |
| `G24FFQKB` | `MAPPED` → `GC-G24FFQKB` | InstaView multi-door; 22.5 cu.ft./637 L; freezer 246 L; 914 × 1,792 × 733 mm; 144 kg; 711 kWh/year; ThinQ Wi-Fi | [LG Thailand — GC-G24FFQKB](https://www.lg.com/th/refrigerators/multi-door-refrigerator/gc-g24ffqkb/)   |

LG มีความไม่ตรงกันภายในหน้าเดียวกัน 2 จุด: title ของ `GC-L257KQKW` เขียน 22.4 cu.ft. แต่ full table เขียน 22.6/641 L; title ของ `GC-X24FFCRB` เขียน 22.5 cu.ft. แต่ full table เขียน 22.7/642 L. แนะนำใช้ลิตรจาก full table และถ้าจะแสดงคิวให้ระบุว่าเป็นค่าจากตาราง พร้อมส่ง inconsistency ให้ LG ยืนยันก่อน production copy

## ตู้ถนอมผ้า Styler

| รหัส route | Status / official model | สเปกที่ยืนยันจาก LG                                                             | Official source                                                    |
| ---------- | ----------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `S3MFC`    | `EXACT-TH`              | capacity 3+1; 445 × 1,850 × 585 mm; 78 kg; TrueSteam/Moving Hanger; ThinQ Wi-Fi | [LG Thailand — S3MFC](https://www.lg.com/th/laundry/styler/s3mfc/) |
| `S5G0C`    | `MAPPED` typo → `S5GOC` | capacity 5+1 (trouser); 600 × 1,960 × 605 mm; 100 kg; ThinQ Wi-Fi               | [LG Thailand — S5GOC](https://www.lg.com/th/laundry/styler/s5goc/) |

ห้ามคง `S5G0C` เป็น official model ใน UI เพราะ LG ใช้ `S5GOC` (ตัว O) ทั้ง H1 และ copy-model text

## ทีวี จอไลฟ์สไตล์ และซาวด์บาร์

| รหัส route    | Status / official model               | สเปกที่ยืนยันจาก LG                                                                                                                                            | Official source                                                                          |
| ------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `QNED86B`     | `MAPPED` series → `55QNED86BSA`       | 55-inch QNED evo Mini LED; 4K 3,840 × 2,160; native 120 Hz/VRR up to 144 Hz; HDMI 4 (4K120/eARC/VRR/ALLM); Wi-Fi 5; Bluetooth 5.3; standby under 0.5 W         | [LG Thailand — 55QNED86BSA](https://www.lg.com/th/tv-soundbars/qned-evo/55qned86bsa/)    |
| `QNED80B`     | `MAPPED` series → `55QNED80BSA`       | 55-inch QNED evo Mini LED; 4K 3,840 × 2,160; 60 Hz/VRR up to 60 Hz; HDMI 3 (eARC/ALLM); Wi-Fi 5; Bluetooth 5.3; standby under 0.5 W                            | [LG Thailand — 55QNED80BSA](https://www.lg.com/th/tv-soundbars/qned-evo/55qned80bsa/)    |
| `NU855B`      | `MAPPED` series → `55NU855BPSA`       | 55-inch NANO 4K UHD; 3,840 × 2,160; 60 Hz/VRR up to 60 Hz; HDMI 3 (eARC/ALLM); Wi-Fi 5; Bluetooth 5.3; standby under 0.5 W                                     | [LG Thailand — 55NU855BPSA](https://www.lg.com/th/tv-soundbars/nano-4k-uhd/55nu855bpsa/) |
| `S95TR`       | `EXACT-TH`                            | 9.1.5 channels; 810 W; main bar 1,250 × 63 × 135 mm; rear 159 × 223 × 142 mm; subwoofer 201.7 × 407 × 403 mm; HDMI in/out 1/1; eARC; Wi-Fi; Dolby Atmos; DTS:X | [LG Thailand — S95TR](https://www.lg.com/th/speakers/home-theater-soundbar/s95tr/)       |
| `S70TY`       | `EXACT-TH`                            | 3.1.1 channels; 400 W; main bar 950 × 63 × 115 mm; HDMI in/out 1/1; eARC; Dolby Atmos                                                                          | [LG Thailand — S70TY](https://www.lg.com/th/speakers/soundbars/s70ty/)                   |
| `StandbyME 2` | `MAPPED` marketing name → `27LX6TDGA` | 27-inch QHD 2,560 × 1,440; 60 Hz; screen+stand 623 × 1,265 × 398 mm/15.2 kg; built-in battery up to 4 hours; HDMI 1; USB 3; Wi-Fi 5; Bluetooth 5.1; webOS 24   | [LG Thailand — 27LX6TDGA](https://www.lg.com/th/lifestyle-screens/stanbyme/27lx6tdga/)   |
| `GRAB`        | `EXACT-TH`                            | 20 W + 10 W; 1.1ch 2Way; Bluetooth 5.4; IP67; battery up to 20 h; speaker 211.0 × 71.6 × 70.0 mm; net 0.7 kg                                                    | [LG Thailand — GRAB](https://www.lg.com/th/speakers/xboom/grab/)                         |
| `BOUNCE`      | `EXACT-TH`                            | 30 W + 5 W × 2; 2.1ch Stereo; Bluetooth 5.4; IP67; battery up to 30 h; speaker 272 × 103 × 88 mm; net 1.42 kg                                                    | [LG Thailand — BOUNCE](https://www.lg.com/th/speakers/xboom/bounce/)                     |
| `STAGE301`    | `EXACT-TH`                            | 120 W; 2.1ch 2Way; Bluetooth 5.3; IPX4; battery up to 12 h; speaker 312 × 311 × 282 mm; net 6.5 kg                                                               | [LG Thailand — STAGE301](https://www.lg.com/th/speakers/party-speakers/stage301/)        |

ห้ามใช้ขนาดกล่อง `STAGE301` จากเรตราคา (352 × 415 × 385 มม.) เพราะตารางสเปก LG แยกชัดว่าลำโพงคือ 312 × 311 × 282 มม. และกล่องคือ 385 × 415 × 352 มม. ห้ามย่อกำลังขับ Bounce เป็น 30 W + 10 W เพราะหน้า LG ระบุ `30 W + 5 W x 2`

## เครื่องดูดฝุ่น

| รหัส route  | Status / official model | สเปกที่ยืนยันจาก LG                                                                                                                                                                                                                               | Official source                                                                                    |
| ----------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `A9T-ULTRA` | `EXACT-TH`              | 2 Li-ion batteries; max 60 min/battery without powered nozzle (40 min with nozzle); charge 240 min; hand unit 260 × 1,120 × 270 mm/2.9 kg; tower 255 × 1,009 × 297 mm/9.7 kg; bin 0.44 L or 0.88 L compressed; bag 2.5 L; Kompressor; ThinQ Wi-Fi | [LG Thailand — A9T-ULTRA](https://www.lg.com/th/vacuum-cleaner/cordless-vacuum-cleaner/a9t-ultra/) |
| `A9T-CORE`  | `EXACT-TH`              | 2 Li-ion batteries; max 60 min/battery without powered nozzle (40 min with nozzle); charge 240 min; hand unit 260 × 270 × 1,120 mm/2.9 kg; tower 255 × 1,009 × 297 mm/9.8 kg; bin 0.44 L or 0.88 L compressed; bag 2.5 L; ThinQ Wi-Fi             | [LG Thailand — A9T-CORE](https://www.lg.com/th/vacuum-cleaner/cordless-vacuum-cleaner/a9t-core/)   |
| `A9T-LITE`  | `EXACT-TH`              | 1 Li-ion battery; max 60 min without powered nozzle (40 min with nozzle); charge 240 min; hand unit 260 × 270 × 1,120 mm/2.9 kg; tower 255 × 1,009 × 297 mm/9.7 kg; bin 0.44 L or 0.88 L compressed; bag 2.5 L; Kompressor; ThinQ Wi-Fi           | [LG Thailand — A9T-LITE](https://www.lg.com/th/vacuum-cleaner/cordless-vacuum-cleaner/a9t-lite/)   |

ลำดับมิติของ hand unit ในหน้า `A9T-ULTRA` ไม่เหมือน `A9T-CORE/LITE` แม้ค่าชุดเดียวกันเกือบทั้งหมด ให้คงค่าตาม LG หรือ normalize หลังยืนยัน orientation เท่านั้น

## เครื่องซักผ้า เครื่องอบผ้า และ WashTower

| รหัส route   | Status / official model                      | สเปกที่ยืนยันจาก LG                                                                                                                  | Official source                                                                                        |
| ------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `WT1410NHEG` | `EXACT-TH`, แต่ capacity ขัดกันใน PDP        | title: wash 14 kg/dry 10 kg; full table: wash 12 kg/dry 10 kg; 600 × 1,655 × 660 mm; 128 kg; AI DD; ThinQ Wi-Fi                      | [LG Thailand — WT1410NHEG](https://www.lg.com/th/laundry/wash-tower/wt1410nheg/)                       |
| `WT2116SHEG` | `EXACT-TH`                                   | wash 21 kg/dry 16 kg; 700 × 1,890 × 770 mm; 154 kg; AI DD; ThinQ Wi-Fi                                                               | [LG Thailand — WT2116SHEG](https://www.lg.com/th/laundry/wash-tower/wt2116sheg/)                       |
| `WT2520NHEG` | `EXACT-TH`                                   | wash 25 kg/dry 20 kg; 700 × 1,890 × 830 mm; 160 kg; AI DD; ThinQ Wi-Fi                                                               | [LG Thailand — WT2520NHEG](https://www.lg.com/th/laundry/wash-tower/wt2520nheg/)                       |
| `FV1413H4M`  | `EXACT-TH`; legacy PDP has no full-spec rows | wash 13 kg/dry 8 kg; AI DD; TurboWash; Steam; ThinQ Wi-Fi (from official title/key features)                                         | [LG Thailand — FV1413H4M](https://www.lg.com/th/laundry/front-load-washing-machine/fv1413h4m/)         |
| `F2520RNTB`  | `EXACT-TH`                                   | wash 20 kg/dry 10 kg; 650 × 780 × 950 mm; 86 kg; AI DD; ThinQ Wi-Fi                                                                  | [LG Thailand — F2520RNTB](https://www.lg.com/th/laundry/front-load-washing-machine/f2520rntb/)         |
| `TX2725AT9G` | `EXACT-TH`                                   | top-load wash 25 kg; 686 × 1,092 × 721 mm; 59 kg; 5-star wash energy rating; Inverter Direct Drive; ThinQ Wi-Fi                      | [LG Thailand — TX2725AT9G](https://www.lg.com/th/laundry/top-load-washing-machine/tx2725at9g/)         |
| `TX2723ST5J` | `EXACT-TH`                                   | top-load wash 23 kg; 686 × 1,092 × 721 mm; 59 kg; 5-star wash energy rating; Inverter Direct Drive; ThinQ Wi-Fi                      | [LG Thailand — TX2723ST5J](https://www.lg.com/th/laundry/top-load-washing-machine/tx2723st5j/)         |
| `FV1413S4M`  | `EXACT-TH`; featured-only 48th route         | front-load wash 13 kg; 600 × 850 × 615 mm; 73 kg; AI DD; TurboWash; Steam; ThinQ Wi-Fi                                               | [LG Thailand — FV1413S4M](https://www.lg.com/th/laundry/front-load-washing-machine/fv1413s4m/)         |

`WT1410NHEG` ต้อง block capacity copy ไว้ก่อน: official H1/name บอก 14/10 แต่ official full-spec table บอก 12/10 ในหน้าเดียวกัน จึงไม่มีวิธีเลือกค่าหนึ่งโดยไม่ใช้ judgment นอกหลักฐาน

## เครื่องกรองน้ำ

| รหัส route | Status / official model                                  | สเปกที่ยืนยันจาก LG                                                                                                                                               | Official source                                                                                                                                                                                                                                                                                                                                                                   |
| ---------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WD516AN`  | `EXACT-TH` base; source variant `WD516AN.ASLPLMT` silver | 170 × 419 × 550 mm; preset water 120/250/500/1,000 ml; hot/ambient/cold; 4-stage UF; tankless; ThinQ Wi-Fi; inverter compressor warranty 10 years                 | [LG Thailand — WD516AN.ASLPLMT](https://www.lg.com/th/water-purifiers/wd516an-aslplmt/)                                                                                                                                                                                                                                                                                           |
| `WD518AN`  | `EXACT-TH` base; source variant `WD518AN.ABGPLMT` beige  | 168 × 398 × 400 mm; preset water 120/250/500/1,000 ml; hot/ambient/cold; 4-stage UF; tankless; ThinQ Wi-Fi; inverter compressor warranty 10 years                 | [LG Thailand — WD518AN.ABGPLMT](https://www.lg.com/th/water-purifiers/wd518an-abgplmt/)                                                                                                                                                                                                                                                                                           |
| `WD110AN`  | `UNRESOLVED`                                             | ไม่พบ exact public LG PDP หรือ spec sheet; LG training PDF ใน repo ใส่ `WD110AN` ใน line-up แต่เนื้อหารายละเอียดถัดไปเป็น `WD110MN` จึงห้ามยืมสเปก                | [LG Thailand Subscribe landing page (ไม่ใช่ exact model proof)](https://www.lg.com/th/subscribe/) · [local LG 2026 Water Purifier training PDF](../../knowledge/%E0%B9%80%E0%B8%AD%E0%B8%81%E0%B8%AA%E0%B8%B2%E0%B8%A3%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%81%E0%B8%AD%E0%B8%9A%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B8%AA%E0%B8%AD%E0%B8%99%20LG%20Subscribe%20/2026/Water%20Purifier.pdf) |
| `WD110MN`  | `EXACT-TH` base; source variant `WD110MN.ABGPLMT` beige  | ambient water; 132 × 358 × 230 mm; preset water 120/250/500/1,000 ml; 4-stage UF; tankless; ThinQ Wi-Fi; no inverter compressor                                   | [LG Thailand — WD110MN](https://www.lg.com/th/water-purifiers/wd110mn/)                                                                                                                                                                                                                                                                                                           |

หน้า LG ใช้ label “มล.” กับค่ามิติของ WD-series แม้ค่ามีรูปแบบ dimension; เอกสารภายใน LG ระบุ `WxHxD mm`. ใน runtime ควรแสดง `มม.` แต่เก็บ note ว่าเป็นการแก้ unit typo จาก official page ไม่ใช่ค่าที่คำนวณใหม่

## จอมอนิเตอร์

| รหัส route   | Status / official model | สเปกที่ยืนยันจาก LG                                                                                                                             | Official source                                                                       |
| ------------ | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `32GS95UV-B` | `EXACT-TH`              | 31.5-inch OLED; 3,840 × 2,160; max 240 Hz; 0.03 ms GtG; DCI-P3 98.5% typ.; HDMI 2; DisplayPort 1                                                | [LG Thailand — 32GS95UV-B](https://www.lg.com/th/monitors/gaming/32gs95uv-b/)         |
| `27GX790A-B` | `EXACT-TH`              | 26.5-inch OLED; 2,560 × 1,440; max 480 Hz; 0.03 ms GtG; DCI-P3 98.5% typ.; HDMI 2; DisplayPort 1                                                | [LG Thailand — 27GX790A-B](https://www.lg.com/th/monitors/gaming/27gx790a-b/)         |
| `34WR50QK-B` | `EXACT-TH`              | 34-inch curved UltraWide; 3,440 × 1,440; 21:9; 100 Hz; 5 ms GtG; sRGB 99% typ.; HDMI 2; DisplayPort 1                                           | [LG Thailand — 34WR50QK-B](https://www.lg.com/th/monitors/ultrawide/34wr50qk-b/)      |
| `32SR85U-W`  | `EXACT-TH`              | 32-inch 4K UHD IPS smart monitor; webOS; 5 ms; HDMI 2; USB-C data/video with 90 W power delivery; FHD webcam                                    | [LG Thailand — 32SR85U-W](https://www.lg.com/th/monitors/smart-monitors/32sr85u-w/)   |
| `32U889SA`   | `MAPPED` → `32U889SA-W` | 31.5-inch 4K IPS touch display; 3,840 × 2,160; 60 Hz; 5 ms GtG; DCI-P3 95% typ.; HDMI 2; USB-C 3/65 W PD; Wi-Fi; Bluetooth; wheeled Swing stand | [LG Thailand — 32U889SA-W](https://www.lg.com/th/monitors/smart-monitors/32u889sa-w/) |
| `24U421A-B`  | `EXACT-TH`              | 23.8-inch FHD curved; 1,920 × 1,080; 100 Hz; 5 ms GtG; sRGB 99% typ.; HDMI 1; USB-C 1/15 W PD                                                   | [LG Thailand — 24U421A-B](https://www.lg.com/th/monitors/fhd-qhd/24u421a-b/)          |

## Implementation guardrails

- เก็บ `catalogModel`, `officialModel`, `sourceMarket`, `sourceUrl`, `verificationStatus` แยกกัน อย่า overwrite alias แล้วทำให้ route เดิมเสีย
- ใช้ `specifications` ต่อรุ่นจากตารางนี้ ไม่ใช้ category-level highlights เป็นสเปก เพราะหลายรุ่นตอบ `ไม่` ต่างกัน เช่น ThinQ, auto-open door, จำนวนแบตเตอรี่ และพอร์ต
- อย่าแสดง warranty จากค่า featured product เดิมเป็น “manufacturer warranty” โดยอัตโนมัติ; warranty ของ Subscribe, ตัวเครื่อง, compressor/motor และชิ้นส่วนเป็นคนละเงื่อนไข
- ค่า energy class/voltage จาก Hong Kong หรือ Portugal ไม่ควรนำไปแสดงในบริบทไทยจนกว่าจะมี LG Thailand source
- กรณีที่ LG title ขัดกับ full table (`WT1410NHEG`, `GC-L257KQKW`, `GC-X24FFCRB`) ต้องมี explicit editorial decision หรือคำยืนยันจาก LG ไม่ควรเลือกค่าที่ดูสมเหตุผลกว่าเอง
- ก่อน generate TypeScript ให้ทำ model coverage assertion: expected 48 unique `allProducts` models และทุก model ต้องมี research record; `WD110AN` ควรถูก block หรือแสดงเฉพาะข้อความที่ผ่านการยืนยันจนกว่าจะ resolve
