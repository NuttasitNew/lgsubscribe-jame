"use client";
import { useQuery } from "@tanstack/react-query";
import { getBrandProfile } from "../server/get-brand-profile.action";
import { brandProfileKeys } from "./query-key";
/** @description โหลดชุดอ้างอิงร่วมของบริษัท @page /super-admin/hurry-web/brand-profile */
export const useBrandProfile = () =>
  useQuery({
    queryKey: brandProfileKeys.detail(),
    queryFn: async () => {
      const result = await getBrandProfile();
      if (result.status !== "ok") throw new Error(result.message);
      return result.data;
    },
    staleTime: 30_000,
  });
