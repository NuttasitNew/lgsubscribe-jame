"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { SeoArticleEditSnapshot } from "@/lib/seo/helper/is-seo-article-edit-equal";
import type { SeoArticleBlock, SeoArticleBlockContent } from "../type/seo-article-block.type";
import type { SeoArticleFaq } from "../type/seo-article-content.type";

interface PendingDraftRecord {
  savedAt: string;
  snapshot: SeoArticleEditSnapshot;
}

interface SeoArticleEditorState {
  /** id บทความที่กำลังแก้ — null = ไม่ได้เปิดหน้าแก้ไข (ใช้ปิดปุ่ม "สร้างรูปใหม่ยกชุด" ที่เขียน contentJson ทับ) */
  seoArticleId: number | null;
  /** ของจริงในฐานข้อมูลตอนเปิดหน้า — ใช้เป็นตัวเทียบว่าเนื้อหาเปลี่ยนจริงไหม */
  baseline: SeoArticleEditSnapshot | null;
  /** ฉบับที่กำลังแก้อยู่ */
  draft: SeoArticleEditSnapshot | null;
  /** เวลาที่ autosave ร่างลงฐานล่าสุด (ISO) — null = ยังไม่มีร่างค้าง */
  draftSavedAt: string | null;
  /** true = ตอนเปิดหน้าเจอร่างค้างในฐานแล้วกู้ขึ้นมาให้ (ต้องบอกผู้ใช้ว่ากำลังดูของที่ยังไม่ได้บันทึก) */
  restoredFromDraft: boolean;
  /**
   * ร่างค้างที่ **เก่ากว่า** เนื้อบทความจริง — ไม่ถูกกู้ขึ้นมาอัตโนมัติ แต่เก็บไว้ให้ผู้ใช้เลือกเอง
   * (เกิดเมื่อมีคนแก้ contentJson จากนอกหน้าแก้ไข เช่นงาน AI gen รูปยกชุดจบระหว่างที่ร่างค้างอยู่)
   */
  staleDraft: PendingDraftRecord | null;
  /**
   * งานวาดรูปที่สั่งค้างไว้ — key = `${seoArticleId}:${จุดวางรูป}` (จุดวางรูป = id บล็อกรูป หรือ "cover")
   * อยู่ในสโตร์ ไม่ใช่ใน state ของช่องสั่งวาด เพราะช่องนั้นถูกปิดได้ระหว่างรอ
   * และ **ไม่ถูกล้างตอนปิดหน้าแก้ไข** — ออกไปหน้าอื่นแล้วกลับเข้ามา รูปต้องยังลงบล็อกเดิมได้
   * (รีเฟรชทั้งหน้าถึงจะหาย — ตอนนั้นรูปยังอยู่ใน "คลังรูป" ให้หยิบเองอยู่ดี)
   */
  pendingImageJobs: Record<string, { seoArticleJobId: number; queuedAt: string }>;
}

interface SeoArticleEditorActions {
  openEditor: (
    seoArticleId: number,
    snapshot: SeoArticleEditSnapshot,
    /** ร่างที่ค้างในฐาน (ถ้ามี) — อ่านมาจาก readSeoArticleDraft แล้ว */
    pendingDraft?: { snapshot: SeoArticleEditSnapshot; savedAt: string; isOutdated: boolean } | null
  ) => void;
  closeEditor: () => void;
  patchDraft: (patch: Partial<Omit<SeoArticleEditSnapshot, "content">>) => void;
  patchContent: (patch: Partial<Omit<SeoArticleBlockContent, "blocks" | "faq">>) => void;
  setBlocks: (blocks: SeoArticleBlock[]) => void;
  setFaq: (faq: SeoArticleFaq[]) => void;
  /** ทิ้งของที่แก้ค้างไว้ กลับไปใช้ของจริงในฐานข้อมูล */
  discardChanges: () => void;
  /** ผู้ใช้เลือกกู้ร่างเก่าที่ระบบกันไว้ (staleDraft) ขึ้นมาแก้ต่อ */
  restoreStaleDraft: () => void;
  /** เรียกหลังบันทึกสำเร็จ — เลื่อน baseline มาเท่าฉบับที่เพิ่งบันทึก แล้วล้างร่างในเครื่อง */
  markSaved: () => void;
  /** บันทึกว่า autosave ร่างลงฐานสำเร็จเมื่อไหร่ (เรียกจาก onSuccess ของ mutation) */
  markDraftSaved: (savedAt: string) => void;
  /** จำว่าจุดนี้สั่งวาดรูปไว้ด้วย job ใบไหน (เรียกตอนกดสั่งวาดสำเร็จ) */
  setPendingImageJob: (slotId: string, seoArticleJobId: number) => void;
  /** คีย์ของจุดวางรูปในบทความที่เปิดอยู่ — ให้ hook อ่านค่าได้ตรงกับที่ setPendingImageJob เขียน */
  buildImageJobKey: (slotId: string) => string;
  /** เลิกรองานวาดรูปของจุดนี้ (วางรูปแล้ว หรืองานพัง) */
  clearPendingImageJob: (slotId: string) => void;
}

