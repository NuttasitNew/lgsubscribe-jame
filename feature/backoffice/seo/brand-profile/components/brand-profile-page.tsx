"use client";
import Image from "next/image";
import { useQueryStates, parseAsString, parseAsStringLiteral } from "nuqs";
import Link from "next/link";
import { ArrowLeft, Plus, ImagePlus, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrandProfile } from "../tanstack/get-brand-profile.query";
import { BrandProfileDialog } from "./brand-profile-dialog";

/** @description หน้าจัดการ prompt และภาพบริษัท แยก section พร้อม dialog หลาย phase @page /super-admin/hurry-web/brand-profile @access super-admin */
export const BrandProfilePage = () => {
  const { data: profile, isLoading, error, refetch } = useBrandProfile();
  const [params, setParams] = useQueryStates(
    { section: parseAsStringLiteral(["prompt", "reference"] as const), reference: parseAsString },
    { history: "push", shallow: true }
  );
  const selected = params.section ? { kind: params.section, id: params.reference ?? undefined } : null;
  const setSelected = (value: { kind: "prompt" | "reference"; id?: string } | null) => {
    void setParams({ section: value?.kind ?? null, reference: value?.id ?? null });
  };
  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
      <header className="space-y-4 border-b pb-6">
        <Link
          href="/backoffice/seo/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับไปแก้ไขเว็บไซต์
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-widest text-amber-700">LG SUBSCRIBE · ภาพของแบรนด์</p>
            <h1 className="text-2xl font-semibold md:text-3xl">ชุดอ้างอิงสำหรับ AI</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              ให้ AI รู้จักทีมงาน เครื่องมือ และภาพแบบที่บริษัทใช้
              เปลี่ยนรูปหรือเพิ่มรายละเอียดได้ที่นี่ก่อนนำไปสร้างภาพบนเว็บไซต์
            </p>
          </div>
          <Button variant="outline" onClick={() => void refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            โหลดข้อมูลล่าสุด
          </Button>
        </div>
      </header>
      {isLoading && <p role="status">กำลังโหลดชุดอ้างอิง…</p>}
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          {error.message}
        </p>
      )}
      {profile && (
        <>
          <section className="grid gap-5 md:grid-cols-[240px_1fr]">
            <div>
              <FileText className="mb-3 h-5 w-5 text-amber-600" />
              <h2 className="text-lg font-semibold">แนวทางภาพของบริษัท</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">คำสั่งร่วมที่ AI ใช้กับภาพใหม่ทุกครั้ง</p>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-7">{profile.systemPrompt}</p>
              <Button className="mt-4" variant="outline" onClick={() => setSelected({ kind: "prompt" })}>
                ดูรายละเอียดและแก้ไขแนวทาง
              </Button>
            </div>
          </section>
          <section className="border-t pt-7">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <ImagePlus className="h-5 w-5 text-amber-600" />
                  รูปอ้างอิง
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  เปิดใช้ {profile.references.filter((item) => item.enabled).length} / 8 รูป · เพิ่มได้สูงสุด 16 รูป
                  และพักรูปเก่าไว้ได้
                </p>
              </div>
              <Button onClick={() => setSelected({ kind: "reference" })} disabled={profile.references.length >= 16}>
                <Plus className="mr-2 h-4 w-4" />
                เพิ่มรูปอ้างอิง
              </Button>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {profile.references.map((item) => (
                <button
                  key={item.id}
                  className="group overflow-hidden rounded-xl border bg-card text-left transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500"
                  onClick={() => setSelected({ kind: "reference", id: item.id })}
                >
                  <div className="relative aspect-[4/3] bg-muted/30 p-3">
                    <Image
                      unoptimized
                      width={800}
                      height={800}
                      src={item.url}
                      alt={item.label}
                      className="h-full w-full object-contain"
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-background px-2 py-1 text-xs shadow-sm">
                      {item.enabled ? "เปิดใช้งาน" : "พักการใช้งาน"}
                    </span>
                  </div>
                  <div className="space-y-2 border-t p-4">
                    <p className="text-xs text-muted-foreground">
                      {item.kind === "uniform"
                        ? "ทีมงาน / ยูนิฟอร์ม"
                        : item.kind === "equipment"
                          ? "เครื่องมือ / อุปกรณ์"
                          : "โทนภาพ / สถานที่"}
                    </p>
                    <h3 className="font-semibold">{item.label}</h3>
                    <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                    <p className="pt-2 text-sm font-medium">ดูรายละเอียด →</p>
                  </div>
                </button>
              ))}
            </div>
            {!profile.references.length && (
              <p className="rounded-xl border border-dashed p-8 text-center text-sm">
                เพิ่มรูปทีมงาน เครื่องมือ หรือโทนภาพเพื่อเริ่มสร้างชุดอ้างอิงของบริษัท
              </p>
            )}
          </section>
          <p className="border-t pt-4 text-xs text-muted-foreground">
            {profile.updatedAt
              ? `ปรับปรุงโดย ${profile.updatedBy} · ${new Date(profile.updatedAt).toLocaleString("th-TH")}`
              : "กำลังใช้ชุดเริ่มต้นของบริษัท — บันทึกครั้งแรกเพื่อสร้างชุดที่จัดการเอง"}
          </p>
          {selected && (
            <BrandProfileDialog
              key={`${selected.kind}-${selected.id ?? "new"}`}
              profile={profile}
              kind={selected.kind}
              referenceId={selected.id}
              onClose={() => setSelected(null)}
            />
          )}
        </>
      )}
    </div>
  );
};
