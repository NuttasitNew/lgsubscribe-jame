"use client";

import { useSeoArticleNavigation } from "../nuqs/seo-article-navigation-param";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { SeoArticleJobType, SeoArticleStatus } from "@prisma/client";
import { AlertCircle, ArrowLeft, CloudOff, Loader2, RotateCcw, Save, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isSeoArticleEditEqual, type SeoArticleEditSnapshot } from "@/lib/seo/helper/is-seo-article-edit-equal";
import { validateSeoArticleEdit, type SeoArticleEditIssue } from "@/lib/seo/helper/validate-seo-article-edit";
import { useFindSeoArticleDetail } from "../tanstack/find-seo-article-detail.query";
import { useSaveSeoArticle } from "../tanstack/save-seo-article.mutation";
import { useSaveSeoArticleDraft } from "../tanstack/save-seo-article-draft.mutation";
import { useDiscardSeoArticleDraft } from "../tanstack/discard-seo-article-draft.mutation";
import { usePublishSeoArticle } from "../tanstack/publish-seo-article.mutation";
import { useDeleteSeoArticle } from "../tanstack/delete-seo-article.mutation";
import { useQueueSeoArticleJob } from "../tanstack/queue-seo-article-job.mutation";
import { useFindSeoArticleJobs } from "../tanstack/find-seo-article-jobs.query";
import { findActiveSeoArticleJob, findLatestDoneSeoArticleJob } from "../helper/pick-seo-article-jobs.helper";
import { readSeoArticleEnMeta } from "../helper/read-seo-article-en-meta.helper";
import { readSeoArticleDraft } from "../helper/read-seo-article-draft.helper";
import { readLegacyLocalDraft } from "../helper/read-legacy-local-draft.helper";
import { useSeoArticleEditorStore } from "../zustand/seo-article-editor.store";
import { SeoArticleBlockEditorClient } from "./seo-article-block-editor-client";
import { SeoArticleEnMetaForm } from "./seo-article-en-meta-form";
import { SeoArticleCoverBanner } from "./seo-article-cover-banner";
import { SeoArticleFaqEditor } from "./seo-article-faq-editor";
import { SeoArticleMetaForm } from "./seo-article-meta-form";
import { SeoArticleMetricsPanel } from "./seo-article-metrics-panel";
import { SeoArticlePublishConfirmStep } from "./seo-article-publish-confirm-step";
import { SeoArticleShortcutHelp } from "./seo-article-shortcut-help";

/**
 * หน่วงก่อนส่งร่างขึ้นฐาน — พิมพ์รัว ๆ จะได้ไม่ยิง server ทุกตัวอักษร
 * ยาวกว่าตอนที่เก็บลงเครื่อง (0.8 วิ) เพราะรอบนี้เป็น network call จริง ไม่ใช่เขียนหน่วยความจำ
 */
const DRAFT_AUTOSAVE_DELAY_MS = 2000;

/** ป้ายสถานะบทความ (ชุดเดียวกับการ์ดในหน้ารายการ) */
const STATUS_BADGE: Record<SeoArticleStatus, { label: string; className: string }> = {
  DRAFT: { label: "ร่างรอรีวิว", className: "bg-amber-100 text-amber-700" },
  APPROVED: { label: "อนุมัติแล้ว", className: "bg-sky-100 text-sky-700" },
  PUBLISHED: { label: "เผยแพร่แล้ว", className: "bg-emerald-100 text-emerald-700" },
  REJECTED: { label: "ปัดตก", className: "bg-gray-200 text-gray-600" },
};

interface SeoArticleEditorPageProps {
  seoArticleId: number;
  /** ปิดหน้าแก้ไข (ล้าง ?edit= ออกจาก URL) */
  onClose: () => void;
}

