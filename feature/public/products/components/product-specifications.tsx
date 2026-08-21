import type { ProductSpecificationRecord } from "@/lib/product-specifications";

const thaiMonths = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
] as const;

function formatVerifiedAt(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day || !thaiMonths[month - 1]) return value;
  return `${day} ${thaiMonths[month - 1]} ${year + 543}`;
}

export function ProductSpecifications({
  model,
  record,
}: {
  model: string;
  record: ProductSpecificationRecord;
}) {
  const headingId = `product-specifications-${model.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  if (record.status === "unverified" || record.groups.length === 0) {
    return null;
  }

  return (
    <section className="section-space border-y border-black/10 bg-[#e7ebe5]" aria-labelledby={headingId}>
      <div className="container-page grid gap-10 lg:grid-cols-[0.68fr_1.32fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#315247]">Technical profile</p>
          <p className="mt-7 font-mono text-sm font-bold tracking-[0.14em] text-red-700">{model}</p>
          <h2 id={headingId} className="mt-3 text-3xl font-bold leading-tight text-neutral-950 sm:text-4xl">
            ข้อมูลจำเพาะของรุ่นนี้
          </h2>
          <p className="mt-5 max-w-xl leading-7 text-neutral-600">
            คัดเฉพาะข้อมูลสำคัญสำหรับเปรียบเทียบการใช้งานและวางแผนพื้นที่จากหน้าสินค้าทางการของ LG
          </p>

          <dl className="mt-8 grid gap-2 border-l-2 border-red-700 pl-5 text-sm">
            <div className="grid grid-cols-[7.25rem_1fr] gap-3">
              <dt className="text-neutral-500">แหล่งข้อมูล</dt>
              <dd className="font-semibold text-neutral-900">LG</dd>
            </div>
            <div className="grid grid-cols-[7.25rem_1fr] gap-3">
              <dt className="text-neutral-500">ตรวจสอบเมื่อ</dt>
              <dd className="font-semibold text-neutral-900">{formatVerifiedAt(record.verifiedAt)}</dd>
            </div>
          </dl>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {record.groups.map((group) => (
            <article
              key={group.title}
              className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)]"
            >
              <h3 className="border-b border-black/10 bg-[#faf9f7] px-6 py-4 text-sm font-bold text-neutral-950">
                {group.title}
              </h3>
              <dl className="divide-y divide-black/10 px-6">
                {group.items.map((item) => (
                  <div key={`${item.label}-${item.value}`} className="grid gap-1 py-4">
                    <dt className="text-xs leading-5 text-neutral-500">{item.label}</dt>
                    <dd className="break-words text-base font-bold leading-6 text-neutral-950">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