const initialState: SeoArticleEditorState = {
  seoArticleId: null,
  baseline: null,
  draft: null,
  draftSavedAt: null,
  restoredFromDraft: false,
  staleDraft: null,
  pendingImageJobs: {},
};

/**
 * @description Store ของหน้าแก้ไขบทความ SEO — เก็บฉบับที่กำลังแก้ + ฉบับจริงในฐานข้อมูลไว้เทียบกัน
 * @page /super-admin/hurry-web/seo-article?edit=<id>
 * @access super-admin
 * @logic
 * - **ห้ามเขียน contentJson จาก autosave เด็ดขาด** — บทความที่เผยแพร่แล้ว การเขียนเนื้อจริง = commit ขึ้น
 *   GitHub = deploy เว็บใหม่ ร่างอัตโนมัติจึงลงช่องของตัวเอง (SeoArticle.draftJson) ส่วนเนื้อจริงเปลี่ยน
 *   ได้จากการกดปุ่มบันทึกเท่านั้น
 * - เดิมร่างเก็บใน localStorage — ล้าง cache/เปลี่ยนเครื่องแล้วงานหาย และร่างในเครื่องชนะของในฐาน
 *   จนเคยกดบันทึกทับรูปที่ AI เพิ่ง gen หายทั้งชุด (SEO:9 2026-07-20) ตอนนี้ย้ายไปเก็บในฐานแล้ว
 * - `baseline` คือของจริงตอนเปิดหน้า ใช้คู่กับ isSeoArticleEditEqual เพื่อ disable ปุ่มบันทึกเมื่อไม่มีอะไรเปลี่ยน
 * - เปิดหน้าแล้วเจอร่างค้าง → กู้ขึ้นมาให้ พร้อมตั้ง restoredFromDraft เพื่อให้ UI เตือน
 * - **แต่ต้องเทียบเวลาก่อนเสมอ**: ร่างที่เก่ากว่า contentUpdatedAt แปลว่ามีคนแก้เนื้อจริงหลังจากนั้น
 *   → ยึดของจริงเป็นตัวตั้ง แล้วพักร่างเก่าไว้ที่ `staleDraft` ให้ผู้ใช้เลือกกู้เอง ไม่ใช่กู้ทับเงียบ ๆ
 * - สโตร์ **ไม่ยิง server เอง** — การเซฟ/ทิ้งร่างในฐานทำผ่าน mutation ในหน้าแก้ไข สโตร์ดูแลแค่ของบนจอ
 * @related
 * - helper เทียบเนื้อหา: {@link @/lib/seo/helper/is-seo-article-edit-equal}
 * - อ่านร่างจากฐาน: {@link ../helper/read-seo-article-draft.helper.ts}
 * - หน้าแก้ไข: {@link ../components/seo-article-editor-page.tsx}
 */
