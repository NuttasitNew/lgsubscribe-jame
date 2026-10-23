"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

/** รายการ 1 แถวใน in-page sidebar */
export type PageSectionItem = {
  id: string;
  /** ชื่อสั้น แสดงทุกขนาดจอ (truncate) */
  label: string;
  /** คำอธิบาย — แสดงเฉพาะ lg ขึ้นไป */
  description?: string;
  /** component reference จาก lucide-react เช่น ClipboardList (ไม่ใช่ JSX element) */
  icon?: LucideIcon;
  /** ป้าย/ตัวเลขมุมขวาของแถว */
  badge?: string | number;
  /** ชื่อกลุ่ม — แถวที่ติดกันและกลุ่มเดียวกันจะมีหัวข้อกลุ่มคั่นด้านบน (ไม่ใส่ = ไม่มีหัวข้อ) */
  group?: string;
  /** หัวข้อย่อย (table of contents) — แสดงแบบ accordion เมื่อแถวนี้ active แล้วกดเพื่อ scroll ไปหัวข้อนั้น */
  children?: { id: string; label: string; badge?: string | number; icon?: LucideIcon; iconClassName?: string }[];
};

type PageSectionSidebarProps = {
  items: PageSectionItem[];
  activeId: string;
  onSelect: (id: string) => void;
  /** กดหัวข้อย่อยใน accordion — parent เอาไป scroll ไป anchor นั้น */
  onSelectChild?: (itemId: string, childId: string) => void;
  /** หัวข้อย่อยที่กำลังเปิดอยู่ — ใช้ตอน submenu เป็นหน้าจริง ไม่ใช่แค่จุดเลื่อนในหน้า */
  activeChildId?: string;
  title?: string;
  titleIcon?: LucideIcon;
  /** ปุ่ม/ตัวควบคุมมุมขวาของหัวข้อ (เช่น ปุ่ม "เพิ่ม") */
  headerAction?: ReactNode;
  /** ปุ่มต่อแถว (เช่น แก้ไข/ลบ) — แสดงเมื่อเอาเมาส์วาง/โฟกัส/แถวถูกเลือก ; ต้องไม่ใช่ปุ่มซ้อนในแถว (วางแยกชั้นให้แล้ว) */
  renderItemActions?: (item: PageSectionItem) => ReactNode;
  /** ปุ่มต่อหัวข้อย่อย (เช่น แก้ไข/ลบโฟลเดอร์) — พฤติกรรมเหมือน renderItemActions */
  /** หน้าตาหัวข้อย่อย: "toc" = สารบัญแถบเขียว (ค่าเริ่มต้น เหมือนเดิม) ; "tree" = โฟลเดอร์ย่อยเยื้องเข้า โปร่งกว่า ใช้กับรายการหมวดหมู่ */
  childVariant?: "toc" | "tree";
  renderChildActions?: (itemId: string, child: NonNullable<PageSectionItem["children"]>[number]) => ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
};

