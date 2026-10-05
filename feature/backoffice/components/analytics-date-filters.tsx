"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { ThaiDatePicker, ThaiMonthPicker } from "@/components/ui/thai-date-picker";
import { dateRange } from "@/lib/analytics/date-range";

export function AnalyticsDateFilters({
  start,
  end,
  today,
  action = "/backoffice/analytics/",
}: {
  start: string;
  end: string;
  today: string;
  action?: string;
}) {
  const [from, setFrom] = useState(start);
  const [until, setUntil] = useState(end);
  const [month, setMonth] = useState(start.slice(0, 7));
  const [error, setError] = useState("");
  const [year, number] = today.slice(0, 7).split("-").map(Number);
  const months = Array.from({ length: 6 }, (_, offset) =>
    new Date(Date.UTC(year, number - 1 - offset, 1)).toISOString().slice(0, 7),
  );
  function validate(event: FormEvent<HTMLFormElement>) {
    try {
      dateRange(from, until);
      setError("");
    } catch (reason) {
      event.preventDefault();
      setError(reason instanceof Error ? reason.message : "กรุณาเลือกช่วงวันที่ให้ถูกต้อง");
    }
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <form className="flex min-w-0 items-end gap-2" action={action}>
          <ThaiMonthPicker
            label="เลือกเดือน"
            name="month"
            value={month}
            onChange={setMonth}
            today={today}
            quickActions={
              <nav aria-label="เดือนล่าสุด" className="grid grid-cols-2 gap-2">
                {months.map((item, index) => (
                  <Button key={item} asChild size="sm" variant="outline">
                    <Link href={`${action}?month=${item}`}>
                      {index === 0
                        ? "เดือนนี้"
                        : index === 1
                          ? "เดือนก่อน"
                          : new Intl.DateTimeFormat("th-TH", {
                              month: "short",
                              year: "numeric",
                              timeZone: "UTC",
                            }).format(new Date(`${item}-01T00:00:00Z`))}
                    </Link>
                  </Button>
                ))}
              </nav>
            }
          />
          <Button type="submit" size="sm" variant="outline">
            ดูรายเดือน
          </Button>
        </form>
        <form
          className="grid min-w-0 grid-cols-2 items-end gap-2 md:flex"
          action={action}
          onSubmit={validate}
          aria-label="เลือกช่วงวันที่"
          title="เลือกได้ไม่เกิน 366 วัน · รวมวันสิ้นสุด"
        >
          <ThaiDatePicker
            label="วันเริ่มต้น"
            name="start"
            value={from}
            today={today}
            onChange={(value) => {
              setFrom(value);
              if (value > until) setUntil(value);
              setError("");
            }}
          />
          <ThaiDatePicker
            label="วันสิ้นสุด"
            name="end"
            value={until}
            today={today}
            min={from}
            onChange={(value) => {
              setUntil(value);
              setError("");
            }}
          />
          <Button type="submit" size="sm" className="col-span-2 md:shrink-0">
            ดูข้อมูล
          </Button>
        </form>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
