/**
 * @description Read an exact blog slug from a GSC URL without matching a longer article slug.
 * @logic Accept locale prefixes, query strings and trailing slashes; malformed escapes return null.
 * @used-by SEO article metrics and ranking actions
 */
export const extractBlogSlug = (pageUrl: string): string | null => {
  const matched = /\/blog\/([^/?#]+)(?:\/?(?:[?#].*)?)$/.exec(pageUrl);
  try {
    return matched?.[1] ? decodeURIComponent(matched[1]) : null;
  } catch {
    return null;
  }
};
