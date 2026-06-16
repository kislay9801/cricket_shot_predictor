import type { Config } from "tailwindcss";

/**
 * "Elite Cricket AI" design system (from the Stitch export):
 * navy + cricket-green + slate, Hanken Grotesk / JetBrains Mono, small
 * architectural radii, tonal surface layers, thin slate outlines.
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        error: "#ba1a1a",
        "on-primary-fixed": "#131b2e",
        background: "#f7f9fb",
        "inverse-primary": "#bec6e0",
        "surface-container-lowest": "#ffffff",
        "surface-dim": "#d8dadc",
        "on-error-container": "#93000a",
        "on-background": "#191c1e",
        secondary: "#006e2f",
        "inverse-surface": "#2d3133",
        "inverse-on-surface": "#eff1f3",
        surface: "#f7f9fb",
        "on-secondary-fixed": "#002109",
        "secondary-fixed-dim": "#4ae176",
        tertiary: "#000000",
        "surface-bright": "#f7f9fb",
        primary: "#131b2e",
        "surface-container": "#eceef0",
        "surface-container-highest": "#e0e3e5",
        "on-primary-container": "#7c839b",
        "secondary-container": "#6bff8f",
        "surface-tint": "#565e74",
        "surface-container-low": "#f2f4f6",
        "on-primary": "#ffffff",
        "on-surface-variant": "#45464d",
        "on-secondary": "#ffffff",
        "on-surface": "#191c1e",
        "surface-variant": "#e0e3e5",
        "on-tertiary": "#ffffff",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-secondary-container": "#007432",
        "primary-container": "#131b2e",
        "outline-variant": "#c6c6cd",
        outline: "#76777d",
        "secondary-fixed": "#6bff8f",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        sm: "0.125rem",
        md: "0.375rem",
        lg: "0.25rem",
        xl: "0.5rem",
        "2xl": "0.75rem",
        full: "9999px",
      },
      spacing: {
        base: "4px",
        xs: "4px",
        sm: "8px",
        md: "16px",
        gutter: "16px",
        lg: "24px",
        margin: "24px",
        xl: "40px",
        "2xl": "64px",
      },
      fontFamily: {
        sans: ["var(--font-hanken)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        "display-lg": ["var(--font-hanken)"],
        "headline-lg": ["var(--font-hanken)"],
        "headline-md": ["var(--font-hanken)"],
        "headline-lg-mobile": ["var(--font-hanken)"],
        "body-lg": ["var(--font-hanken)"],
        "body-md": ["var(--font-hanken)"],
        "data-mono": ["var(--font-mono)"],
        "label-caps": ["var(--font-mono)"],
      },
      fontSize: {
        "body-md": ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        "label-caps": ["12px", { lineHeight: "1.1", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "data-mono": ["14px", { lineHeight: "1.4", letterSpacing: "0.02em", fontWeight: "500" }],
        "headline-md": ["22px", { lineHeight: "1.3", fontWeight: "600" }],
        "headline-lg": ["32px", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "700" }],
        "headline-lg-mobile": ["24px", { lineHeight: "1.2", fontWeight: "700" }],
        "display-lg": ["48px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "800" }],
      },
      boxShadow: {
        "soft-touch": "0 12px 16px rgba(19,27,46,0.06)",
        lift: "0 16px 32px -12px rgba(19,27,46,0.12)",
        modal: "0 24px 48px -12px rgba(19,27,46,0.18)",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s infinite",
        "fade-up": "fade-up 0.5s cubic-bezier(0.16,1,0.3,1)",
      },
    },
  },
  plugins: [],
};

export default config;
