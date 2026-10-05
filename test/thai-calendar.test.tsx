import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThaiCalendar } from "@/components/ui/thai-calendar";
import { calendarDate, calendarDay, thaiCalendarDate, thaiCalendarMonth } from "@/lib/thai-calendar";

describe("Thai calendar civil dates", () => {
  it("displays Buddhist years without changing the database year or selected day", () => {
    const date = calendarDate("2024-02-29");
    expect(calendarDay(date)).toBe("2024-02-29");
    expect(thaiCalendarDate(date)).toContain("2567");
    expect(thaiCalendarMonth(calendarDate("2026-10"))).toBe("ตุลาคม 2569");
    expect(calendarDay(new Date("2026-09-30T17:00:00Z"))).toBe("2026-10-01");
  });
  it("uses Thai navigation, weekday labels, years and date selection", () => {
    const onSelect = vi.fn();
    render(
      <ThaiCalendar
        mode="single"
        selected={calendarDate("2026-10-01")}
        defaultMonth={calendarDate("2026-10-01")}
        onSelect={onSelect}
      />,
    );
    expect(screen.getByRole("button", { name: "เดือนก่อนหน้า" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "เดือนถัดไป" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "เลือกปีในปฏิทิน" })).toHaveTextContent("2569");
    fireEvent.click(screen.getByRole("button", { name: "วันศุกร์ที่ 2 ตุลาคม พ.ศ. 2569" }));
    expect(calendarDay(onSelect.mock.calls[0][0])).toBe("2026-10-02");
  });
});
