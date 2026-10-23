"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { DEFAULT_SEO_ARTICLE_TONE, type SeoArticleTone } from "../constant/seo-article-tone";
import {
  SEO_DEMAND_TIER_DEFAULT_QUOTA,
  SEO_DEMAND_TIER_MAX_PER_TIER,
  type SeoDemandTier,
} from "../constant/seo-demand-tier";
import type { SeoCategoryTopicSuggestion } from "../type/category-topic-suggestion.type";

interface SeoArticleCategoryGenerateState {
  /** หมวดที่เลือกอยู่ (null = ยังไม่เลือก) */
  selectedCategoryCode: string | null;
  selectedCategoryName: string | null;
  /** กลุ่มบริการย่อยที่ต้องการโฟกัส; array ว่าง = ใช้ทั้งหมวดหลัก */
  selectedSubcategoryNames: string[];
  /** หัวข้อที่ AI เสนอในรอบนี้ */
  suggestions: SeoCategoryTopicSuggestion[];
  /** หัวข้อที่ติ๊กเลือกไว้ — เก็บเป็น targetKeyword เพราะ helper การันตีแล้วว่าไม่ซ้ำกันในชุดเดียว */
  selectedKeywords: string[];
  manualTopic: string;
  manualKeyword: string;
  tone: SeoArticleTone;
  generateImages: boolean;
  /**
   * จำนวนหัวข้อที่ขอต่อระดับความต้องการ (ถามเยอะ/กลาง/น้อย/ยังไม่มีใครถาม)
   *
   * มีอยู่เพื่อบังคับให้ AI ออกจากวงของขายดี — ตั้ง UNTAPPED เป็น 0 เมื่อไหร่
   * ก็กลับไปได้หัวข้อโซฟา/ที่นอนวนซ้ำเหมือนเดิม
   */
  quota: Record<SeoDemandTier, number>;
}

interface SeoArticleCategoryGenerateActions {
  selectCategory: (categoryCode: string, categoryName: string) => void;
  toggleSubcategory: (subcategoryName: string) => void;
  clearSubcategories: () => void;
  /** รับผลจาก AI; navigation อยู่ใน nuqs */
  showSuggestions: (suggestions: SeoCategoryTopicSuggestion[]) => void;
  toggleTopic: (targetKeyword: string) => void;
  setManualTopic: (topic: string) => void;
  setManualKeyword: (keyword: string) => void;
  setTone: (tone: SeoArticleTone) => void;
  setGenerateImages: (generateImages: boolean) => void;
  setQuota: (tier: SeoDemandTier, count: number) => void;
  reset: () => void;
}

const initialState: SeoArticleCategoryGenerateState = {
  selectedCategoryCode: null,
  selectedCategoryName: null,
  selectedSubcategoryNames: [],
  suggestions: [],
  selectedKeywords: [],
  manualTopic: "",
  manualKeyword: "",
  tone: DEFAULT_SEO_ARTICLE_TONE,
  generateImages: false,
  quota: { ...SEO_DEMAND_TIER_DEFAULT_QUOTA },
};

/**
 * @description State ของไดอะล็อก "สร้างบทความจากหมวดหมู่บริการ" — 2 ขั้น: เลือกหมวด → ติ๊กหัวข้อที่ AI เสนอ
 * @page /super-admin/hurry-web/seo-article
 * @logic
 * - หัวข้อที่ AI เสนอเก็บใน store ไม่ใช่ TanStack cache เพราะเป็นผลลัพธ์ครั้งเดียวของ mutation
 *   ที่ผูกกับ session การกดปุ่มรอบนั้น ไม่ควร cache ข้ามการเปิดไดอะล็อก
 * - เปลี่ยนหมวดแล้วต้องล้างหัวข้อที่ติ๊กไว้ ไม่งั้นจะสั่งเขียนหัวข้อของหมวดเก่าปนเข้ามา
 * - เปิดรอบใหม่/เข้าคิวสำเร็จ = reset; ปิดหรือ Back เก็บฟอร์มไว้ให้ Forward กลับมาได้
 * @related
 * - ไดอะล็อก: {@link ../components/seo-article-category-generate-dialog.tsx}
 */
export const useSeoArticleCategoryGenerateStore = create<
  SeoArticleCategoryGenerateState & SeoArticleCategoryGenerateActions
>()(
  immer((set) => ({
    ...initialState,

    selectCategory: (categoryCode, categoryName) =>
      set((state) => {
        state.selectedCategoryCode = categoryCode;
        state.selectedCategoryName = categoryName;
        state.selectedSubcategoryNames = [];
        // เปลี่ยนหมวด = ข้อเสนอเดิมใช้ไม่ได้แล้ว
        state.suggestions = [];
        state.selectedKeywords = [];
      }),

    toggleSubcategory: (subcategoryName) =>
      set((state) => {
        const index = state.selectedSubcategoryNames.indexOf(subcategoryName);
        if (index === -1) {
          state.selectedSubcategoryNames.push(subcategoryName);
        } else {
          state.selectedSubcategoryNames.splice(index, 1);
        }
        // เปลี่ยนขอบเขตย่อย = ข้อเสนอเดิมใช้ไม่ได้แล้ว
        state.suggestions = [];
        state.selectedKeywords = [];
      }),

    clearSubcategories: () =>
      set((state) => {
        state.selectedSubcategoryNames = [];
        state.suggestions = [];
        state.selectedKeywords = [];
      }),

    showSuggestions: (suggestions) =>
      set((state) => {
        state.suggestions = suggestions;
        state.selectedKeywords = [];
      }),

    toggleTopic: (targetKeyword) =>
      set((state) => {
        const index = state.selectedKeywords.indexOf(targetKeyword);
        if (index === -1) {
          state.selectedKeywords.push(targetKeyword);
        } else {
          state.selectedKeywords.splice(index, 1);
        }
      }),

    setManualTopic: (topic) =>
      set((state) => {
        state.manualTopic = topic;
      }),
    setManualKeyword: (keyword) =>
      set((state) => {
        state.manualKeyword = keyword;
      }),

    setTone: (tone) =>
      set((state) => {
        state.tone = tone;
      }),

    setGenerateImages: (generateImages) =>
      set((state) => {
        state.generateImages = generateImages;
      }),

    // clamp ที่นี่ด้วย ไม่ใช่ฝากไว้ที่ server อย่างเดียว — ปุ่มบวก/ลบบนหน้าจอต้องหยุดที่เพดานให้เห็น
    // ไม่ใช่ปล่อยให้กดต่อได้แล้วค่อยเด้ง error ตอนกดสั่ง
    setQuota: (tier, count) =>
      set((state) => {
        state.quota[tier] = Math.min(Math.max(count, 0), SEO_DEMAND_TIER_MAX_PER_TIER);
      }),

    reset: () => set(initialState),
  }))
);
