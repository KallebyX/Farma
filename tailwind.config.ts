import type { Config } from "tailwindcss";

/**
 * TechBem design language (Apple HIG): San Francisco type via the system stack,
 * the brand green as the single accent/tint, continuous-corner radii, and a cool
 * system-grey neutral (Tailwind `slate`). The brand ramp is built around
 * #0ABF77 (light tint); brand-400 #2FD493 is the brighter dark-mode tint.
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./emails/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand green — the single HIG tint. brand-500 = #0ABF77.
        brand: {
          50: "#E6F9F1",
          100: "#C2F0DD",
          200: "#8AE3BE",
          300: "#4FD19C",
          400: "#2FD493",
          500: "#0ABF77",
          600: "#089E63",
          700: "#077C4F",
          800: "#066140",
          900: "#054B31",
        },
        emerald: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
        },
        success: "#0ABF77",
        warning: "#FF9F0A", // Apple system orange
        danger: "#FF3B30", // Apple system red
      },
      fontFamily: {
        // San Francisco on Apple devices; graceful system fallback elsewhere.
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"Segoe UI"',
          "system-ui",
          "Roboto",
          "sans-serif",
        ],
        mono: ['"SF Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        // Continuous (squircle-style) radii from the HIG token set.
        sm: "8px",
        md: "10px",
        lg: "12px",
        xl: "14px",
        "2xl": "20px",
      },
      boxShadow: {
        // Minimal elevation — soft ambient only, no heavy/colored drop shadows.
        card: "0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)",
        pop: "0 8px 30px -8px rgba(15,23,42,0.18)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