/**
 * @description In-page sidebar ใช้ร่วมกันได้ — รายการเมนูภายในหน้า (ไม่ใช่ nav ของ layout) สูงเท่า parent + เลื่อนในตัวเอง
 *              active state = แถบเขียวซ้าย ตาม design system ใหม่ (พื้นเทา + section การ์ดขาว)
 * @page ใช้ได้ทุกหน้าใน (management-program)
 * @access ทุก role (presentational ล้วน — parent เป็นคนคุมสิทธิ์)
 * @parent หน้าที่ใช้โครงพอดีจอ (h-[calc(100dvh-50px)] + flex-col + min-h-0 flex-1)
 * @props { items, activeId, onSelect, onSelectChild?, activeChildId?, title?, titleIcon?, searchable?, searchPlaceholder?, emptyText?, className? }
 * @features
 * - แถวรายการ list ต่อกันมีเส้นคั่น (ไม่ใช่การ์ดแยกก้อน) + แถบเขียวซ้ายเมื่อถูกเลือก
 * - search กรองจาก label + description (case-insensitive) เปิดด้วย searchable
 * - childVariant="tree": หัวข้อย่อยเป็นโฟลเดอร์ย่อยเยื้องเข้า (แถวเลือกเป็นพื้นเขียวอ่อน badge เป็นแคปซูล) ; ปุ่มต่อหัวข้อย่อยโผล่เมื่อวางเมาส์/โฟกัส
 * - headerAction / renderItemActions / renderChildActions (ไม่บังคับ): ปุ่มเพิ่มที่หัวข้อ และปุ่มแก้ไข/ลบต่อแถว (แถวหลัก/หัวข้อย่อย) ; หัวข้อย่อยมี badge ตัวเลขได้ — ใช้กับ sidebar ที่เป็นรายการหมวดหมู่จัดการได้
 * - item ที่มี children = accordion เปิดเมื่อ active แสดง table of contents ให้กด scroll ไปหัวข้อ (onSelectChild)
 * - item.group (ไม่บังคับ): ขึ้นหัวข้อกลุ่มตัวเล็กเมื่อกลุ่มเปลี่ยนจากแถวก่อนหน้า — เรียง items ให้กลุ่มเดียวกันอยู่ติดกัน
 * - responsive: จอเล็กแสดงไอคอน+ชื่อสั้น, lg ขึ้นไปแสดง description 2 บรรทัด
 * - ไม่กำหนดความกว้างเอง — ให้ parent คุมผ่าน grid (แนะนำ lg:grid-cols-[280px_1fr])
 * - parent ต้องครอบด้วย container ที่มี min-h-0 ไม่งั้น scroll ภายในจะไม่ทำงาน
 * @dependencies ไม่มี state ภายนอก (controlled ล้วน — ไม่มี Zustand/TanStack)
 * @used-by หน้าที่ต้องการเมนูซ้ายในหน้า เช่นรายงาน/ตั้งค่าแบบหลายหมวด
 * @related
 * - ต้นแบบ: {@link feature/super-admin/line-notification-test/components/template-selection-card.tsx}
 * - โครงหน้าพอดีจอ: {@link feature/super-admin/line-notification-test/components/line-notification-test-page.tsx}
 * @example
 * <div className="grid min-h-0 flex-1 grid-cols-[130px_1fr] gap-3 sm:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr] lg:gap-4">
 *   <div className="min-h-0">
 *     <PageSectionSidebar items={ITEMS} activeId={active} onSelect={setActive} title="หมวดรายงาน" searchable />
 *   </div>
 *   <div className="min-h-0 min-w-0">{content}</div>
 * </div>
 */
