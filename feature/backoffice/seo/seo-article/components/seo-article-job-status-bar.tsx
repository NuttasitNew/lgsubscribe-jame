"use client";

import React from "react";
import { SeoArticleJobStatus, SeoArticleJobType } from "@prisma/client";
import { AlertCircle, CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useFindSeoArticleJobs } from "../tanstack/find-seo-article-jobs.query";

/** คำกริยาของแต่ละชนิดงาน — แถบสถานะต้องบอกว่ากำลังทำ "อะไร" ไม่ใช่บอกว่า "เขียน" ทุกงาน */
const JOB_VERB: Record<SeoArticleJobType, string> = {
  WRITE_CATEGORY: "เขียนบทความ",
  WRITE_NOW: "เขียนบทความ",
  GENERATE_IMAGES: "วาดรูปทั้งบทความ",
  TRANSLATE_EN: "แปลเป็นอังกฤษ",
  SINGLE_IMAGE: "วาดรูปประกอบ",
  WRITE_FAQ: "คิดคำถามหน้า ถาม-ตอบ",
  TRANSLATE_FAQ_EN: "แปลหน้า ถาม-ตอบ",
};

/**
 * @description แถบสรุปคิวงาน AI แบบบรรทัดเดียว — กดเพื่อกางรายละเอียดที่เลื่อนภายในได้
 * @page /super-admin/hurry-web/seo-article
 * @parent {@link seo-article-hub-main.tsx}
 * @access super-admin
 * @props ไม่มี — อ่านคิวจาก DB เอง
 * @features
 * - ค่าเริ่มต้นเป็น summary row เดียว ไม่ดันพื้นที่รายการบทความแม้มีงานเสร็จหลายรายการ
 * - กดทั้งแถวเพื่อดูรายละเอียด แยกกำลังทำ/เสร็จ/ไม่สำเร็จ และจำกัดความสูงพร้อม scroll ภายใน
 * - รูปประกอบทีละใบไม่เข้ารายการเสร็จแล้ว เพราะผลปรากฏใน editor อยู่แล้ว
 * - **ไม่ invalidate cache เอง** — งานนั้นเป็นของ useWatchSeoArticleJobs ที่หน้า hub เรียกไว้แล้ว
 * - ไม่มีงานในรอบ 12 ชม. = ไม่ render อะไรเลย
 * @dependencies
 * - useFindSeoArticleJobs: poll เฉพาะตอนมีงานค้าง
 * @data-flow
 * - queue-seo-article-job.action / queue-category-articles.action → SeoArticleJob
 *   → [this] อ่านผ่าน find-seo-article-jobs.action
 */
