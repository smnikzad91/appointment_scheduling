import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // Production A/B build folders (scripts/deploy.sh, NEXT_DIST_DIR).
    ".next-a/**",
    ".next-b/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Ad-hoc manual QA scripts, not part of the app build.
    ".playwright-check/**",
  ]),
]);

export default eslintConfig;
