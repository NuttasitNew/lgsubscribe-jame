import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    // Other sessions keep git worktrees in .claude/; their copies of the tests must not run here.
    exclude: [...configDefaults.exclude, ".claude/**"],
    // Keep half the cores free when several projects test at once (VITEST_MAX_WORKERS overrides).
    maxWorkers: "50%",
  },
});