export const SeoArticleJobStatusBar = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { data: jobResult } = useFindSeoArticleJobs();

  const jobs = React.useMemo(() => {
    if (jobResult?.status !== "ok") return [];
    return jobResult.data?.jobs ?? [];
  }, [jobResult]);

  const activeJobs = React.useMemo(
    () => jobs.filter((job) => job.status === SeoArticleJobStatus.QUEUED || job.status === SeoArticleJobStatus.RUNNING),
    [jobs]
  );
  const doneJobs = React.useMemo(
    () =>
      jobs.filter((job) => job.status === SeoArticleJobStatus.DONE && job.jobType !== SeoArticleJobType.SINGLE_IMAGE),
    [jobs]
  );
  const failedJobs = React.useMemo(() => jobs.filter((job) => job.status === SeoArticleJobStatus.FAILED), [jobs]);
  // action ส่ง jobs ใหม่→เก่าอยู่แล้ว จึงหาจากลำดับเดิม ห้ามรวมตาม status ก่อนเพราะจะทำให้หัวข้อเก่าขึ้นเป็นล่าสุด
  const latestJob = React.useMemo(
    () =>
      jobs.find(
        (job) =>
          job.status === SeoArticleJobStatus.QUEUED ||
          job.status === SeoArticleJobStatus.RUNNING ||
          job.status === SeoArticleJobStatus.FAILED ||
          (job.status === SeoArticleJobStatus.DONE && job.jobType !== SeoArticleJobType.SINGLE_IMAGE)
      ),
    [jobs]
  );

  if (!latestJob) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} asChild>
      <Card className="shrink-0 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex h-11 w-full min-w-0 items-center gap-2 px-3 text-left transition-colors hover:bg-muted/50 md:px-4"
          >
            {activeJobs.length > 0 ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
            ) : failedJobs.length > 0 ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
            )}

            <span className="shrink-0 whitespace-nowrap text-xs font-semibold md:text-sm">
              {activeJobs.length > 0 && `กำลังทำ ${activeJobs.length}`}
              {activeJobs.length > 0 && (doneJobs.length > 0 || failedJobs.length > 0) && " · "}
              {doneJobs.length > 0 && `เสร็จแล้ว ${doneJobs.length}`}
              {doneJobs.length > 0 && failedJobs.length > 0 && " · "}
              {failedJobs.length > 0 && <span className="text-destructive">ไม่สำเร็จ {failedJobs.length}</span>}
            </span>

            <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground md:text-xs">
              [{JOB_VERB[latestJob.jobType]}] {latestJob.topic}
            </span>
            <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline md:text-xs">
              {isOpen ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
            </span>
            <ChevronDown
              className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div
            role="region"
            aria-label="รายละเอียดสถานะงาน AI"
            className="max-h-56 space-y-3 overflow-y-auto border-t px-3 py-3 pr-4 md:px-4"
          >
            {activeJobs.length > 0 && (
              <section aria-labelledby="seo-active-jobs-heading">
                <p id="seo-active-jobs-heading" className="text-xs font-semibold text-primary md:text-sm">
                  กำลังทำงาน {activeJobs.length} อย่าง
                </p>
                <p className="text-[11px] text-muted-foreground md:text-xs">
                  ทำงานเบื้องหลัง — ออกจากหน้านี้ได้ กลับมาดูทีหลังได้เลย
                </p>
                <ul className="mt-1 space-y-0.5">
                  {activeJobs.map((job) => (
                    <li key={job.seoArticleJobId} className="break-words text-[11px] text-muted-foreground md:text-xs">
                      • [{JOB_VERB[job.jobType]}] {job.topic}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {doneJobs.length > 0 && (
              <section aria-labelledby="seo-done-jobs-heading">
                <p id="seo-done-jobs-heading" className="text-xs font-semibold text-green-700 md:text-sm">
                  เสร็จแล้ว {doneJobs.length} อย่าง
                </p>
                <ul className="mt-1 space-y-0.5">
                  {doneJobs.map((job) => (
                    <li key={job.seoArticleJobId} className="break-words text-[11px] text-muted-foreground md:text-xs">
                      • [{JOB_VERB[job.jobType]}] {job.topic}
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-[11px] text-muted-foreground md:text-xs">
                  บทความที่เพิ่งเขียนอยู่ในรายการ &quot;รอรีวิว&quot; แล้ว
                </p>
              </section>
            )}

            {failedJobs.length > 0 && (
              <section aria-labelledby="seo-failed-jobs-heading">
                <p id="seo-failed-jobs-heading" className="text-xs font-semibold text-destructive md:text-sm">
                  ไม่สำเร็จ {failedJobs.length} อย่าง
                </p>
                <ul className="mt-1 space-y-1">
                  {failedJobs.map((job) => (
                    <li key={job.seoArticleJobId} className="text-[11px] text-muted-foreground md:text-xs">
                      <span className="block break-words">
                        • [{JOB_VERB[job.jobType]}] {job.topic}
                      </span>
                      {job.errorMessage && (
                        <span className="block break-words pl-2 text-destructive">{job.errorMessage}</span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-[11px] text-muted-foreground md:text-xs">กดสั่งใหม่ได้จากปุ่มเดิม</p>
              </section>
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