/**
 * @description หน้าแก้ไขบทความ SEO แบบเต็มหน้า — โปรแกรมแก้ไขบล็อกสไตล์ Notion + ข้อมูล SEO + ผลวัดจาก Google
 * @page /super-admin/hurry-web/seo-article?edit=<id>
 * @access super-admin
 * @parent {@link seo-article-hub-main.tsx}
 * @props { seoArticleId: number, onClose: () => void }
 * @features
 * - **ผืนเอกสารเดียว** เรียงตามที่ผู้อ่านเห็นจริงบนเว็บ: รูปปก+ชื่อบทความ (H1) → เนื้อหาบล็อก → คำถามที่พบบ่อย
 *   ทุกส่วนคลิกแล้วพิมพ์ทับได้ในที่ ไม่มีฟอร์มแยกการ์ดให้ต้องไปหาช่องกรอกที่อื่น
 * - ความกว้างผืนเอกสาร = max-w-4xl เท่าคอลัมน์บทความจริง (hurry-web dynamic-article-content.tsx)
 *   วางกลางจอบนพื้นเทา ให้ดูเหมือนกระดาษบทความ
 * - ข้อมูล SEO ที่ผู้อ่านไม่เห็น (URL/meta description/คำค้น/หมวด) อยู่คอลัมน์ขวา ไม่ขวางหัวเอกสาร
 *   จอเล็กกว่า lg คอลัมน์ขวาจะไหลลงไปต่อท้ายเอกสารแทน (ไม่บังเนื้อหา)
 * - **เต็มหน้า ไม่ใช่ dialog** — โปรแกรมแก้ไขมี popup ของตัวเอง (เมนู /, แถบจัดรูปแบบ, หมุดลาก)
 *   ถ้าอยู่ใน dialog จะชนกับ focus trap จนพิมพ์ในเมนูไม่ได้
 * - autosave **ลงเครื่องเท่านั้น** ทุก 0.8 วิ — ห้ามแตะฐานข้อมูล เพราะบทความที่เผยแพร่แล้วการบันทึก = deploy เว็บใหม่
 * - ปุ่มบันทึกถูกปิดไว้เมื่อเนื้อหาไม่ต่างจากของจริง (กันเคส "เปิดดูแล้วปิด" กลายเป็น deploy ใหม่)
 * - บทความที่เผยแพร่แล้วต้องผ่านหน้ายืนยันก่อนทับของบนเว็บ (เปลี่ยน content ทั้งหน้า ไม่ใช่ Swal ซ้อน)
 * - meta ภาษาอังกฤษของหน้า /en/blog/<slug> อยู่คอลัมน์ขวาแบบพับเก็บได้ ({@link seo-article-en-meta-form.tsx})
 *   ปล่อยว่าง = บทความไทยล้วน เว็บคืน 404 ที่ /en ตามเดิม — เป็นค่าปกติของบทความที่ AI เขียนใหม่
 * - แผงผลวัด Google Search Console คาไว้คอลัมน์ขวาระหว่างแก้ จะได้รู้ว่าบทความนี้ติดคำไหนอยู่ก่อนแก้ทิ้ง
 * - บทความโครงเก่า (v1 ที่เก็บ HTML ราย section) ถูกแปลงเป็นบล็อกให้อัตโนมัติตอนเปิด พร้อมแจ้งจำนวนจุดที่ต้องดู
 * @dependencies
 * - useFindSeoArticleDetail, useSaveSeoArticle, useSeoArticleEditorStore
 * @data-flow
 * - find-seo-article-detail → แปลงเป็น snapshot → editor store → (แก้) → save-seo-article → markSaved
 * @related
 * - เทียบเนื้อหา: {@link @/lib/seo/helper/is-seo-article-edit-equal}
 * - ด่านตรวจก่อนบันทึก: {@link @/lib/seo/helper/validate-seo-article-edit}
 */
