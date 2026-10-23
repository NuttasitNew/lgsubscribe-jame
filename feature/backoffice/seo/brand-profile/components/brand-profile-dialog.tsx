"use client";
import Image from "next/image";
import { useState } from "react";
import { ArrowLeft, Pencil, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { BrandReferenceForm } from "./brand-reference-form";
import { useSaveBrandProfile } from "../tanstack/save-brand-profile.mutation";
import { brandProfileInputSchema } from "../helper/brand-profile-schema";
import type { BrandProfile, BrandReference } from "../type/brand-profile.type";

/** @description Dialog เดียวสลับ view → edit/create → review → view @page /super-admin/hurry-web/brand-profile @parent BrandProfilePage @access super-admin */
export const BrandProfileDialog = ({
  profile,
  referenceId,
  kind,
  onClose,
}: {
  profile: BrandProfile;
  referenceId?: string;
  kind: "prompt" | "reference";
  onClose: () => void;
}) => {
  const [snapshot, setSnapshot] = useState(profile);
  const initial = profile.references.find((item) => item.id === referenceId);
  const [reference, setReference] = useState<BrandReference>(
    () => initial ?? { id: crypto.randomUUID(), label: "", description: "", kind: "uniform", url: "", enabled: true }
  );
  const [prompt, setPrompt] = useState(profile.systemPrompt);
  const [phase, setPhase] = useState<"view" | "edit" | "create" | "review">(
    kind === "reference" && !initial ? "create" : "view"
  );
  const [formPhase, setFormPhase] = useState<"edit" | "create">(initial || kind === "prompt" ? "edit" : "create");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const { mutateAsync: save, isPending } = useSaveBrandProfile();
  const busy = uploading || isPending;
  const currentReference = snapshot.references.find((item) => item.id === reference.id);
  const editing = phase === "edit" || phase === "create";
  const next: BrandProfile = {
    ...snapshot,
    systemPrompt: kind === "prompt" ? prompt : snapshot.systemPrompt,
    references:
      kind === "prompt"
        ? snapshot.references
        : currentReference
          ? snapshot.references.map((item) => (item.id === reference.id ? reference : item))
          : [...snapshot.references, reference],
  };
  const review = () => {
    const parsed = brandProfileInputSchema.safeParse(next);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError("");
    setFormPhase(phase === "create" ? "create" : "edit");
    setPhase("review");
  };
  const confirm = async () => {
    setError("");
    try {
      const result = await save(next);
      setSnapshot(result);
      setPhase("view");
    } catch (error) {
      setError(error instanceof Error ? error.message : "บันทึกไม่สำเร็จ");
    }
  };
  const title =
    kind === "prompt" ? "แนวทางภาพของบริษัท" : phase === "create" ? "เพิ่มรูปอ้างอิง" : reference.label || "รูปอ้างอิง";
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        className="max-h-[92dvh] max-w-4xl overflow-y-auto p-0"
        onInteractOutside={(e) => {
          if (editing || phase === "review" || busy) e.preventDefault();
        }}
      >
        <DialogHeader className="border-b px-6 pb-5 pt-6">
          <p className="mb-1 text-xs font-medium text-amber-700">
            {phase === "view"
              ? "รายละเอียด"
              : phase === "review"
                ? "ตรวจสอบก่อนบันทึก"
                : phase === "create"
                  ? "เพิ่มใหม่"
                  : "แก้ไข"}
          </p>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription>
            {phase === "review"
              ? "บันทึกแล้ว AI จะใช้ชุดนี้ในการสร้างภาพครั้งถัดไป ภาพที่สร้างไว้แล้วไม่เปลี่ยน"
              : "จัดการข้อมูลในหน้าต่างนี้ แล้วตรวจผลก่อนบันทึก"}
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 py-5">
          {phase === "view" &&
            (kind === "prompt" ? (
              <p className="whitespace-pre-wrap text-sm leading-7">{snapshot.systemPrompt}</p>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <Image
                  unoptimized
                  width={800}
                  height={800}
                  src={reference.url}
                  alt={reference.label}
                  className="aspect-square w-full rounded-xl border bg-muted/30 object-contain"
                />
                <div className="space-y-4">
                  <span className="rounded-full bg-muted px-3 py-1 text-xs">
                    {reference.enabled ? "เปิดใช้งาน" : "พักการใช้งาน"}
                  </span>
                  <h3 className="text-lg font-semibold">สิ่งที่ AI ต้องยึดจากรูป</h3>
                  <p className="whitespace-pre-wrap text-sm leading-7">{reference.description}</p>
                </div>
              </div>
            ))}
          {editing &&
            (kind === "prompt" ? (
              <div className="space-y-3">
                <label htmlFor="company-system-prompt" className="text-sm font-medium">
                  แนวทางร่วมสำหรับภาพของบริษัท (System prompt)
                </label>
                <Textarea
                  id="company-system-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={14}
                  maxLength={6000}
                  disabled={busy}
                />
                <p className="text-xs text-muted-foreground">
                  ระบุโทนภาพ บรรยากาศ และข้อควรระวัง ส่วนรายละเอียดเฉพาะชุดหรือเครื่องให้เขียนคู่กับรูปนั้น
                </p>
              </div>
            ) : (
              <BrandReferenceForm
                value={reference}
                onChange={setReference}
                onBusyChange={setUploading}
                disabled={isPending}
              />
            ))}
          {phase === "review" && (
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                {[false, true].map((after) => (
                  <section key={String(after)} className="rounded-xl border p-4">
                    <h3 className="mb-3 text-sm font-semibold">{after ? "หลังบันทึก" : "ก่อนแก้ไข"}</h3>
                    {kind === "prompt" ? (
                      <p className="max-h-72 overflow-auto whitespace-pre-wrap text-sm leading-6">
                        {after ? prompt : snapshot.systemPrompt}
                      </p>
                    ) : (
                      (() => {
                        const item = after ? reference : currentReference;
                        return item ? (
                          <>
                            <Image
                              unoptimized
                              width={800}
                              height={800}
                              src={item.url}
                              alt={item.label}
                              className="mb-3 aspect-video w-full object-contain"
                            />
                            <p className="font-medium">{item.label}</p>
                            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{item.description}</p>
                            <p className="mt-3 text-xs">
                              {item.enabled ? "เปิดใช้งาน" : "พักการใช้งาน"} ·{" "}
                              {item.kind === "uniform" ? "ยูนิฟอร์ม" : item.kind === "equipment" ? "อุปกรณ์" : "โทนภาพ"}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">ยังไม่มีรูปนี้</p>
                        );
                      })()
                    )}
                  </section>
                ))}
              </div>
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                ชุดนี้ใช้ร่วมกับการสร้างภาพหน้าเว็บและภาพถ่ายในบทความ SEO
              </p>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <DialogFooter className="sticky bottom-0 border-t bg-background px-6 py-4">
          {phase === "view" ? (
            <>
              <Button variant="outline" onClick={onClose}>
                ปิด
              </Button>
              <Button
                onClick={() => {
                  setPhase("edit");
                  setError("");
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                แก้ไข
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setError("");
                  if (phase === "review") setPhase(formPhase);
                  else if (phase === "create") onClose();
                  else {
                    setReference(currentReference ?? reference);
                    setPrompt(snapshot.systemPrompt);
                    setPhase("view");
                  }
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {phase === "review" ? "กลับไปแก้ไข" : "ยกเลิกการแก้ไข"}
              </Button>
              <Button disabled={busy} onClick={() => (phase === "review" ? void confirm() : review())}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                {phase === "review" ? "ยืนยันบันทึก" : "ตรวจสอบก่อนบันทึก"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
