import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  globalIgnores([".next/**", ".next-ui-v2/**", ".next-outcomes/**", ".next-outcomes-preview/**", "node_modules/**"]),
]);
