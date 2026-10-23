import type { PrismaClient } from "@prisma/client";

import { getPrisma } from "@/lib/db/prisma";

/**
 * Default-export Prisma client for the SEO code ported from hmp-frontend (`import prisma from ...`).
 * Delegates lazily to `getPrisma()` so importing a module never opens a connection.
 */
const prisma = new Proxy({} as PrismaClient, {
  get(_target, key) {
    const client = getPrisma();
    const value = Reflect.get(client, key, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export default prisma;
