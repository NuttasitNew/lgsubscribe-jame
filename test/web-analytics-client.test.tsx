import { StrictMode } from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const navigation = vi.hoisted(() => ({ path: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.path }));
import { setTrackingConsent } from "@/lib/analytics/consent";
import { WebAnalytics } from "@/components/web-analytics";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
});
it("tracks public SPA navigation and revisits without duplicating StrictMode effects", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetch);
  setTrackingConsent("analytics");
  const view = render(
    <StrictMode>
      <WebAnalytics />
    </StrictMode>,
  );
  await act(async () => {});
  expect(fetch).toHaveBeenCalledTimes(1);
  navigation.path = "/products/";
  view.rerender(
    <StrictMode>
      <WebAnalytics />
    </StrictMode>,
  );
  await act(async () => {});
  navigation.path = "/";
  view.rerender(
    <StrictMode>
      <WebAnalytics />
    </StrictMode>,
  );
  await act(async () => {});
  expect(fetch).toHaveBeenCalledTimes(3);
  const payloads = fetch.mock.calls.map((call) => JSON.parse(call[1].body));
  expect(payloads.map((data) => data.path)).toEqual(["/", "/products/", "/"]);
  expect(new Set(payloads.map((data) => data.eventId)).size).toBe(3);
});

it("waits for consent, records contact method and stops collection after withdrawal", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetch);
  navigation.path = "/privacy-check/";
  const view = render(
    <>
      <WebAnalytics />
      <a href="https://line.me/R/ti/p/%40lgsubscribe">LINE test</a>
    </>,
  );
  await act(async () => {});
  expect(fetch).not.toHaveBeenCalled();
  await act(async () => setTrackingConsent("analytics"));
  const prevent = (event: MouseEvent) => event.preventDefault();
  document.addEventListener("click", prevent);
  fireEvent.click(view.getByText("LINE test"));
  await act(async () => {});
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({
    eventType: "contact_click",
    contactMethod: "line",
  });
  await act(async () => setTrackingConsent("necessary"));
  expect(fetch.mock.calls.at(-1)![1].method).toBe("DELETE");
  const count = fetch.mock.calls.length;
  fireEvent.click(view.getByText("LINE test"));
  await act(async () => {});
  expect(fetch).toHaveBeenCalledTimes(count);
  document.removeEventListener("click", prevent);
});
