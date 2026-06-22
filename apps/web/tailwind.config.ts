import type { Config } from "tailwindcss";

/**
 * Build a Tailwind color object from a CSS custom property whose value is a
 * space-separated RGB channel triple (e.g. `--color-x: 13 148 136`). Using the
 * `<alpha-value>` placeholder lets opacity modifiers work (`bg-primary-600/50`).
 */
const rgbVar = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

/**
 * Build a full 50..950 scale that reads from `--{prefix}-{shade}` variables.
 */
const scale = (prefix: string, shades: readonly (number | string)[]) =>
  Object.fromEntries(
    shades.map((s) => [String(s), rgbVar(`--color-${prefix}-${s}`)]),
  );

const fullShades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const semanticShades = [50, 100, 500, 600, 700] as const;

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Full brand + neutral + accent scales.
        primary: {
          ...scale("primary", fullShades),
          DEFAULT: rgbVar("--primary"),
          foreground: rgbVar("--primary-foreground"),
        },
        neutral: scale("neutral", fullShades),
        accent: {
          ...scale("accent", fullShades),
          DEFAULT: rgbVar("--accent"),
          foreground: rgbVar("--accent-foreground"),
        },

        // Semantic palettes (50/100/500/600/700) + role DEFAULT/foreground.
        success: {
          ...scale("success", semanticShades),
          DEFAULT: rgbVar("--success"),
          foreground: rgbVar("--success-foreground"),
        },
        warning: {
          ...scale("warning", semanticShades),
          DEFAULT: rgbVar("--warning"),
          foreground: rgbVar("--warning-foreground"),
        },
        danger: {
          ...scale("danger", semanticShades),
          DEFAULT: rgbVar("--danger"),
          foreground: rgbVar("--danger-foreground"),
        },
        info: {
          ...scale("info", semanticShades),
          DEFAULT: rgbVar("--info"),
          foreground: rgbVar("--info-foreground"),
        },

        // Surface / text roles (theme-aware via CSS vars).
        background: rgbVar("--background"),
        foreground: rgbVar("--foreground"),
        card: {
          DEFAULT: rgbVar("--card"),
          foreground: rgbVar("--card-foreground"),
        },
        popover: {
          DEFAULT: rgbVar("--popover"),
          foreground: rgbVar("--popover-foreground"),
        },
        muted: {
          DEFAULT: rgbVar("--muted"),
          foreground: rgbVar("--muted-foreground"),
        },
        border: rgbVar("--border"),
        input: rgbVar("--input"),
        ring: rgbVar("--ring"),
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        card: "var(--radius-card)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        card: "var(--shadow-card)",
        focus: "var(--shadow-focus)",
      },
      fontFamily: {
        sans: ["var(--font-noto-sans-thai)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
