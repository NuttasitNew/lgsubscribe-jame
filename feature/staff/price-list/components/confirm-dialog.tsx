"use client";

import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";

/** In-page confirmation (replaces window.confirm); sits above the product picker dialog. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  children,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-3 top-1/2 z-[70] mx-auto max-w-md -translate-y-1/2 rounded-2xl bg-white p-5 shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 sm:p-6"
        >
          <DialogPrimitive.Title className="text-lg font-bold">{title}</DialogPrimitive.Title>
          {children && <div className="mt-2 text-sm text-muted-foreground">{children}</div>}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <DialogPrimitive.Close asChild>
              <Button variant="outline" className="h-12">
                ยกเลิก
              </Button>
            </DialogPrimitive.Close>
            <Button
              variant="destructive"
              className="h-12"
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
