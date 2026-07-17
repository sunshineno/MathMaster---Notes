import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8")) as { version: string };
function resolveGitCommit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try { return execSync("git rev-parse --short HEAD", { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return "local"; }
}
export default defineConfig({
  plugins: [react()],
  base: "/MathMaster---Notes/",
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    __BUILD_COMMIT__: JSON.stringify(resolveGitCommit())
  },
  build: { sourcemap: false }
});
