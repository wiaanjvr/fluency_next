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
        // Ocean theme palette - Fluensea
        ocean: {
          // Primary deep blues - depth, trust, premium
          midnight: "hsl(var(--ocean-midnight))",
          "midnight-light": "hsl(var(--ocean-midnight-light))",
          "midnight-dark": "hsl(var(--ocean-midnight-dark))",
          // Turquoise aqua - clarity, energy, learning
          turquoise: "hsl(var(--ocean-turquoise))",
          "turquoise-light": "hsl(var(--ocean-turquoise-light))",
          "turquoise-dark": "hsl(var(--ocean-turquoise-dark))",
          // Teal sea green - balance, calm, comprehension
          teal: "hsl(var(--ocean-teal))",
          "teal-light": "hsl(var(--ocean-teal-light))",
          "teal-dark": "hsl(var(--ocean-teal-dark))",
          // Soft sand - warmth, accents
          sand: "hsl(var(--ocean-sand))",
          "sand-light": "hsl(var(--ocean-sand-light))",
          // Wave foam - highlights
          foam: "hsl(var(--ocean-foam))",
          // Coral accent - for warm highlights
          coral: "hsl(var(--ocean-coral))",
          // Deep abyss - for dark backgrounds
          abyss: "hsl(var(--ocean-abyss))",
        },
        // Legacy aliases for compatibility
        library: {
          forest: "hsl(var(--ocean-teal))",
          "forest-light": "hsl(var(--ocean-teal-light))",
          "forest-dark": "hsl(var(--ocean-teal-dark))",
          mahogany: "hsl(var(--ocean-midnight))",
          "mahogany-light": "hsl(var(--ocean-midnight-light))",
          "mahogany-dark": "hsl(var(--ocean-midnight-dark))",
          brass: "hsl(var(--ocean-turquoise))",
          "brass-light": "hsl(var(--ocean-turquoise-light))",
          gold: "hsl(var(--ocean-sand))",
          parchment: "hsl(var(--ocean-foam))",
          oxblood: "hsl(var(--destructive))",
        },
        // Feedback accent colors - friendly and encouraging
        feedback: {
          success: "#5fd4a0", // Success green - correct answers
          "success-light": "#8fe4be",
          "success-dark": "#3db87f",
          error: "#ff8a73", // Error coral - gentle mistakes
          "error-light": "#ffb3a3",
          "error-dark": "#e86a53",
          info: "#7fb3d5", // Info blue - hints/tips
          "info-light": "#a8cce4",
          "info-dark": "#5a9cc6",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      // Increased default spacing for breathing room
      spacing: {
        "4.5": "1.125rem",
        "5.5": "1.375rem",
        "13": "3.25rem",
        "15": "3.75rem",
        "18": "4.5rem",
        "22": "5.5rem",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
        serif: ["var(--font-serif)", "Georgia", "Garamond", "serif"],
        display: ["var(--font-serif)", "Georgia", "serif"],
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
        // Ocean-themed animations
        "ocean-wave": "oceanWave 4s ease-in-out infinite",
        "bubble-rise": "bubbleRise 8s ease-in infinite",
        "bubble-slow": "bubbleRise 12s ease-in infinite",
        "bubble-fast": "bubbleRise 5s ease-in infinite",
        ripple: "ripple 2s ease-out infinite",
        "depth-fade": "depthFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "current-flow": "currentFlow 8s ease infinite",
        "glow-turquoise": "glowTurquoise 3s ease-in-out infinite",
        // Friendly animations
        "bounce-in": "bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        "bounce-tap": "bounceTap 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        shake: "shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97)",
        "shake-gentle": "shakeGentle 0.4s ease-in-out",
        sparkle: "sparkle 1.5s ease-in-out infinite",
        "pulse-success": "pulseSuccess 0.6s ease-out",
        "checkmark-draw": "checkmarkDraw 0.4s ease-out forwards",
        "slide-up-fade": "slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down-fade": "slideDownFade 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-bounce":
          "scaleBounce 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        "counter-up": "counterUp 1s ease-out forwards",
        "progress-fill":
          "progressFill 1s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "card-lift": "cardLift 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "icon-bounce":
          "iconBounce 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        "fade-in-up": "fadeInUp 0.5s ease-out forwards",
        celebration: "celebration 0.8s ease-out",
        "ring-progress":
          "ringProgress 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards",
      },
      keyframes: {
        // Ocean-themed keyframes
        oceanWave: {
          "0%": { transform: "translateX(0) translateY(0)" },
          "25%": { transform: "translateX(-5px) translateY(-3px)" },
          "50%": { transform: "translateX(0) translateY(0)" },
          "75%": { transform: "translateX(5px) translateY(-3px)" },
          "100%": { transform: "translateX(0) translateY(0)" },
        },
        bubbleRise: {
          "0%": { transform: "translateY(100%) scale(0.8)", opacity: "0" },
          "20%": { opacity: "0.6" },
          "100%": { transform: "translateY(-100vh) scale(1)", opacity: "0" },
        },
        ripple: {
          "0%": { transform: "scale(1)", opacity: "0.5" },
          "100%": { transform: "scale(4)", opacity: "0" },
        },
        depthFade: {
          "0%": {
            opacity: "0",
            transform: "translateY(-20px) scale(1.05)",
            filter: "blur(4px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0) scale(1)",
            filter: "blur(0)",
          },
        },
        currentFlow: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        glowTurquoise: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(42, 169, 160, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(42, 169, 160, 0.6)" },
        },
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
        // New keyframes
        bounceIn: {
          "0%": { transform: "scale(0)", opacity: "0" },
          "50%": { transform: "scale(1.1)" },
          "70%": { transform: "scale(0.95)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        bounceTap: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.95)" },
          "100%": { transform: "scale(1)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "10%": { transform: "translateX(-8px)" },
          "20%": { transform: "translateX(8px)" },
          "30%": { transform: "translateX(-6px)" },
          "40%": { transform: "translateX(6px)" },
          "50%": { transform: "translateX(-4px)" },
          "60%": { transform: "translateX(4px)" },
          "70%": { transform: "translateX(-2px)" },
          "80%": { transform: "translateX(2px)" },
          "90%": { transform: "translateX(-1px)" },
        },
        shakeGentle: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-4px)" },
          "50%": { transform: "translateX(4px)" },
          "75%": { transform: "translateX(-2px)" },
        },
        sparkle: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(1.1)" },
        },
        pulseSuccess: {
          "0%": {
            transform: "scale(1)",
            boxShadow: "0 0 0 0 rgba(95, 212, 160, 0.5)",
          },
          "50%": {
            transform: "scale(1.02)",
            boxShadow: "0 0 0 10px rgba(95, 212, 160, 0)",
          },
          "100%": {
            transform: "scale(1)",
            boxShadow: "0 0 0 0 rgba(95, 212, 160, 0)",
          },
        },
        checkmarkDraw: {
          "0%": { strokeDashoffset: "100" },
          "100%": { strokeDashoffset: "0" },
        },
        slideUpFade: {
          "0%": { transform: "translateY(16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDownFade: {
          "0%": { transform: "translateY(-16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleBounce: {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "60%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(95, 212, 160, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(95, 212, 160, 0.6)" },
        },
        counterUp: {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        progressFill: {
          "0%": { width: "0%" },
          "100%": { width: "var(--progress-width, 100%)" },
        },
        cardLift: {
          "0%": {
            transform: "translateY(0)",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          },
          "100%": {
            transform: "translateY(-4px)",
            boxShadow: "0 12px 24px rgba(0, 0, 0, 0.15)",
          },
        },
        iconBounce: {
          "0%": { transform: "scale(1)" },
          "30%": { transform: "scale(1.2)" },
          "50%": { transform: "scale(0.9)" },
          "70%": { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)" },
        },
        fadeInUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        celebration: {
          "0%": { transform: "scale(0) rotate(-180deg)", opacity: "0" },
          "50%": { transform: "scale(1.2) rotate(10deg)" },
          "75%": { transform: "scale(0.95) rotate(-5deg)" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
        ringProgress: {
          "0%": { strokeDashoffset: "var(--ring-circumference, 283)" },
          "100%": { strokeDashoffset: "var(--ring-offset, 0)" },
        },
      },
      // Minimum tap target sizes (44px for mobile accessibility)
      minHeight: {
        touch: "44px",
        "touch-lg": "48px",
      },
      minWidth: {
        touch: "44px",
        "touch-lg": "48px",
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
