/** @logic Exact slug matching and safe malformed URL handling. @related helper/extract-blog-slug.ts */
import { describe, expect, it } from "vitest";
import { extractBlogSlug } from "@/lib/seo/helper/extract-blog-slug";
describe("extractBlogSlug", () => {
  it.each(["https://example.com/blog/sofa", "/en/blog/sofa/?x=1", "/th/blog/sofa#faq"])("reads %s", (url) =>
    expect(extractBlogSlug(url)).toBe("sofa")
  );
  it.each(["/service/sofa", "/blog/", "/blog/%zz", "/blog/sofa/extra"])("rejects %s", (url) =>
    expect(extractBlogSlug(url)).toBeNull()
  );
  it("does not conflate prefix slugs", () => expect(extractBlogSlug("/blog/sofa-price")).not.toBe("sofa"));
});
