"use client";

import { useId, useState, type ReactNode } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThaiCalendar } from "@/components/ui/thai-calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  calendarDate,
  calendarDay,
  calendarTimeZone,
  thaiCalendarDate,
  thaiCalendarMonth,
} from "@/lib/thai-calendar";

type PickerProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  today: string;
};

export function ThaiDatePicker({ label, name, value, onChange, today, min }: PickerProps & { min?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const selected = calendarDate(value);
  return (
    <div className="grid min-w-0 gap-1">
      <label htmlFor={id} className="text-xs font-medium">
        {label}
      </label>
      <input type="hidden" name={name} value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            size="sm"
            className="min-w-0 justify-start px-2 font-normal"
          >
            <CalendarDays className="size-4 shrink-0" />
            <span>{thaiCalendarDate(selected)}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          collisionPadding={12}
          className="w-auto max-w-[calc(100vw-24px)] p-0"
          aria-label={`ปฏิทิน${label}`}
        >
          <ThaiCalendar
            mode="single"
            required
            selected={selected}
            defaultMonth={selected}
            startMonth={calendarDate("2000-01-01")}
            endMonth={calendarDate(
              `${Math.max(Number(today.slice(0, 4)) + 5, selected.getFullYear())}-12-01`,
            )}
            disabled={min ? { before: calendarDate(min) } : undefined}
            onSelect={(date) => {
              if (date) {
                onChange(calendarDay(date));
                setOpen(false);
              }
            }}
            autoFocus
          />
          <div className="flex justify-between border-t px-3 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={Boolean(min && today < min)}
              onClick={() => {
                onChange(today);
                setOpen(false);
              }}
            >
              วันนี้
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              ปิด
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function ThaiMonthPicker({
  label,
  name,
  value,
  onChange,
  today,
  quickActions,
}: PickerProps & { quickActions?: ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(Number(value.slice(0, 4)));
  const maxYear = Math.max(Number(today.slice(0, 4)) + 5, year);
  return (
    <div className="grid min-w-0 gap-1">
      <label htmlFor={id} className="text-xs font-medium">
        {label}
      </label>
      <input type="hidden" name={name} value={value} />
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (next) setYear(Number(value.slice(0, 4)));
          setOpen(next);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            size="sm"
            className="min-w-0 justify-start px-2 font-normal"
          >
            <CalendarDays className="size-4 shrink-0" />
            {thaiCalendarMonth(calendarDate(value))}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          collisionPadding={12}
          className="w-72 max-w-[calc(100vw-24px)] p-3"
          aria-label="ปฏิทินเลือกเดือน"
        >
          {quickActions && (
            <div
              className="mb-3 border-b pb-3"
              onClick={(event) => {
                if (event.target instanceof Element && event.target.closest("a")) setOpen(false);
              }}
            >
              {quickActions}
            </div>
          )}
          <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
            <SelectTrigger aria-label="เลือกปีสำหรับเดือน">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {Array.from({ length: maxYear - 1999 }, (_, i) => 2000 + i)
                .reverse()
                .map((item) => (
                  <SelectItem key={item} value={String(item)}>
                    พ.ศ. {item + 543}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }, (_, index) => {
              const month = `${year}-${String(index + 1).padStart(2, "0")}`;
              return (
                <Button
                  key={month}
                  type="button"
                  size="sm"
                  variant={month === value ? "default" : "ghost"}
                  className="px-1 text-xs"
                  aria-pressed={month === value}
                  onClick={() => {
                    onChange(month);
                    setOpen(false);
                  }}
                >
                  {new Intl.DateTimeFormat("th-TH", { month: "long", timeZone: calendarTimeZone }).format(
                    calendarDate(month),
                  )}
                </Button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
