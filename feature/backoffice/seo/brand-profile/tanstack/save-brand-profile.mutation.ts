"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { saveBrandProfile } from "../server/save-brand-profile.action";
import type { BrandProfile } from "../type/brand-profile.type";
import { brandProfileKeys } from "./query-key";
/** @description บันทึกชุดอ้างอิงและ refresh cache @page /super-admin/hurry-web/brand-profile @invalidates brandProfileKeys.detail */
export const useSaveBrandProfile = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: BrandProfile) => {
      const result = await saveBrandProfile(input);
      if (result.status !== "ok") throw new Error(result.message);
      return result.data;
    },
    onSuccess: async (data) => {
      client.setQueryData(brandProfileKeys.detail(), data);
      await client.invalidateQueries({ queryKey: brandProfileKeys.detail() });
      void Swal.fire({
        title: "บันทึกชุดอ้างอิงแล้ว",
        icon: "success",
        timer: 1500,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    },
    onError: () => {
      /* dialog แสดง error ใน phase เดิมเพื่อรักษาฟอร์ม */
    },
  });
};
