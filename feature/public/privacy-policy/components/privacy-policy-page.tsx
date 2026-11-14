import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { CookieSettingsButton } from "@/feature/public/privacy-policy/components/cookie-settings-button";
import { authorizedAgent, createPageMetadata, siteConfig } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "นโยบายความเป็นส่วนตัว (PDPA)",
  description:
    "นโยบายความเป็นส่วนตัวของตัวแทนขาย LG Subscribe ที่ได้รับอนุญาต: เราเก็บข้อมูลอะไร ใช้ทำอะไร ใช้คุกกี้อย่างไร และวิธีใช้สิทธิของคุณตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562",
  path: "/privacy-policy/",
});

const effectiveDate = "14 พฤศจิกายน 2569";

const cookies = [
  {
    name: "lg_tracking_consent_v1",
    kind: "จำเป็น",
    purpose: "จำว่าคุณเลือกการใช้คุกกี้แบบไหน (เก็บในเบราว์เซอร์ของคุณ)",
    duration: "จนกว่าคุณจะล้างข้อมูลเบราว์เซอร์หรือเปลี่ยนตัวเลือก",
  },
  {
    name: "lg_web_visitor",
    kind: "สถิติ",
    purpose: "รหัสสุ่มสำหรับนับผู้เข้าชมซ้ำ ไม่ผูกกับชื่อหรือเบอร์โทร",
    duration: "1 ปี",
  },
  {
    name: "lg_web_session",
    kind: "สถิติ",
    purpose: "รวมการเปิดหลายหน้าในการเข้าชมครั้งเดียวกัน",
    duration: "30 นาที",
  },
  {
    name: "_ga, _ga_*",
    kind: "สถิติ",
    purpose: "Google Analytics วัดจำนวนผู้เข้าชมและหน้าที่ถูกเปิด",
    duration: "ตามที่ Google กำหนด (สูงสุดประมาณ 2 ปี)",
  },
  {
    name: "คุกกี้ Google Ads",
    kind: "โฆษณา",
    purpose: "วัดว่ามีคนเข้ามาจากโฆษณาแล้วกดติดต่อเราหรือไม่ (เราไม่เปิดการโฆษณาแบบปรับตามบุคคล)",
    duration: "ตามที่ Google กำหนด",
  },
] as const;

