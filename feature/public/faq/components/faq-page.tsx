import type { Metadata } from "next";
import Link from "next/link";
import { ContactCta } from "@/components/contact-cta";
import { GeneratedIcon } from "@/components/generated-icon";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { FaqAccordion } from "@/feature/public/faq/components/faq-accordion";
import { createPageMetadata, faqs } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "FAQ LG Subscribe | คำถามที่พบบ่อย",
  description:
    "คำถามที่พบบ่อยเกี่ยวกับ LG Subscribe: คืออะไร ต่างจากการซื้ออย่างไร ต้องใช้เงินก้อนไหม ช่องทางชำระ รับประกัน และการโอนกรรมสิทธิ์เมื่อชำระครบ",
  path: "/faq/",
});

export default function FaqPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <>
      <JsonLd data={schema} />
      <header className="page-hero">
        <div className="container-page max-w-5xl text-center">
          <GeneratedIcon src="/images/generated/icon-consultation-v1.webp" alt="" className="mx-auto" />
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-red-400">FAQ LG Subscribe</p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">คำถามที่พบบ่อย</h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-white/65">
            รวมคำตอบเรื่องการสมัคร ช่องทางชำระเงิน การรับประกัน และกรรมสิทธิ์สินค้าเมื่อชำระครบตามสัญญา
          </p>
        </div>
      </header>

      <section className="section-space">
        <div className="container-page">
          <FaqAccordion />

          <div className="mt-10 rounded-2xl border border-red-100 bg-red-50 p-7">
            <h2 className="text-2xl font-bold text-red-950">ต้องการอ่านสรุปเงื่อนไข?</h2>
            <p className="mt-3 leading-7 text-red-950/75">
              คำตอบในหน้านี้เป็นสรุปเพื่อการตัดสินใจ ให้ยึดเอกสารที่บริษัทออกให้และเงื่อนไขในสัญญาฉบับเต็มเป็นหลัก
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild variant="link" className="text-red-800">
                <Link href="/terms/">อ่านฉบับสรุป</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      <ContactCta />
    </>
  );
}
