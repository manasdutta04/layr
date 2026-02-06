import tseslint from "typescript-eslint";
import eslint from "@eslint/js";

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["src/**/*.ts"],
        rules: {
            "curly": "warn",
            "eqeqeq": "warn",
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": ["warn", {
                "argsIgnorePattern": "^_",
                "varsIgnorePattern": "^_",
                "caughtErrorsIgnorePattern": "^_"
            }],
            "@typescript-eslint/no-explicit-any": "warn"
        }
    },
    {
        ignores: ["out/", "dist/", "**/*.d.ts"]
    }
);
