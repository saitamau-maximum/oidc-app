import { defineConfig } from "@pandacss/dev";
export default defineConfig({
  preflight: false,
  include: ["./src/**/*.{ts,tsx}"],
  outdir: "styled-system",
  globalCss: {
    ":root": {
      fontFamily:
        'Inter, "Noto Sans JP", -apple-system, BlinkMacSystemFont, "Segoe UI",\n      sans-serif',
      color: "#062922",
      background: "#10a984",
      fontSynthesis: "none",
      lineHeight: "1.6",
    },
    "*": { boxSizing: "border-box" },
    body: {
      margin: "0",
      padding: "22px",
      minWidth: "320px",
      minHeight: "100dvh",
      background: "linear-gradient(120deg, #0aa583, #29b98c)",
      "@media (max-width: 540px)": { padding: "10px" },
    },
    "h1, h2, p": { margin: "0" },
    "a:focus-visible, button:focus-visible": {
      outline: "3px solid #069e78",
      outlineOffset: "5px",
    },
  },
});
