/**
 * Minimal console logger with the `fileLogger.session()` shape used by the SEO code
 * ported from hmp-frontend. Each session prints its title once on error/end.
 */
type SessionMeta = { type?: string; id?: string; userName?: string };

function session(title: string, meta: SessionMeta = {}) {
  const prefix = `[seo] ${title}${meta.id ? ` (${meta.id})` : ""}`;
  let ended = false;
  return {
    log: (...args: unknown[]) => console.info(prefix, ...args),
    error: (...args: unknown[]) => console.error(prefix, ...args),
    end: (result?: unknown) => {
      if (ended) return;
      ended = true;
      if (result !== undefined && process.env.NODE_ENV !== "production") console.info(prefix, "done", result);
    },
  };
}

export const fileLogger = { session };
