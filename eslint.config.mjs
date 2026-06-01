import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Unescaped entities inside JSX are intentional (Portuguese UI copy).
      "react/no-unescaped-entities": "off",
      // Calling async loaders (e.g. carregar()) inside useEffect is our established pattern.
      "react-hooks/set-state-in-effect": "off",
      // Date.now() and similar impure calls during render are our established pattern for
      // calculating relative times/diffs in display components — not a correctness issue.
      "react-hooks/purity": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
