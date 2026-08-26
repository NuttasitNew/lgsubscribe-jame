import type { ProductSpecificationRecord } from "@/lib/product-specifications";

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
        <div className="lg:sticky lg:top-[132px] lg:self-start">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#315247]">Technical profile</p>
          <p className="mt-7 font-mono text-sm font-bold tracking-[0.14em] text-red-700">{model}</p>
          <h2 id={headingId} className="mt-3 text-3xl font-bold leading-tight text-neutral-950 sm:text-4xl">
            ข้อมูลจำเพาะของรุ่นนี้
          </h2>
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
