"use client";
import Image from "next/image";
import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uploadHurryWebImage } from "../../shared/upload-hurry-web-image";
import type { BrandReference } from "../type/brand-profile.type";

/** @description ฟอร์มเพิ่ม/เปลี่ยนภาพอ้างอิงเต็มพื้นที่ @page /super-admin/hurry-web/brand-profile @parent BrandProfileDialog @access super-admin */
export const BrandReferenceForm = ({
  value,
  onChange,
  onBusyChange,
  disabled,
}: {
  value: BrandReference;
  onChange: (value: BrandReference) => void;
  onBusyChange: (busy: boolean) => void;
  disabled: boolean;
}) => {
  const id = useId();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const upload = async (file: File) => {
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 10 * 1024 * 1024 ||
      file.size === 0
    ) {
      setError("เลือก PNG, JPEG หรือ WebP ขนาดไม่เกิน 10 MB");
      return;
    }
    setUploading(true);
    onBusyChange(true);
    setError("");
    try {
      const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
      const data = new FormData();
      data.append("file", file);
      data.append("pathname", `brand-reference/${crypto.randomUUID()}.${extension}`);
      const result = await uploadHurryWebImage(data);
      if (result.status !== "ok") throw new Error(result.message);
      onChange({ ...value, url: result.data.url });
    } catch (error) {
      setError(error instanceof Error ? error.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
      onBusyChange(false);
    }
  };
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-3">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border bg-muted/30">
          {value.url ? (
            <Image
              unoptimized
              width={800}
              height={800}
              src={value.url}
              alt={value.label || "ภาพอ้างอิงที่เลือก"}
              className="h-full w-full object-contain"
            />
          ) : (
            <p className="px-6 text-center text-sm text-muted-foreground">
              เลือกรูปที่เห็นสี รูปทรง และรายละเอียดชัดเจน
            </p>
          )}
        </div>
        <Label htmlFor={`${id}-file`}>{value.url ? "เปลี่ยนรูปอ้างอิง" : "อัปโหลดรูปอ้างอิง"}</Label>
        <Input
          id={`${id}-file`}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={disabled || uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
        <p className="text-xs text-muted-foreground">
          ใช้ภาพเต็มโดยไม่ตัด เพื่อให้ AI เห็นรายละเอียด · PNG / JPEG / WebP ไม่เกิน 10 MB
        </p>
        {uploading && (
          <p role="status" className="text-sm">
            กำลังอัปโหลดรูป…
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor={`${id}-name`}>ชื่อรูปอ้างอิง</Label>
          <Input
            id={`${id}-name`}
            value={value.label}
            maxLength={100}
            disabled={disabled || uploading}
            onChange={(e) => onChange({ ...value, label: e.target.value })}
            placeholder="เช่น เครื่องสกัดรุ่นใหม่"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-kind`}>ใช้เป็นแบบของ</Label>
          <select
            id={`${id}-kind`}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={value.kind}
            disabled={disabled || uploading}
            onChange={(e) => onChange({ ...value, kind: e.target.value as BrandReference["kind"] })}
          >
            <option value="uniform">ทีมงาน / ยูนิฟอร์ม</option>
            <option value="equipment">เครื่องมือ / อุปกรณ์</option>
            <option value="style">โทนภาพ / สถานที่</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-description`}>สิ่งที่ AI ต้องยึดจากรูปนี้</Label>
          <Textarea
            id={`${id}-description`}
            rows={7}
            value={value.description}
            maxLength={1200}
            disabled={disabled || uploading}
            onChange={(e) => onChange({ ...value, description: e.target.value })}
            placeholder="ระบุสี รูปทรง ชุดแต่งกาย หรือรายละเอียดที่ต้องเหมือนภาพนี้"
          />
        </div>
        <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
          <input
            type="checkbox"
            checked={value.enabled}
            disabled={disabled || uploading}
            onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
          />
          ใช้รูปนี้ในการสร้างภาพ
        </label>
      </div>
    </div>
  );
};
