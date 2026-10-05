"use client";

import type { ChangeEvent, ComponentProps } from "react";
import type { DropdownProps } from "react-day-picker";
import { th } from "react-day-picker/locale";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calendarTimeZone, thaiCalendarMonth } from "@/lib/thai-calendar";
import { cn } from "@/lib/utils";
import { TZDate } from "react-day-picker";

function CalendarDropdown({ options, value, onChange, "aria-label": ariaLabel, disabled }: DropdownProps) {
  return (
    <Select
      value={String(value)}
      disabled={disabled}
      onValueChange={(selected) => {
        onChange?.({
          target: { value: selected },
          currentTarget: { value: selected },
        } as ChangeEvent<HTMLSelectElement>);
      }}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className="h-8 w-auto gap-1 border-0 bg-transparent px-1 text-xs shadow-none"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-64">
        {options?.map((option) => (
          <SelectItem key={option.value} value={String(option.value)} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ThaiCalendar(props: ComponentProps<typeof Calendar>) {
  const { labels, formatters, components, classNames, className, ...rest } = props;
  return (
    <Calendar
      locale={th}
      timeZone={calendarTimeZone}
      lang="th"
      className={cn("[--cell-size:2.25rem]", className)}
      captionLayout="dropdown"
      labels={{
        labelNav: () => "เปลี่ยนเดือน",
        labelPrevious: () => "เดือนก่อนหน้า",
        labelNext: () => "เดือนถัดไป",
        labelMonthDropdown: () => "เลือกเดือนในปฏิทิน",
        labelYearDropdown: () => "เลือกปีในปฏิทิน",
        labelGrid: (date) => thaiCalendarMonth(date),
        labelGridcell: (date) =>
          new Intl.DateTimeFormat("th-TH", { dateStyle: "full", timeZone: calendarTimeZone }).format(date),
        labelWeekday: (date) =>
          new Intl.DateTimeFormat("th-TH", { weekday: "long", timeZone: calendarTimeZone }).format(date),
        labelWeekNumber: (week) => `สัปดาห์ที่ ${week}`,
        labelWeekNumberHeader: () => "สัปดาห์",
        labelDayButton: (date, modifiers) =>
          `${new Intl.DateTimeFormat("th-TH", { dateStyle: "full", timeZone: calendarTimeZone }).format(date)}${modifiers.today ? " วันนี้" : ""}${modifiers.selected ? " เลือกแล้ว" : ""}`,
        ...labels,
      }}
      formatters={{
        formatCaption: (date) => thaiCalendarMonth(date),
        formatMonthDropdown: (date) =>
          new Intl.DateTimeFormat("th-TH", { month: "short", timeZone: calendarTimeZone }).format(date),
        formatYearDropdown: (date) =>
          new Intl.DateTimeFormat("th-TH", { year: "numeric", timeZone: calendarTimeZone }).format(date),
        formatWeekdayName: (date) =>
          ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."][new TZDate(date, calendarTimeZone).getDay()],
        ...formatters,
      }}
      components={{ Dropdown: CalendarDropdown, ...components }}
      classNames={{ dropdown_root: "relative", ...classNames }}
      {...rest}
    />
  );
}
