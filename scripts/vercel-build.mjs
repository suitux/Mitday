// Vercel build: apply DB migrations (when a database is configured), then build.
import { execSync } from "node:child_process";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

if (process.env.DATABASE_URL) {
  run("pnpm db:migrate");
} else {
  console.warn("DATABASE_URL not set: skipping migrations");
}
run("pnpm build");
