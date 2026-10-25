"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import type { SeoKeywordArticleType, SeoKeywordStatus } from "@prisma/client";
import { seoKeywordKeys } from "./query-key";
import { seoArticleKeys } from "../../seo-article/tanstack/query-key";
import { findSeoKeywords } from "../server/find-seo-keywords.action";
import {
  createSeoKeyword,
  queueKeywordResearch,
  queueWriteFromKeyword,
  syncKeywordRanksNow,
  updateSeoKeyword,
} from "../server/manage-seo-keyword.action";
import type { ResponsePatternType } from "@/lib/seo/helper/response-pattern";

/** ตารางคำค้น + อันดับ — GSC sync วันละครั้ง ไม่ต้อง refetch ถี่ */
export const useFindSeoKeywords = () =>
  useQuery({
    queryKey: seoKeywordKeys.list(),
    queryFn: async () => {
      const result = await findSeoKeywords();
      if (result.status !== "ok") throw new Error(result.message);
      return result.data ?? [];
    },
    staleTime: 60 * 1000,
  });

const toast = (result: ResponsePatternType<unknown>) =>
  Swal.fire({
    title: result.status === "ok" ? "สำเร็จ" : "เกิดข้อผิดพลาด",
    text: result.message,
    icon: result.status === "ok" ? "success" : "error",
    timer: result.status === "ok" ? 2500 : 4000,
    timerProgressBar: true,
    showConfirmButton: false,
  });

const toastError = (error: unknown) =>
  Swal.fire({
    title: "เกิดข้อผิดพลาด",
    text: error instanceof Error ? error.message : "ไม่สามารถดำเนินการได้",
    icon: "error",
    timer: 3500,
    showConfirmButton: false,
  });

/** สร้าง mutation ที่แจ้งผล + รีเฟรชตารางคำค้นและแถบคิว */
const useKeywordMutation = <TParams,>(fn: (params: TParams) => Promise<ResponsePatternType<unknown>>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (result) => {
      void toast(result);
      await queryClient.invalidateQueries({ queryKey: seoKeywordKeys.all() });
      await queryClient.invalidateQueries({ queryKey: seoArticleKeys.jobs() });
    },
    onError: toastError,
  });
};

export const useQueueKeywordResearch = () => useKeywordMutation((p: { focus?: string }) => queueKeywordResearch(p));
export const useQueueWriteFromKeyword = () =>
  useKeywordMutation((p: { seoKeywordId: number; generateImages: boolean }) => queueWriteFromKeyword(p));
export const useUpdateSeoKeyword = () =>
  useKeywordMutation(
    (p: { seoKeywordId: number; status?: SeoKeywordStatus; articleType?: SeoKeywordArticleType }) => updateSeoKeyword(p)
  );
export const useCreateSeoKeyword = () =>
  useKeywordMutation((p: { keyword: string; articleType: SeoKeywordArticleType }) => createSeoKeyword(p));
export const useSyncKeywordRanksNow = () => useKeywordMutation(() => syncKeywordRanksNow());
