import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Restrict Next/React rules to source only (avoids "getFilename is not a function"
// when eslint-plugin-react runs on next.config.ts with ESLint 10 flat config).
const sourceFiles = ["src/**/*.ts", "src/**/*.tsx", "src/**/*.js", "src/**/*.jsx"];
const onlySrc = (config) => ({ ...config, files: config.files ?? sourceFiles });

const eslintConfig = defineConfig([
  ...nextVitals.map(onlySrc),
  ...nextTs.map(onlySrc),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "release/**",
    "public/ffmpeg/**",
    "next-env.d.ts",
    // Avoid React plugin running on config files (ESLint 10 + eslint-config-next bug).
    "next.config.*",
    "*.config.*",
  ]),
]);

export default eslintConfig;