export const useSeoArticleEditorStore = create<SeoArticleEditorState & SeoArticleEditorActions>()(
  immer((set, get) => ({
    ...initialState,

    openEditor: (seoArticleId, snapshot, pendingDraft) =>
      set((state) => {
        // ร่างเก่ากว่าเนื้อจริง = มีคนแก้เนื้อหลังจากร่างถูกเซฟ (เช่นงาน AI gen รูปยกชุดจบระหว่างนั้น)
        // ห้ามกู้ร่างเก่าทับ ไม่งั้นผู้ใช้จะเห็นบทความไม่มีรูป แล้วกดบันทึกทับรูปที่ gen ไปหายทั้งชุด
        const useDraft = Boolean(pendingDraft) && !pendingDraft!.isOutdated;

        state.seoArticleId = seoArticleId;
        state.baseline = snapshot;
        state.draft = useDraft ? { ...snapshot, ...pendingDraft!.snapshot } : snapshot;
        state.draftSavedAt = useDraft ? pendingDraft!.savedAt : null;
        state.restoredFromDraft = useDraft;
        // ร่างเก่ายังไม่ถูกทิ้ง — เก็บไว้ให้ผู้ใช้เลือกกู้เอง (งานที่พิมพ์ค้างไว้ต้องไม่หายเงียบ ๆ)
        state.staleDraft =
          pendingDraft && pendingDraft.isOutdated
            ? { snapshot: pendingDraft.snapshot, savedAt: pendingDraft.savedAt }
            : null;
      }),

    // งานวาดรูปที่ค้างอยู่ต้องรอดข้ามการปิดหน้า — ผู้ใช้สลับไปดูอย่างอื่นระหว่าง AI วาดเป็นเรื่องปกติ
    // กลับเข้ามาแล้วรูปต้องลงบล็อกเดิมให้ ไม่ใช่หายเงียบทั้งที่จ่ายค่า AI ไปแล้ว
    closeEditor: () => set((state) => ({ ...initialState, pendingImageJobs: state.pendingImageJobs })),

    patchDraft: (patch) =>
      set((state) => {
        if (!state.draft) return;
        Object.assign(state.draft, patch);
      }),

    patchContent: (patch) =>
      set((state) => {
        if (!state.draft) return;
        Object.assign(state.draft.content, patch);
      }),

    setBlocks: (blocks) =>
      set((state) => {
        if (!state.draft) return;
        state.draft.content.blocks = blocks;
      }),

    setFaq: (faq) =>
      set((state) => {
        if (!state.draft) return;
        state.draft.content.faq = faq;
      }),

    // ล้างร่างในฐานเป็นหน้าที่ของผู้เรียก (discard-seo-article-draft.action) — สโตร์ดูแลแค่ของบนจอ
    discardChanges: () =>
      set((state) => {
        if (!state.baseline || state.seoArticleId == null) return;
        state.draft = state.baseline;
        state.draftSavedAt = null;
        state.restoredFromDraft = false;
        state.staleDraft = null;
      }),

    restoreStaleDraft: () =>
      set((state) => {
        if (!state.staleDraft || !state.baseline) return;

        state.draft = { ...state.baseline, ...state.staleDraft.snapshot };
        state.draftSavedAt = state.staleDraft.savedAt;
        state.restoredFromDraft = true;
        state.staleDraft = null;
        // baseline ยังเป็นของจริงในฐานเหมือนเดิม — ปุ่มบันทึกจะได้รู้ว่าเนื้อหาต่างจากฐานจริง
      }),

    markSaved: () =>
      set((state) => {
        if (!state.draft || state.seoArticleId == null) return;
        state.baseline = state.draft;
        state.draftSavedAt = null;
        state.restoredFromDraft = false;
        state.staleDraft = null;
      }),

    markDraftSaved: (savedAt) =>
      set((state) => {
        state.draftSavedAt = savedAt;
      }),

    setPendingImageJob: (slotId, seoArticleJobId) =>
      set((state) => {
        state.pendingImageJobs[`${state.seoArticleId}:${slotId}`] = {
          seoArticleJobId,
          queuedAt: new Date().toISOString(),
        };
      }),

    clearPendingImageJob: (slotId) =>
      set((state) => {
        delete state.pendingImageJobs[`${state.seoArticleId}:${slotId}`];
      }),

    buildImageJobKey: (slotId) => `${get().seoArticleId}:${slotId}`,
  }))
);