export const SeoArticleEditorPage = ({ seoArticleId, onClose }: SeoArticleEditorPageProps) => {
  const { data: detailResponse, isLoading } = useFindSeoArticleDetail(seoArticleId);
  const { mutate: saveArticle, isPending: isSavingToDb } = useSaveSeoArticle();
  const { mutate: publishArticle, isPending: isPublishing } = usePublishSeoArticle();
  const { mutate: deleteArticle, isPending: isDeleting } = useDeleteSeoArticle();
  const { mutate: queueJob } = useQueueSeoArticleJob();
  const { mutate: saveDraft } = useSaveSeoArticleDraft();
  const { mutate: discardDraft } = useDiscardSeoArticleDraft();

  // งาน gen รูปยกชุดอยู่ในคิว — ปุ่มจึงหมุนตามสถานะใน DB ไม่ใช่ isPending
  // (สั่งแล้วกด back ออกไปหน้ารายการ เปิดกลับเข้ามาใหม่ ปุ่มก็ยังหมุนต่อจนงานจบจริง)
  const { data: jobResult } = useFindSeoArticleJobs();
  const jobs = useMemo(() => (jobResult?.status === "ok" ? (jobResult.data?.jobs ?? []) : []), [jobResult]);
  const isGeneratingImages =
    findActiveSeoArticleJob(jobs, { jobType: SeoArticleJobType.GENERATE_IMAGES, seoArticleId }) != null;

  const detail = detailResponse?.status === "ok" ? detailResponse.data : null;
  const article = detail?.article ?? null;
  const isSaving = isSavingToDb || isPublishing;

  const draft = useSeoArticleEditorStore((state) => state.draft);
  const baseline = useSeoArticleEditorStore((state) => state.baseline);
  const { editPhase: step, setEditPhase: setStep } = useSeoArticleNavigation();
  const draftSavedAt = useSeoArticleEditorStore((state) => state.draftSavedAt);
  const restoredFromDraft = useSeoArticleEditorStore((state) => state.restoredFromDraft);
  const staleDraft = useSeoArticleEditorStore((state) => state.staleDraft);
  const restoreStaleDraft = useSeoArticleEditorStore((state) => state.restoreStaleDraft);
  const openEditor = useSeoArticleEditorStore((state) => state.openEditor);
  const closeEditor = useSeoArticleEditorStore((state) => state.closeEditor);
  const setBlocks = useSeoArticleEditorStore((state) => state.setBlocks);
  const discardChanges = useSeoArticleEditorStore((state) => state.discardChanges);
  const markSaved = useSeoArticleEditorStore((state) => state.markSaved);
  const markDraftSaved = useSeoArticleEditorStore((state) => state.markDraftSaved);

  /**
   * สถานะฉบับ EN ในฐาน — ตัวฟอร์ม EN เอาไปตัดสินว่าจะขึ้นธง "ล้าสมัย" ไหม
   * อ่านจาก `article` (ของจริงในฐาน) ไม่ใช่จากร่าง เพราะร่างยังไม่ได้แปล
   */
  const enSyncState = useMemo(
    () => ({
      sourceHash: article?.contentEnSourceHash ?? null,
      hasEnContent: article?.contentJsonEn != null,
    }),
    [article]
  );

  const [issues, setIssues] = useState<SeoArticleEditIssue[]>([]);
  /**
   * updatedAt ที่ client ถืออยู่ — ส่งไปกับทุกครั้งที่บันทึกเพื่อกันบันทึกทับกัน (optimistic concurrency)
   * ต้องอัปเดตจากแถวที่ server คืนกลับมาหลังบันทึกสำเร็จ ไม่งั้นบันทึกครั้งที่สองจะโดน [SEO-SAVE-06] ทันที
   */
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState<Date | string | null>(null);
  /** เพิ่มค่าเพื่อบังคับ remount โปรแกรมแก้ไข (ตัว editor เป็น uncontrolled จึงไม่รับค่าใหม่เอง) */
  const [editorVersion, setEditorVersion] = useState(0);
  const loadedArticleIdRef = useRef<number | null>(null);

  // โหลดบทความเข้า store ครั้งเดียวต่อบทความ — ถ้า sync ทุกครั้งที่ query refetch งานที่แก้ค้างไว้จะหาย
  useEffect(() => {
    if (!article || !detail || loadedArticleIdRef.current === article.seoArticleId) return;
    loadedArticleIdRef.current = article.seoArticleId;

    // meta EN อ่านแบบไม่ผูก type ของ Prisma — คอลัมน์ชุดนี้เพิ่งเพิ่ม แถวเก่าทั้งหมดยังเป็น null
    const enMeta = readSeoArticleEnMeta(article);

    const snapshot: SeoArticleEditSnapshot = {
      title: article.title,
      slug: article.slug,
      metaDescription: article.metaDescription,
      keywords: article.keywords,
      targetKeyword: article.targetKeyword,
      // server แปลงบทความโครงเก่าเป็นบล็อกมาให้แล้ว (ฐานยังเก็บของเดิมจนกว่าจะกดบันทึก)
      content: detail.content,
      titleEn: enMeta.titleEn,
      metaDescriptionEn: enMeta.metaDescriptionEn,
      keywordsEn: enMeta.keywordsEn,
    };

    setExpectedUpdatedAt(article.updatedAt);

    // ร่างค้างมาจากฐาน (ไม่ใช่ localStorage แล้ว) — ข้ามเครื่องได้ และไม่หายแม้ล้าง cache
    // ร่างที่เก่ากว่าเนื้อจริงจะถูกพักไว้ให้ผู้ใช้เลือกเอง ไม่กู้ทับเงียบ ๆ
    // (งาน AI gen รูปยกชุดเขียน contentJson ตรง ๆ ร่างเก่าทับ = รูปที่ gen ไปหายตอนกดบันทึก)
    const pending = readSeoArticleDraft(article);

    // ยังไม่มีร่างในฐาน = อาจเป็นเครื่องที่มีร่างเก่าค้างใน localStorage จากก่อนย้ายมาเก็บในฐาน
    // อ่านขึ้นมาใช้แทนครั้งเดียว (helper ลบ key ให้แล้ว) — autosave รอบแรกจะดันขึ้นฐานเอง
    const legacy = pending.snapshot ? null : readLegacyLocalDraft(article.seoArticleId);
    const restored = pending.snapshot
      ? { snapshot: pending.snapshot, savedAt: pending.savedAt!, isOutdated: pending.isOutdated }
      : legacy
        ? {
            snapshot: legacy.snapshot,
            savedAt: legacy.savedAt,
            isOutdated: new Date(legacy.savedAt).getTime() < new Date(article.contentUpdatedAt).getTime(),
          }
        : null;

    openEditor(article.seoArticleId, snapshot, restored);
    setEditorVersion((version) => version + 1);
  }, [article, detail, openEditor]);

  // ล้าง store ตอนออกจากหน้า — ค่าที่ค้างไว้จะทำให้ปุ่ม "สร้างรูปใหม่" ของหน้ารายการถูกปิดค้าง
  useEffect(() => () => closeEditor(), [closeEditor]);

  const isPublished = article?.status === SeoArticleStatus.PUBLISHED;
  const hasChanges = useMemo(
    () => Boolean(baseline && draft && !isSeoArticleEditEqual(baseline, draft)),
    [baseline, draft]
  );

  /**
   * autosave ร่างขึ้นฐาน — เขียนช่อง draftJson เท่านั้น ไม่แตะเนื้อจริง จึงไม่ทำให้เว็บ deploy
   * ยิงเฉพาะตอนเนื้อหาต่างจากของจริงเท่านั้น เปิดดูเฉย ๆ แล้วปิดจะได้ไม่สร้างร่างเปล่าค้างไว้
   * updatedAt ขยับทุกครั้งที่เซฟร่าง จึงต้องรับค่าใหม่มาแทน ไม่งั้นการกดบันทึกจะถูกตีกลับว่าชนกับตัวเอง
   */
  useEffect(() => {
    if (!draft || !article || !hasChanges) return;

    const timer = setTimeout(() => {
      saveDraft(
        { seoArticleId: article.seoArticleId, snapshot: draft },
        {
          onSuccess: (result) => {
            if (result.status !== "ok" || !result.data) return;
            setExpectedUpdatedAt(result.data.updatedAt);
            markDraftSaved(new Date(result.data.draftSavedAt).toISOString());
          },
        }
      );
    }, DRAFT_AUTOSAVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [draft, article, hasChanges, saveDraft, markDraftSaved]);

  const handleSave = () => {
    if (!draft || !article) return;

    const found = validateSeoArticleEdit(draft, isPublished ? { lockedSlug: article.slug } : {});
    setIssues(found);
    if (found.length > 0) {
      setStep("edit");
      return;
    }

    // บทความที่เผยแพร่แล้ว = บันทึกแล้วขึ้นเว็บทันที → ต้องผ่านหน้ายืนยันก่อนเสมอ
    if (isPublished && step !== "confirm-publish") {
      setStep("confirm-publish");
      return;
    }

    if (!expectedUpdatedAt) return;

    saveArticle(
      {
        seoArticleId: article.seoArticleId,
        title: draft.title.trim(),
        slug: draft.slug.trim(),
        metaDescription: draft.metaDescription.trim(),
        targetKeyword: draft.targetKeyword === undefined ? undefined : draft.targetKeyword?.trim() || null,
        keywords: draft.keywords.map((keyword) => keyword.trim()).filter(Boolean),
        // meta EN — ว่าง = บทความไทยล้วน ส่ง null ให้ฐานเคลียร์ค่าเดิม (ไม่ใช่สตริงว่างที่เว็บจะเผลอเปิดหน้า /en ให้)
        titleEn: draft.titleEn?.trim() || null,
        metaDescriptionEn: draft.metaDescriptionEn?.trim() || null,
        keywordsEn: (draft.keywordsEn ?? []).map((keyword) => keyword.trim()).filter(Boolean),
        contentJson: draft.content,
        expectedUpdatedAt,
      },
      {
        onSuccess: (result) => {
          if (result.status !== "ok" || !result.data) return;

          // เก็บ updatedAt ใหม่ไว้ใช้เซฟรอบถัดไป ไม่งั้นกดบันทึกครั้งที่ 2 จะเจอ "มีคนแก้แซง"
          setExpectedUpdatedAt(result.data.updatedAt);
          markSaved();
          setStep("edit");

          // บทความที่อยู่บนเว็บแล้ว: บันทึกลงฐานอย่างเดียวยังไม่ขึ้นเว็บ ต้อง push ทับไฟล์เดิมต่อ
          if (isPublished) publishArticle({ seoArticleId: article.seoArticleId });
        },
      }
    );
  };

  /**
   * ลบบทความ — ต้องยืนยันก่อนเสมอ และ**ข้อความยืนยันต้องบอกผลกระทบจริงตามสถานะ**
   * บทความที่ขึ้นเว็บแล้ว การลบ = URL ที่ Google เก็บไว้กลายเป็น 404 ซึ่งกู้อันดับคืนไม่ได้ง่าย ๆ
   * ถ้าเขียนข้อความยืนยันกลาง ๆ เหมือนกันหมด ผู้ใช้จะกดผ่านโดยไม่รู้ว่ากำลังทิ้งอันดับ SEO ทิ้ง
   */
  const handleDelete = async () => {
    if (!article) return;

    if (step !== "confirm-delete") {
      void setStep("confirm-delete");
      return;
    }

    deleteArticle(
      { seoArticleId: article.seoArticleId },
      // ปิดหน้าแก้ไขหลังลบสำเร็จ — ค้างอยู่ต่อไม่ได้ เพราะ query ของบทความนี้จะกลายเป็น 404 ทันที
      { onSuccess: (result) => result.status === "ok" && onClose() }
    );
  };

  /**
   * สร้างรูปใหม่ให้ทั้งบทความ — งานนี้อ่าน contentJson จากฐาน แล้วเขียนทับด้วยฉบับที่ใส่รูปใหม่
   * ร่างที่ค้างในหน้าจึงต้องถูกบันทึกลงฐานให้หมดก่อน (ปุ่มถูกปิดไว้เมื่อ hasChanges) ไม่งั้น
   * ผลลัพธ์จะเป็นบทความฉบับในฐาน + รูปใหม่ = งานที่แก้ค้างไว้หายเงียบ ๆ
   * กดแล้วได้แค่ "รับงาน" — รูปจริงมาทีหลัง หน้าจอโหลดของใหม่ที่ effect ข้างล่าง
   */
  const handleGenerateImages = () => {
    if (!article || hasChanges) return;
    queueJob({ jobType: SeoArticleJobType.GENERATE_IMAGES, seoArticleId: article.seoArticleId });
  };

  /**
   * งานในคิวที่ "เขียนทับข้อมูลบทความในฐาน" จบเมื่อไหร่ หน้าต้องโหลดของใหม่ตาม
   * (gen รูปยกชุด = contentJson เปลี่ยน, แปล EN = ชุด field EN เปลี่ยน)
   * ล้าง ref ให้ effect โหลด snapshot ชุดใหม่จากฐาน แล้ว remount ตัวแก้ไข
   * ไม่งั้นหน้าจะยังโชว์ของเก่าทั้งที่ฐานเปลี่ยนไปแล้ว และการบันทึกครั้งถัดไปจะชน [SEO-SAVE-06]
   * เกาะ "เลข job ที่จบล่าสุด" แทน onSuccess ของ mutation เพราะงานจบหลังปุ่มคืนค่าไปนานแล้ว
   * รอบแรกหลัง mount แค่จำเลขไว้เฉย ๆ — งานที่จบไปตั้งแต่ก่อนเปิดหน้าไม่ใช่เหตุให้ต้อง remount
   */
  const reloadTriggerJobId = useMemo(() => {
    const ids = [SeoArticleJobType.GENERATE_IMAGES, SeoArticleJobType.TRANSLATE_EN]
      .map((jobType) => findLatestDoneSeoArticleJob(jobs, { jobType, seoArticleId })?.seoArticleJobId)
      .filter((id): id is number => id != null);
    return ids.length > 0 ? Math.max(...ids) : null;
  }, [jobs, seoArticleId]);

  const handledReloadJobRef = useRef<number | null>(null);
  const seededReloadJobRef = useRef(false);

  useEffect(() => {
    if (!seededReloadJobRef.current) {
      seededReloadJobRef.current = true;
      handledReloadJobRef.current = reloadTriggerJobId;
      return;
    }
    if (reloadTriggerJobId == null || handledReloadJobRef.current === reloadTriggerJobId) return;

    handledReloadJobRef.current = reloadTriggerJobId;
    loadedArticleIdRef.current = null;
    setEditorVersion((version) => version + 1);
  }, [reloadTriggerJobId]);

  /** ทิ้งที่แก้ — คืนจอเป็นของจริง แล้วล้างร่างในฐานด้วย ไม่งั้นเปิดหน้าใหม่ร่างเดิมจะกลับมาอีก */
  const handleDiscard = () => {
    discardChanges();
    setIssues([]);
    setEditorVersion((version) => version + 1);
    if (!article) return;

    discardDraft(article.seoArticleId, {
      onSuccess: (result) => {
        // updatedAt ขยับจากการล้างร่าง — ไม่รับค่าใหม่ การกดบันทึกครั้งถัดไปจะถูกตีกลับว่าชนกับตัวเอง
        if (result.status === "ok" && result.data) setExpectedUpdatedAt(result.data.updatedAt);
      },
    });
  };

  /** ผู้ใช้ยืนยันว่าจะเอาร่างเก่ากลับมา ทั้งที่รู้ว่าเนื้อจริงใหม่กว่า */
  const handleRestoreStaleDraft = () => {
    restoreStaleDraft();
    setIssues([]);
    // ตัวแก้ไขเป็น uncontrolled ต้อง remount ถึงจะรับเนื้อหาชุดใหม่
    setEditorVersion((version) => version + 1);
  };

  if (isLoading || !draft || !article || !detail) {
    return (
      <div className="-m-2 flex h-[calc(100dvh-50px)] items-center justify-center rounded-sm bg-muted">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statusBadge = STATUS_BADGE[article.status];

  return (
    <div className="-m-2 flex h-[calc(100dvh-50px)] flex-col gap-3 overflow-hidden rounded-sm bg-muted p-2 md:p-4">
      {/* ===== Section: Header + ปุ่มบันทึก ===== */}
      <Card className="flex shrink-0 flex-wrap items-center justify-between gap-3 p-3 md:p-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} title="กลับไปหน้ารายการ">
            <ArrowLeft className="size-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-bold md:text-lg">{draft.title || "(ยังไม่ได้ตั้งชื่อ)"}</h1>
              <Badge className={statusBadge.className} variant="secondary">
                {statusBadge.label}
              </Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              /blog/{draft.slug}
              {draftSavedAt && ` · เก็บร่างไว้ในระบบแล้วเมื่อ ${new Date(draftSavedAt).toLocaleTimeString("th-TH")}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* แยกออกจากปุ่มบันทึกให้ชัด และไม่ใช่ปุ่มทึบสีแดง — ลบเป็นงานที่ไม่ควรกดโดนโดยบังเอิญ */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={isSaving || isDeleting}
            title="ลบบทความนี้"
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          </Button>

          {/* สร้างรูปทั้งบทความ — ปิดไว้ตอนมีร่างค้าง เพราะ action เขียน contentJson ในฐานทับทั้งก้อน */}
          <Button
            variant="secondary"
            onClick={handleGenerateImages}
            disabled={isSaving || isGeneratingImages || hasChanges}
            title={
              hasChanges
                ? "[SEO-EDT-40] บันทึกร่างก่อน — การสร้างรูปใหม่เขียนเนื้อหาในฐานทับ งานที่แก้ค้างไว้จะหาย"
                : "ให้ AI วาดรูปปก + รูปแทรกใหม่ให้ทั้งบทความ"
            }
            className="gap-1.5"
          >
            {isGeneratingImages ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {isGeneratingImages
              ? "กำลังวาดรูปเบื้องหลัง..."
              : isPublished
                ? "สร้างรูปใหม่ + อัปขึ้นเว็บ"
                : "สร้างรูปใหม่ทั้งบทความ"}
          </Button>

          {hasChanges && (
            <Button variant="ghost" onClick={handleDiscard} disabled={isSaving} className="gap-1.5">
              <RotateCcw className="size-4" />
              ทิ้งที่แก้
            </Button>
          )}
          <Button onClick={handleSave} disabled={!hasChanges || isSaving} className="gap-1.5">
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isPublished ? "บันทึกและอัปขึ้นเว็บ" : "บันทึกร่าง"}
          </Button>
        </div>
      </Card>

      {/* ===== Section: ผืนเอกสาร (ซ้าย) + ข้อมูล SEO ที่ผู้อ่านไม่เห็น (ขวา) ===== */}
      {/* ผืนเอกสารตรึงที่ max-w-4xl อยู่แล้ว จอยิ่งกว้างยิ่งเหลือที่ว่างสองข้าง → ยกให้คอลัมน์ SEO กว้างขึ้นตามจอ */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-4 lg:overflow-hidden xl:grid-cols-[minmax(0,1fr)_440px] 2xl:grid-cols-[minmax(0,1fr)_520px]">
        <div className="min-w-0 lg:min-h-0 lg:overflow-y-auto lg:pr-0.5">
          <Dialog open={step === "confirm-delete"} onOpenChange={(open) => !open && void setStep("edit")}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>ลบบทความนี้?</DialogTitle>
                <DialogDescription>
                  {isPublished
                    ? `บทความอยู่บนเว็บแล้ว การลบจะซ่อนจากหน้าเว็บ และ /blog/${article.slug} จะกลายเป็น 404 ควรทำ redirect หากยังมีคนเข้าจาก Google`
                    : "ร่างนี้ยังไม่เคยขึ้นเว็บ ลบแล้วจะหายจากรายการ ระบบยังเก็บบันทึกเพื่อไม่ให้ AI เสนอหัวข้อเดิมซ้ำ"}
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => void setStep("edit")} disabled={isDeleting}>
                  ยกเลิก
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                  ลบเลย
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          {step === "confirm-publish" ? (
            <SeoArticlePublishConfirmStep isSaving={isSaving} onBack={() => setStep("edit")} onConfirm={handleSave} />
          ) : (
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
              {!hasChanges && (
                <p className="rounded-md bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                  ยังไม่มีอะไรเปลี่ยน — ปุ่มบันทึกจะกดได้เมื่อเนื้อหาต่างจากของจริง
                  {isPublished && " (บทความนี้อยู่บนเว็บแล้ว การบันทึกทุกครั้งคือการ deploy เว็บใหม่)"}
                </p>
              )}

              {restoredFromDraft && (
                <div className="flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm">
                  <CloudOff className="mt-0.5 size-4 shrink-0 text-sky-600" />
                  <div>
                    <p className="font-medium">กู้ร่างที่ค้างอยู่ขึ้นมาให้แล้ว</p>
                    <p className="text-xs text-muted-foreground">
                      เป็นงานที่แก้ไว้แต่ยังไม่ได้กดบันทึก — ถ้าไม่ต้องการ กด “ทิ้งที่แก้” เพื่อกลับไปใช้ของจริง
                    </p>
                  </div>
                </div>
              )}

              {staleDraft && (
                <div className="flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-2">
                    <CloudOff className="mt-0.5 size-4 shrink-0 text-amber-600" />
                    <div>
                      <p className="font-medium">กำลังแสดงฉบับจริงจากระบบ (ใหม่กว่าร่างที่ค้างไว้)</p>
                      <p className="text-xs text-muted-foreground">
                        เนื้อบทความถูกแก้หลังจากที่คุณแก้ค้างไว้ เช่นงาน “สร้างรูปใหม่ทั้งบทความ” เพิ่งทำเสร็จ —
                        ระบบจึงไม่กู้ร่างเก่าทับ เพื่อไม่ให้รูปที่เพิ่งสร้างหายตอนกดบันทึก
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={handleRestoreStaleDraft}
                  >
                    ใช้ร่างที่ค้างไว้แทน
                  </Button>
                </div>
              )}

              {detail.isLegacy && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
                  <p className="font-medium">
                    บทความนี้ถูกแปลงจากโครงเก่าเป็นบล็อกให้แล้ว — ฐานข้อมูลจะเปลี่ยนตามเมื่อกดบันทึกครั้งแรก
                  </p>
                  {detail.contentWarnings.length > 0 && (
                    <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
                      {detail.contentWarnings.slice(0, 5).map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {issues.length > 0 && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <p className="flex items-center gap-1.5 font-medium text-destructive">
                    <AlertCircle className="size-4" />
                    ต้องแก้ {issues.length} จุดก่อนบันทึก
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-xs">
                    {issues.map((issue) => (
                      <li key={issue.code}>
                        [{issue.code}] {issue.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ผืนกระดาษบทความ — เรียงตามลำดับที่ผู้อ่านเห็นจริงบนเว็บ ไม่แยกเป็นการ์ดย่อย */}
              {/* ห้ามใส่ overflow-hidden ที่การ์ดนี้ — จะตัดเมนู “/” และแถบจัดรูปแบบของโปรแกรมแก้ไขที่ลอยออกนอกขอบ */}
              <Card className="p-0 pb-10">
                <SeoArticleCoverBanner />

                <div className="pt-4">
                  <SeoArticleBlockEditorClient
                    key={`${seoArticleId}-${editorVersion}`}
                    initialBlocks={draft.content.blocks}
                    onChangeAction={setBlocks}
                  />
                </div>

                <div className="px-6 sm:px-[54px]">
                  <SeoArticleFaqEditor />
                </div>
              </Card>

              <p className="pb-2 text-center text-xs text-muted-foreground">
                พิมพ์ “## ” ขึ้นหัวข้อ · “- ” ขึ้นรายการ · “/” เปิดเมนูรวม — ดูทั้งหมดที่แผง “วิธีพิมพ์” ด้านขวา
              </p>
            </div>
          )}
        </div>

        {/* คอลัมน์ขวา: ข้อมูลที่ผู้อ่านไม่เห็นบนหน้าเว็บ — จอเล็กกว่า lg จะไหลลงไปต่อท้ายเอกสาร ไม่บังเนื้อหา */}
        {step !== "confirm-publish" && (
          <div className="flex min-w-0 flex-col gap-3 lg:min-h-0 lg:overflow-y-auto lg:pr-0.5">
            <Card className="p-3 md:p-4">
              <p className="mb-3 text-sm font-medium">ข้อมูล SEO (ผู้อ่านไม่เห็นในบทความ)</p>
              <SeoArticleMetaForm isPublished={Boolean(isPublished)} />
            </Card>

            {/* หน้าอังกฤษเป็นของเสริมรายบทความ — วางต่อจาก SEO ไทย และพับเก็บเองเมื่อยังไม่มีข้อมูล */}
            <Card className="p-3 md:p-4">
              {/* key เดียวกับตัวแก้ไขบล็อก — ตอน "ทิ้งที่แก้"/กู้ร่างเก่า draft ถูกสลับทั้งก้อน
                  ช่องคำค้นที่เก็บข้อความดิบไว้ใน state ของตัวเองต้อง remount ตาม ไม่งั้นจะค้างค่าเก่า */}
              <SeoArticleEnMetaForm
                key={`en-${editorVersion}`}
                seoArticleId={article.seoArticleId}
                storedSourceHash={enSyncState.sourceHash}
                hasEnContent={enSyncState.hasEnContent}
                hasUnsavedThai={hasChanges}
              />
            </Card>

            <Card className="p-3 md:p-4">
              <p className="mb-3 text-sm font-medium">ผลบน Google (28 วันล่าสุด)</p>
              <SeoArticleMetricsPanel seoArticleId={seoArticleId} enabled={Boolean(isPublished)} />
            </Card>

            {/* วิธีพิมพ์อยู่ล่างสุด — เป็นแผงอ้างอิงที่เปิดดูเป็นครั้งคราว ไม่ควรกินที่บนสุดเหนือของที่ต้องแก้ทุกวัน */}
            <Card className="p-3 md:p-4">
              <p className="mb-3 text-sm font-medium">วิธีพิมพ์</p>
              <SeoArticleShortcutHelp />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
