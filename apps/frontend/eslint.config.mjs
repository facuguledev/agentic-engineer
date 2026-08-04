// Flat config — the default format ESLint 9 / eslint-config-next 15 expect
// (checked against this project's installed eslint@9.39.5 and
// eslint-config-next@15.1.12 rather than assumed; eslint-config-next's own
// shareable configs are still authored in the legacy eslintrc shape
// internally, so FlatCompat is required to bridge them into flat config —
// this is Next's own documented pattern for `next lint` under ESLint 9,
// not a hand-rolled bridge).
//
// Extends next/core-web-vitals (Next's recommended baseline — includes
// eslint-plugin-react-hooks and eslint-plugin-jsx-a11y, so this does not
// silently drop the a11y/hooks coverage VALIDATE_A11Y depends on) and
// next/typescript, since this is a TypeScript project.
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "node_modules/**"],
  },
];

export default eslintConfig;
