import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-[1.5px] min-h-touch select-none overflow-hidden group",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm border-primary hover:shadow-[0_0_20px_rgba(42,169,160,0.3)] active:scale-[0.98] hover:scale-[1.02]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/90 border-secondary shadow-sm hover:shadow-[0_0_15px_rgba(29,111,111,0.2)] active:scale-[0.98] hover:scale-[1.02]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm border-destructive active:scale-[0.98] hover:scale-[1.02]",
        outline:
          "border-border bg-background hover:bg-muted/50 hover:border-ocean-turquoise active:scale-[0.98] hover:scale-[1.02]",
        ghost:
          "hover:bg-muted/50 border-transparent active:scale-[0.98] hover:scale-[1.02]",
        link: "underline-offset-4 hover:underline border-transparent",
        accent:
          "bg-accent text-accent-foreground hover:bg-accent/90 border-accent shadow-sm active:scale-[0.98] hover:scale-[1.02]",
        // Ocean-themed variants with enhanced effects
        success:
          "bg-feedback-success text-white hover:bg-feedback-success-dark border-feedback-success shadow-sm hover:shadow-[0_0_20px_rgba(95,212,160,0.3)] active:scale-[0.98] hover:scale-[1.02]",
        ocean:
          "bg-ocean-turquoise text-white hover:bg-ocean-turquoise/90 border-ocean-turquoise shadow-sm hover:shadow-[0_0_20px_rgba(42,169,160,0.4)] active:scale-[0.98] hover:scale-[1.02]",
        // 3D push button effect
        "3d": "bg-primary text-primary-foreground border-primary btn-3d",
        "3d-success":
          "bg-feedback-success text-white border-feedback-success btn-3d",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-10 rounded-xl px-4 border-[1px]",
        lg: "h-12 rounded-2xl px-8 border-2 text-base",
        xl: "h-14 rounded-2xl px-10 border-2 text-lg",
        icon: "h-11 w-11 rounded-xl",
        "icon-lg": "h-12 w-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  enableRipple?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      enableRipple = true,
      onClick,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const [ripples, setRipples] = React.useState<
      Array<{ x: number; y: number; id: number }>
    >([]);
    const buttonRef = React.useRef<HTMLButtonElement | null>(null);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (enableRipple && buttonRef.current) {
        const button = buttonRef.current;
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const newRipple = { x, y, id: Date.now() };
        setRipples((prev) => [...prev, newRipple]);

        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
        }, 600);
      }

      onClick?.(e);
    };

    // When using asChild, don't wrap children or add effects
    // Slot expects a single child to merge props into
    if (asChild) {
      return (
        <Comp
          ref={React.useMemo(() => {
            return (node: HTMLButtonElement) => {
              buttonRef.current = node;
              if (typeof ref === "function") {
                ref(node);
              } else if (ref) {
                ref.current = node;
              }
            };
          }, [ref])}
          className={cn(buttonVariants({ variant, size, className }))}
          onClick={handleClick}
          {...props}
        />
      );
    }

    return (
      <Comp
        ref={React.useMemo(() => {
          return (node: HTMLButtonElement) => {
            buttonRef.current = node;
            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          };
        }, [ref])}
        className={cn(buttonVariants({ variant, size, className }))}
        onClick={handleClick}
        {...props}
      >
        {/* Ripple effect container */}
        {enableRipple &&
          ripples.map((ripple) => (
            <span
              key={ripple.id}
              className="absolute rounded-full bg-white/30 pointer-events-none animate-ripple"
              style={{
                left: ripple.x - 10,
                top: ripple.y - 10,
                width: 20,
                height: 20,
              }}
            />
          ))}

        {/* Hover gradient overlay */}
        <span
          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            backgroundSize: "200% 100%",
            animation: "currentFlow 3s linear infinite",
          }}
        />

        {/* Content wrapper */}
        <span className="relative z-10 flex items-center justify-center gap-2">
          {props.children}
        </span>
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
