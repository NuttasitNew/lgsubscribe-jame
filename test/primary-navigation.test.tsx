import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MobileDock } from "@/components/mobile-dock";
import { SiteHeader } from "@/components/site-header";

const navigation = vi.hoisted(() => ({
  pathname: "/",
  replace: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: navigation.replace, push: navigation.push }),
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => {
  cleanup();
  navigation.pathname = "/";
  navigation.replace.mockReset();
  navigation.push.mockReset();
});

function headerMenuItems() {
  const nav = screen.getByRole("navigation", { name: "เมนูหลัก" });
  return within(nav)
    .getAllByRole("link")
    .map((link) => ({
      href: link.getAttribute("href"),
      label: link.textContent?.trim(),
    }));
}

function mobileMenuItems() {
  const nav = screen.getByRole("navigation", { name: "เมนูมือถือ" });
  return within(nav)
    .getAllByRole("link")
    .map((link) => ({
      href: link.getAttribute("href"),
      label: link.querySelector("span.block")?.textContent?.trim(),
    }));
}

describe("primary navigation", () => {
  it("keeps the mobile sidebar menu the same as the desktop topbar", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<SiteHeader />);
    const topbarItems = headerMenuItems();
    unmount();

    render(<MobileDock />);
    await user.click(screen.getByRole("button", { name: "เปิดเมนูหลัก" }));

    expect(mobileMenuItems()).toEqual(topbarItems);
    expect(topbarItems).toEqual([
      { href: "/", label: "หน้าแรก" },
      { href: "/products", label: "สินค้า" },
      { href: "/#reviews", label: "คำถามลูกค้า" },
      { href: "/what-is-lg-subscribe", label: "LG Subscribe คืออะไร" },
      { href: "/faq", label: "คำถามที่พบบ่อย" },
      { href: "/contact", label: "ติดต่อเรา" },
    ]);
  });
});
