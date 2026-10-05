"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { ThaiDatePicker, ThaiMonthPicker } from "@/components/ui/thai-date-picker";
import { dateRange } from "@/lib/analytics/date-range";

export function AnalyticsDateFilters({ start, end, today }: { start: string; end: string; today: string }) {
  const [from, setFrom] = useState(start);
  const [until, setUntil] = useState(end);
  const [month, setMonth] = useState(start.slice(0, 7));
  const [error, setError] = useState("");
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
      <div className="flex flex-wrap items-end gap-4">
        <form className="flex flex-wrap items-end gap-2" action="/backoffice/analytics/">
          <ThaiMonthPicker label="เลือกเดือน" name="month" value={month} onChange={setMonth} today={today} />
          <Button type="submit" size="sm" variant="outline">
            ดูรายเดือน
          </Button>
        </form>
        <form className="flex flex-wrap items-end gap-2" action="/backoffice/analytics/" onSubmit={validate}>
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
          <Button type="submit" size="sm">
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