const purposes = [
  {
    purpose: "ตอบคำถาม แนะนำสินค้าและแพ็กเกจ และติดตามคำขอสมัครของคุณ",
    basis: "การดำเนินการตามคำขอของคุณก่อนเข้าทำสัญญา (มาตรา 24(3))",
  },
  {
    purpose: "ส่งข้อมูลการสมัครให้ LG เพื่อพิจารณาอนุมัติ จัดส่ง ติดตั้ง และให้บริการตามสัญญา",
    basis: "การปฏิบัติตามสัญญาหรือคำขอก่อนทำสัญญา (มาตรา 24(3))",
  },
  {
    purpose: "เก็บสถิติการเข้าชมด้วยคุกกี้สถิติและ Google Analytics เพื่อปรับปรุงเว็บไซต์",
    basis: "ความยินยอม (มาตรา 19) ถอนได้ทุกเมื่อ",
  },
  {
    purpose: "วัดผลโฆษณา เช่น Google Ads ว่าโฆษณาใดพาคนมาติดต่อเรา",
    basis: "ความยินยอม (มาตรา 19) ถอนได้ทุกเมื่อ",
  },
  {
    purpose: "จำตัวเลือกคุกกี้ ดูแลความปลอดภัย และป้องกันการใช้งานที่ผิดปกติ",
    basis: "ประโยชน์โดยชอบด้วยกฎหมาย (มาตรา 24(5))",
  },
  {
    purpose: "ปฏิบัติตามคำสั่งหรือข้อกำหนดของกฎหมาย",
    basis: "การปฏิบัติตามกฎหมาย (มาตรา 24(6))",
  },
] as const;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-28">
      <h2 id={`${id}-title`} className="text-2xl font-bold">
        {title}
      </h2>
      <div className="mt-4 grid gap-4 leading-8 text-neutral-700">{children}</div>
    </section>
  );
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="grid gap-2">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3">
          <span aria-hidden="true" className="mt-3 size-1.5 shrink-0 rounded-full bg-red-600" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <article>
      <header className="page-hero">
        <div className="container-page relative z-10 max-w-4xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-400">PDPA</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">นโยบายความเป็นส่วนตัว</h1>
          <p className="mt-6 text-lg leading-8 text-white/65">
            เราเก็บข้อมูลเท่าที่จำเป็นต่อการให้คำแนะนำและดูแลการสมัคร LG Subscribe ของคุณ
            หน้านี้อธิบายว่าเก็บอะไร ใช้ทำอะไร และคุณจัดการข้อมูลของตัวเองได้อย่างไร
          </p>
          <p className="mt-4 text-sm text-white/50">มีผลตั้งแต่วันที่ {effectiveDate}</p>
        </div>
      </header>

      <div className="section-space bg-white">
        <div className="container-page grid max-w-4xl gap-12">
          <Section id="controller" title="1. ใครเป็นผู้ดูแลข้อมูลของคุณ">
            <p>
              เว็บไซต์ {siteConfig.url.replace(/^https?:\/\//, "")} ดำเนินการโดย {authorizedAgent.nameTh}{" "}
              {authorizedAgent.roleTh} ตัวแทนขายบริการ LG Subscribe ที่ได้รับอนุญาต รหัสตัวแทน {authorizedAgent.code}{" "}
              (ต่อไปเรียกว่า &ldquo;เรา&rdquo;) ซึ่งเป็นผู้ควบคุมข้อมูลส่วนบุคคลที่เก็บผ่านเว็บไซต์และช่องทางติดต่อของเรา
            </p>
            <p>
              เราไม่ใช่บริษัท LG Electronics เมื่อคุณสมัครบริการ ข้อมูลที่ส่งต่อให้ LG
              จะอยู่ภายใต้นโยบายความเป็นส่วนตัวของ LG ด้วย
            </p>
          </Section>

          <Section id="data" title="2. ข้อมูลที่เราเก็บ">
            <p className="font-semibold text-neutral-900">เมื่อคุณเข้าชมเว็บไซต์</p>
            <List
              items={[
                "หน้าที่เปิด เวลาที่เข้าชม ประเภทอุปกรณ์ (มือถือ แท็บเล็ต คอมพิวเตอร์) และประเทศโดยประมาณ",
                "ช่องทางที่พาคุณมา เช่น Google, Facebook หรือแคมเปญโฆษณา",
                "การกดปุ่มติดต่อ LINE โทรศัพท์ หรืออีเมล (บันทึกเพียงว่ามีการกด ไม่บันทึกเนื้อหาที่คุยกัน)",
              ]}
            />
            <p>
              ข้อมูลสถิติเหล่านี้จะเก็บเฉพาะเมื่อคุณเลือก &ldquo;อนุญาตสถิติ&rdquo; หรือ &ldquo;อนุญาตทั้งหมด&rdquo;
              ในแบนเนอร์คุกกี้ และรหัสผู้เข้าชมจะถูกแปลงเป็นค่าเข้ารหัสก่อนบันทึก
              เราจึงไม่รู้ว่าผู้เข้าชมแต่ละคนเป็นใคร หากเบราว์เซอร์ของคุณเปิด Global Privacy Control หรือ Do Not Track
              เว็บไซต์จะถือว่าคุณเลือก &ldquo;เฉพาะที่จำเป็น&rdquo; โดยอัตโนมัติ
            </p>
            <p className="font-semibold text-neutral-900">เมื่อคุณติดต่อเราทาง LINE โทรศัพท์ หรืออีเมล</p>
            <List
              items={[
                "ชื่อที่แสดงและรูปโปรไฟล์ LINE รหัสผู้ใช้ LINE และข้อความที่คุณส่งถึง LINE Official Account ของเรา",
                "ชื่อ เบอร์โทรศัพท์ อีเมล และรายละเอียดสินค้าที่คุณสนใจ",
              ]}
            />
            <p className="font-semibold text-neutral-900">เมื่อคุณสมัครบริการ LG Subscribe ผ่านเรา</p>
            <List
              items={[
                "ข้อมูลและเอกสารที่ LG กำหนดให้ใช้ประกอบการสมัคร เช่น ชื่อ-นามสกุล เลขบัตรประชาชน ที่อยู่ติดตั้ง และข้อมูลสำหรับพิจารณาสินเชื่อ",
                "เราใช้ข้อมูลเหล่านี้เพื่อยื่นคำขอและติดตามสถานะกับ LG เท่านั้น",
              ]}
            />
          </Section>

          <Section id="purpose" title="3. เราใช้ข้อมูลทำอะไร และอาศัยฐานทางกฎหมายใด">
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-900">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">วัตถุประสงค์</th>
                    <th scope="col" className="px-4 py-3 font-semibold">ฐานทางกฎหมาย (พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {purposes.map((item) => (
                    <tr key={item.purpose} className="align-top">
                      <td className="px-4 py-3 leading-6">{item.purpose}</td>
                      <td className="px-4 py-3 leading-6">{item.basis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              เราไม่ขายข้อมูลส่วนบุคคลของคุณ ไม่ใช้ข้อมูลเพื่อทำโฆษณาแบบปรับตามบุคคล (personalized advertising)
              และไม่นำข้อมูลไปใช้นอกเหนือจากวัตถุประสงค์ที่ระบุไว้ หากต้องใช้เพื่อวัตถุประสงค์ใหม่ เราจะแจ้งและขอความยินยอมก่อน
            </p>
            <p>
              <span className="font-semibold text-neutral-900">หากคุณไม่ให้ข้อมูล:</span>{" "}
              คุณยังใช้งานเว็บไซต์ได้ตามปกติแม้ไม่อนุญาตคุกกี้สถิติหรือโฆษณา
              แต่หากไม่ให้ข้อมูลที่ LG กำหนดสำหรับการสมัคร เราจะไม่สามารถยื่นคำขอสมัครบริการแทนคุณได้
            </p>
            <p>
              <span className="font-semibold text-neutral-900">ข้อมูลอ่อนไหว:</span>{" "}
              เราไม่มีความประสงค์จะเก็บข้อมูลอ่อนไหว เช่น ศาสนาหรือหมู่โลหิต ที่ปรากฏบนสำเนาบัตรประชาชน
              กรุณาปิดทับข้อมูลดังกล่าวก่อนส่งให้เรา
            </p>
          </Section>

          <Section id="sharing" title="4. เราเปิดเผยข้อมูลให้ใคร">
            <List
              items={[
                "LG Electronics (Thailand) เพื่อพิจารณาและให้บริการ LG Subscribe เมื่อคุณสมัครบริการ",
                "Google (Google Analytics และ Google Ads) สำหรับสถิติและการวัดผลโฆษณา เฉพาะเมื่อคุณยินยอม",
                "LINE Corporation ในฐานะผู้ให้บริการแพลตฟอร์มแชต",
                "ผู้ให้บริการระบบที่ประมวลผลข้อมูลแทนเรา (ผู้ประมวลผลข้อมูล) เช่น Vercel (โฮสติ้งเว็บไซต์) และ Neon (ฐานข้อมูล)",
                "หน่วยงานของรัฐ เมื่อมีกฎหมายกำหนด",
              ]}
            />
          </Section>

          <Section id="transfer" title="5. การส่งข้อมูลไปต่างประเทศ">
            <p>
              ผู้ให้บริการบางรายข้างต้น เช่น Google, LINE, Vercel และ Neon อาจเก็บหรือประมวลผลข้อมูลบนเซิร์ฟเวอร์นอกประเทศไทย
              เราเลือกใช้ผู้ให้บริการที่มีมาตรการคุ้มครองข้อมูลตามมาตรฐานสากล และมีข้อตกลงด้านการคุ้มครองข้อมูล
              ทั้งนี้เป็นไปตามมาตรา 28 และ 29 แห่ง พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล
            </p>
          </Section>

          <Section id="cookies" title="6. คุกกี้ที่เว็บไซต์นี้ใช้">
            <p>
              คุกกี้คือไฟล์ขนาดเล็กที่เบราว์เซอร์เก็บไว้ ใช้จำการตั้งค่าและนับสถิติ เราแบ่งเป็น 3 กลุ่ม
              และจะใช้คุกกี้สถิติหรือโฆษณาเฉพาะเมื่อคุณเลือกอนุญาตเท่านั้น
            </p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-900">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">ชื่อ</th>
                    <th scope="col" className="px-4 py-3 font-semibold">ประเภท</th>
                    <th scope="col" className="px-4 py-3 font-semibold">ใช้ทำอะไร</th>
                    <th scope="col" className="px-4 py-3 font-semibold">ระยะเวลา</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cookies.map((cookie) => (
                    <tr key={cookie.name} className="align-top">
                      <td className="px-4 py-3 font-mono text-xs text-neutral-900">{cookie.name}</td>
                      <td className="whitespace-nowrap px-4 py-3">{cookie.kind}</td>
                      <td className="px-4 py-3 leading-6">{cookie.purpose}</td>
                      <td className="px-4 py-3 leading-6">{cookie.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-xl border border-border bg-neutral-50 p-5">
              <p className="mb-3">
                คุณเปลี่ยนใจได้ทุกเมื่อ กดปุ่มด้านล่างแล้วแบนเนอร์คุกกี้จะขึ้นมาให้เลือกใหม่ หากเลือก
                &ldquo;เฉพาะที่จำเป็น&rdquo; เว็บไซต์จะหยุดเก็บสถิติและลบคุกกี้สถิติของเราออก
              </p>
              <CookieSettingsButton />
            </div>
            <p>ลิงก์ของ Google ที่เกี่ยวข้อง สำหรับดูรายละเอียดหรือปฏิเสธการติดตามเพิ่มเติม:</p>
            <List
              items={[
                <a key="partner" href="https://policies.google.com/technologies/partner-sites?hl=th" target="_blank" rel="noopener noreferrer" className="text-red-700 underline underline-offset-4">
                  วิธีที่ Google ใช้ข้อมูลจากเว็บไซต์ที่ใช้บริการของ Google
                </a>,
                <a key="ads" href="https://myadcenter.google.com/" target="_blank" rel="noopener noreferrer" className="text-red-700 underline underline-offset-4">
                  ตั้งค่าโฆษณาของ Google (My Ad Center)
                </a>,
                <a key="gaoptout" href="https://tools.google.com/dlpage/gaoptout?hl=th" target="_blank" rel="noopener noreferrer" className="text-red-700 underline underline-offset-4">
                  ส่วนเสริมเบราว์เซอร์สำหรับเลือกไม่ใช้ Google Analytics
                </a>,
              ]}
            />
            <p>คุณยังตั้งค่าเบราว์เซอร์ให้ปฏิเสธหรือลบคุกกี้ได้เอง แต่บางส่วนของเว็บไซต์อาจจำตัวเลือกของคุณไม่ได้</p>
          </Section>

          <Section id="retention" title="7. เราเก็บข้อมูลนานแค่ไหน">
            <List
              items={[
                "ข้อมูลสถิติการเข้าชม เก็บเท่าที่จำเป็นต่อการดูแนวโน้มของเว็บไซต์ และไม่เกิน 2 ปี",
                "ข้อความและข้อมูลติดต่อ เก็บไว้ระหว่างที่เรายังดูแลคำถามหรือการสมัครของคุณ และไม่เกิน 2 ปีนับจากการติดต่อครั้งล่าสุด เว้นแต่คุณขอให้ลบก่อน",
                "ข้อมูลการสมัครบริการ เก็บตลอดอายุสัญญาและระยะเวลาที่กฎหมายกำหนด",
              ]}
            />
          </Section>

          <Section id="rights" title="8. สิทธิของคุณ">
            <p>ตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 คุณมีสิทธิ</p>
            <List
              items={[
                "ขอดูหรือขอสำเนาข้อมูลของคุณ",
                "ขอแก้ไขข้อมูลที่ไม่ถูกต้อง",
                "ขอให้ลบ หรือระงับการใช้ข้อมูล",
                "คัดค้านการเก็บหรือใช้ข้อมูล และถอนความยินยอมเมื่อใดก็ได้",
                "ขอให้โอนย้ายข้อมูล",
                "ร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส.)",
              ]}
            />
            <p>
              ติดต่อขอใช้สิทธิได้ตามช่องทางด้านล่าง เราจะตอบกลับภายใน 30 วัน การถอนความยินยอมไม่กระทบการใช้ข้อมูลที่ทำไปก่อนหน้านั้น
            </p>
          </Section>

          <Section id="security" title="9. การรักษาความปลอดภัย">
            <p>
              เว็บไซต์เชื่อมต่อแบบเข้ารหัส (HTTPS) รหัสผู้เข้าชมถูกแปลงเป็นค่าเข้ารหัสก่อนบันทึก
              และระบบหลังบ้านจำกัดให้เฉพาะผู้ที่ได้รับสิทธิเข้าดูข้อมูลได้
            </p>
          </Section>

          <Section id="minors" title="10. ผู้เยาว์">
            <p>
              บริการ LG Subscribe มีไว้สำหรับผู้ที่บรรลุนิติภาวะแล้ว เราไม่มีเจตนาเก็บข้อมูลของผู้ที่อายุต่ำกว่า 20 ปี
              โดยไม่ได้รับความยินยอมจากผู้ใช้อำนาจปกครอง หากพบว่ามีการเก็บข้อมูลดังกล่าว โปรดแจ้งเรา เราจะลบโดยเร็ว
            </p>
          </Section>

          <Section id="contact" title="11. ติดต่อเรื่องข้อมูลส่วนบุคคล">
            <List
              items={[
                <>
                  อีเมล:{" "}
                  <a href={`mailto:${siteConfig.email}`} className="text-red-700 underline underline-offset-4">
                    {siteConfig.email}
                  </a>
                </>,
                <>
                  LINE:{" "}
                  <a href={siteConfig.lineUrl} className="text-red-700 underline underline-offset-4">
                    {siteConfig.lineId}
                  </a>
                </>,
                <>
                  โทร:{" "}
                  {siteConfig.phoneNumbers.map((phone, index) => (
                    <span key={phone.href}>
                      {index > 0 && ", "}
                      <a href={phone.href} className="text-red-700 underline underline-offset-4">
                        {phone.label}
                      </a>
                    </span>
                  ))}
                </>,
              ]}
            />
          </Section>

          <Section id="changes" title="12. การเปลี่ยนแปลงนโยบาย">
            <p>
              หากมีการแก้ไขนโยบายนี้ เราจะปรับวันที่มีผลด้านบนของหน้า หากเป็นการเปลี่ยนแปลงสำคัญ
              เราจะขอความยินยอมใหม่ตามที่กฎหมายกำหนด ดูข้อมูลสถานะตัวแทนเพิ่มเติมได้ที่{" "}
              <Link href={authorizedAgent.path} className="text-red-700 underline underline-offset-4">
                หน้าความน่าเชื่อถือ
              </Link>
            </p>
          </Section>
        </div>
      </div>
    </article>
  );
}
