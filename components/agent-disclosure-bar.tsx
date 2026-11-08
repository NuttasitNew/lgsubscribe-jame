import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { authorizedAgent, siteOperatorDisclosure } from "@/lib/site";

/**
 * Thin notice above the header on every public page, so a first-time visitor
 * (and an ad reviewer) sees that this is an authorized agent, not LG itself.
 */
export function AgentDisclosureBar() {
  return (
    <div className="border-b border-black/[0.07] bg-neutral-950 text-white">
      <div className="mx-auto flex min-h-8 w-full max-w-[1480px] items-center justify-center gap-2 px-5 py-1.5 text-center text-[12px] font-medium leading-snug sm:px-8">
        <BadgeCheck aria-hidden="true" className="size-4 shrink-0 text-red-400" />
        <p>
          <span className="hidden sm:inline">{siteOperatorDisclosure.bar}</span>
          <span className="sm:hidden">{siteOperatorDisclosure.barShort}</span>{" "}
          <Link
            href={authorizedAgent.path}
            className="whitespace-nowrap font-semibold text-red-300 underline underline-offset-2 hover:text-white"
          >
            ตรวจสอบสถานะตัวแทน
          </Link>
        </p>
      </div>
    </div>
  );
}
