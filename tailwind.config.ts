import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        luxury: {
          cognac: "hsl(var(--luxury-cognac))",
          "cognac-light": "hsl(var(--luxury-cognac-light))",
          champagne: "hsl(var(--luxury-champagne))",
          carbon: "hsl(var(--luxury-carbon))",
          chrome: "hsl(var(--luxury-chrome))",
          bronze: "hsl(var(--luxury-bronze))",
          amber: "hsl(var(--luxury-amber))",
          navy: "hsl(var(--luxury-navy))",
          "navy-light": "hsl(var(--luxury-navy-light))",
          "navy-dark": "hsl(var(--luxury-navy-dark))",
        },
        library: {
          forest: "hsl(var(--library-forest))",
          "forest-light": "hsl(var(--library-forest-light))",
          "forest-dark": "hsl(var(--library-forest-dark))",
          mahogany: "hsl(var(--library-mahogany))",
          "mahogany-light": "hsl(var(--library-mahogany-light))",
          "mahogany-dark": "hsl(var(--library-mahogany-dark))",
          brass: "hsl(var(--library-brass))",
          "brass-light": "hsl(var(--library-brass-light))",
          gold: "hsl(var(--library-gold))",
          parchment: "hsl(var(--library-parchment))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "1.5rem",
        "2xl": "2rem",
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
        serif: [
          "var(--font-lora)",
          "Merriweather",
          "Georgia",
          "Garamond",
          "serif",
        ],
        display: ["var(--font-lora)", "Playfair Display", "Georgia", "serif"],
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out",
        "slide-up": "slideUp 0.6s ease-out",
        "slide-down": "slideDown 0.4s ease-out",
        "scale-in": "scaleIn 0.4s ease-out",
        shimmer: "shimmer 2s linear infinite",
        glow: "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        glow: {
          "0%": { opacity: "0.5" },
          "100%": { opacity: "1" },
        },
      },
      boxShadow: {
        luxury: "0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)",
        "luxury-lg":
          "0 20px 60px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1)",
        "luxury-xl":
          "0 30px 80px rgba(0, 0, 0, 0.2), 0 8px 24px rgba(0, 0, 0, 0.12)",
        "inner-luxury": "inset 0 2px 8px rgba(0, 0, 0, 0.06)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.1)",
      },
    },
  },
  plugins: [],
};
export default config;
