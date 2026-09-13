// @vitest-environment-options {"url":"https://www.lgthailand-subscribe.com/contact/"}
import { fireEvent, render, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { GoogleAnalytics } from "./google-analytics";

vi.mock("next/script", () => ({ default: () => null }));

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  Reflect.deleteProperty(window, "gtag");
  Reflect.deleteProperty(window, "dataLayer");
});

it("tracks nested contact clicks once, without sending addresses or query strings", () => {
  vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-1P70VTZQZH");
  const view = render(
    <>
      <GoogleAnalytics />
      <a href="https://line.me/R/ti/p/%40lgsubscribe">
        <span>LINE</span>
      </a>
      <a href="tel:+66849748429">Phone</a>
      <a href="mailto:lgsubscribe.th@gmail.com?subject=private">Email</a>
      <a href="https://www.lg.com/">Products</a>
      <a href="tel:+6620575757">LG verification hotline</a>
    </>,
  );
  const layer = Reflect.get(window, "dataLayer") as IArguments[];
  const cancelNavigation = (event: MouseEvent) => event.preventDefault();
  document.addEventListener("click", cancelNavigation);
  for (const label of ["LINE", "Phone", "Email", "Products", "LG verification hotline"]) {
    fireEvent.click(view.getByText(label));
  }
  const events = layer.map((entry) => Array.from(entry)).filter((entry) => entry[0] === "event");
  expect(events).toEqual(
    ["line", "phone", "email"].map((method) => [
      "event",
      "contact_click",
      {
        contact_method: method,
        page_path: "/contact/",
        transport_type: "beacon",
      },
    ]),
  );
  view.unmount();
  document.removeEventListener("click", cancelNavigation);
});

it("does not initialize tracking without a measurement ID", () => {
  vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
  render(<GoogleAnalytics />);
  expect(Reflect.get(window, "gtag")).toBeUndefined();
});