export const PageSectionSidebar = ({
  items,
  activeId,
  onSelect,
  onSelectChild,
  activeChildId,
  title = "หมวดหมู่",
  titleIcon: TitleIcon,
  headerAction,
  renderItemActions,
  renderChildActions,
  childVariant = "toc",
  searchable = false,
  searchPlaceholder = "ค้นหา...",
  emptyText = "ไม่พบรายการที่ค้นหา",
  className,
}: PageSectionSidebarProps) => {
  // hooks ห้าม conditional — ถ้าไม่เปิด searchable ก็คง state ไว้ แค่ไม่ render ช่องค้นหา (search = "" ตลอด)
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) => i.label.toLowerCase().includes(q) || (i.description?.toLowerCase().includes(q) ?? false)
    );
  }, [items, search]);

  return (
    // h-full + flex-col — parent ครอบด้วย grid cell ที่มี min-h-0 ให้สูงเท่าจอ แล้ว list เลื่อนใน ScrollArea
    // overflow-hidden กันแถบ border-l-4 ล้นมุมโค้งของ Card
    <Card className={cn("flex h-full flex-col overflow-hidden", className)}>
      <CardHeader className="space-y-2 px-2 pb-3 sm:px-3 lg:px-4">
        <CardTitle className="flex items-center gap-1.5 text-sm lg:gap-2 lg:text-base">
          {TitleIcon && <TitleIcon className="h-4 w-4 shrink-0 text-green-500 lg:h-5 lg:w-5" />}
          <span className="min-w-0 flex-1 truncate">{title}</span>
          {headerAction}
        </CardTitle>

        {/* search — กรองชื่อ/คำอธิบาย */}
        {searchable && (
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 pl-7 text-xs lg:text-sm"
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="min-h-0 flex-1 px-0 pb-2">
        {/* viewport ของ Radix ห่อเนื้อหาด้วย display:table ทำให้แถวกว้างเกินกรอบเมื่อชื่อยาว (truncate/ตัวเลขท้ายแถวถูกตัด) → บังคับเป็น block ให้กว้างเท่ากรอบ */}
        <ScrollArea className="h-full w-full [&_[data-radix-scroll-area-viewport]>div]:!block">
          {filtered.length === 0 && <p className="px-3 py-6 text-center text-xs text-muted-foreground">{emptyText}</p>}

          {/* แถว list ต่อกัน มีเส้นคั่น ไม่ใช่การ์ดแยกก้อน */}
          <div className="divide-y divide-border/60 border-y border-border/60">
            {filtered.map((item, index) => {
              const active = item.id === activeId;
              const Icon = item.icon;
              const showGroup = item.group && item.group !== filtered[index - 1]?.group;
              return (
                <div key={item.id}>
                  {showGroup && (
                    <p className="bg-muted/40 px-2 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-3 lg:px-4 lg:text-[11px]">
                      {item.group}
                    </p>
                  )}
                  <div className="group relative">
                    <button
                      type="button"
                      onClick={() => onSelect(item.id)}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "flex w-full items-start gap-2 border-l-4 px-2 py-2 text-left transition-colors sm:px-3 lg:px-4",
                        active
                          ? "border-l-green-600 bg-green-50 dark:bg-green-950"
                          : "border-l-transparent hover:bg-muted"
                      )}
                    >
                      {/* ไอคอนประจำแถว — ถ้าไม่ส่งมาใช้จุดนำหน้าแทน */}
                      {Icon ? (
                        <Icon
                          className={cn("mt-0.5 h-4 w-4 shrink-0", active ? "text-green-600" : "text-muted-foreground")}
                        />
                      ) : (
                        <span
                          className={cn(
                            "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                            active ? "bg-green-600" : "bg-muted-foreground/40"
                          )}
                        />
                      )}

                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate text-xs font-medium lg:text-sm",
                            active && "text-green-700 dark:text-green-300"
                          )}
                        >
                          {item.label}
                        </span>
                        {/* คำอธิบาย — ซ่อนบน mobile/tablet, แสดงเมื่อ lg ขึ้นไป */}
                        {item.description && (
                          <span className="hidden text-xs text-muted-foreground lg:line-clamp-2 lg:block">
                            {item.description}
                          </span>
                        )}
                      </span>

                      {item.badge != null && (
                        <span
                          className={cn(
                            "ml-auto shrink-0 bg-muted px-1.5 text-[10px] font-medium text-muted-foreground",
                            renderItemActions && "group-hover:invisible",
                            renderItemActions && active && "invisible"
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                    {renderItemActions && (
                      <div
                        className={cn(
                          "absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded bg-card/90 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100",
                          active && "opacity-100"
                        )}
                      >
                        {renderItemActions(item)}
                      </div>
                    )}
                  </div>

                  {/* accordion: table of contents ของหมวดที่ active — กดแล้ว scroll ไป anchor */}
                  {active && item.children && item.children.length > 0 && (
                    <div
                      className={cn(
                        childVariant === "tree"
                          ? "space-y-0.5 bg-muted/30 px-2 py-1.5"
                          : "border-l-4 border-l-green-600 bg-green-50/50 pb-1 dark:bg-green-950/50"
                      )}
                    >
                      {item.children.map((child) => {
                        const childActive = child.id === activeChildId;
                        return (
                          <div key={child.id} className="group relative">
                            <button
                              type="button"
                              onClick={() => onSelectChild?.(item.id, child.id)}
                              title={child.label}
                              aria-current={childActive ? "true" : undefined}
                              className={cn(
                                "flex w-full items-center gap-2 text-left transition-colors",
                                childVariant === "tree"
                                  ? "rounded-md py-2 pl-3 pr-2 text-xs lg:text-sm"
                                  : "py-2 pl-5 pr-2 text-xs sm:pl-6 lg:pl-8 lg:text-sm",
                                childVariant === "tree"
                                  ? childActive
                                    ? "bg-green-100 font-medium text-green-800 dark:bg-green-900/40 dark:text-green-200"
                                    : "text-foreground/80 hover:bg-muted"
                                  : childActive
                                    ? "font-medium text-green-700 dark:text-green-300"
                                    : "text-muted-foreground hover:text-green-700 dark:hover:text-green-300"
                              )}
                            >
                              {child.icon ? (
                                <child.icon
                                  className={cn("h-4 w-4 shrink-0 lg:h-[18px] lg:w-[18px]", child.iconClassName)}
                                />
                              ) : (
                                <span
                                  className={cn(
                                    "h-1 w-1 shrink-0 rounded-full",
                                    childActive ? "bg-green-600" : "bg-muted-foreground/40"
                                  )}
                                />
                              )}
                              <span className="min-w-0 flex-1 truncate">{child.label}</span>
                              {child.badge != null && (
                                <span
                                  className={cn(
                                    "shrink-0 text-[10px] text-muted-foreground",
                                    childVariant === "tree" &&
                                      "min-w-[1.5rem] rounded-full bg-background px-1.5 py-0.5 text-center font-medium tabular-nums",
                                    renderChildActions && "group-hover:invisible"
                                  )}
                                >
                                  {child.badge}
                                </span>
                              )}
                            </button>
                            {renderChildActions && (
                              <div
                                className={cn(
                                  "absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded-md bg-card opacity-0 shadow-sm ring-1 ring-border transition-opacity focus-within:opacity-100 group-hover:opacity-100"
                                )}
                              >
                                {renderChildActions(item.id, child)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
