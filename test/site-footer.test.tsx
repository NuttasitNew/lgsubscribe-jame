import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SiteFooter } from "@/components/site-footer";
import { authorizedAgent, siteOperatorDisclosure } from "@/lib/site";

afterEach(() => {
  cleanup();
});

describe("SiteFooter operator disclosure", () => {
  it("states in Thai and English that this site is an authorized LG Subscribe agent, not LG", () => {
    render(<SiteFooter />);

    const footer = screen.getByRole("contentinfo");

    expect(within(footer).getByText(siteOperatorDisclosure.blurb)).toBeInTheDocument();

    expect(within(footer).getByRole("heading", { name: siteOperatorDisclosure.th.heading })).toBeInTheDocument();
    expect(within(footer).getByText(siteOperatorDisclosure.th.identity)).toBeInTheDocument();
    expect(within(footer).getByText(siteOperatorDisclosure.th.credentials)).toBeInTheDocument();
    expect(within(footer).getByText(siteOperatorDisclosure.th.rights)).toBeInTheDocument();
    expect(within(footer).getByText(siteOperatorDisclosure.th.trademark)).toBeInTheDocument();

    expect(within(footer).getByRole("heading", { name: siteOperatorDisclosure.en.heading })).toBeInTheDocument();
    expect(within(footer).getByText(siteOperatorDisclosure.en.identity)).toBeInTheDocument();
    expect(within(footer).getByText(siteOperatorDisclosure.en.credentials)).toBeInTheDocument();
    expect(within(footer).getByText(siteOperatorDisclosure.en.rights)).toBeInTheDocument();
    expect(within(footer).getByText(siteOperatorDisclosure.en.trademark)).toBeInTheDocument();

    expect(within(footer).getByText(siteOperatorDisclosure.en.identity).closest("section")).toHaveAttribute(
      "lang",
      "en",
    );
    expect(within(footer).getAllByText(new RegExp(authorizedAgent.nameTh)).length).toBeGreaterThan(0);
    expect(within(footer).getAllByText(new RegExp(`รหัสตัวแทน ${authorizedAgent.code}`)).length).toBeGreaterThan(
      0,
    );
    expect(within(footer).getByRole("link", { name: authorizedAgent.verificationPhone.label })).toHaveAttribute(
      "href",
      authorizedAgent.verificationPhone.href,
    );
    expect(within(footer).getByRole("link", { name: "ดูหน้าความน่าเชื่อถือ" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/authorized\/?$/),
    );
  });
});
