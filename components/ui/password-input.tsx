"use client";
import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
export function PasswordInput({
  className,
  id,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        id={inputId}
        type={visible ? "text" : "password"}
        className={cn(
          "h-11 w-full rounded-md border bg-white pl-3 pr-12 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          className,
        )}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute right-0 top-0 size-11"
        aria-label={visible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
        aria-pressed={visible}
        aria-controls={inputId}
        disabled={props.disabled}
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </Button>
    </div>
  );
}
