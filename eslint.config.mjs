import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // `any` is used intentionally throughout for JSON parsing and API responses
      "@typescript-eslint/no-explicit-any": "off",
      // Unused vars: warn only, don't error
      "@typescript-eslint/no-unused-vars": "warn",
      // setState-in-effect, ref-in-render, and purity patterns used intentionally
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
    },
  },
]);

export default eslintConfig;
