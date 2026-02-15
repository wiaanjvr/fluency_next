import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-[1.5px] min-h-touch select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm border-primary btn-bounce hover:shadow-[0_0_20px_rgba(230,201,74,0.3)] active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/90 border-secondary shadow-sm btn-bounce hover:shadow-[0_0_15px_rgba(191,165,99,0.2)] active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm border-destructive btn-bounce active:scale-[0.98]",
        outline:
          "border-border bg-background hover:bg-muted/50 hover:border-library-brass btn-bounce active:scale-[0.98]",
        ghost:
          "hover:bg-muted/50 border-transparent btn-bounce active:scale-[0.98]",
        link: "underline-offset-4 hover:underline border-transparent",
        accent:
          "bg-accent text-accent-foreground hover:bg-accent/90 border-accent shadow-sm btn-bounce active:scale-[0.98]",
        // New friendly variants
        success:
          "bg-feedback-success text-white hover:bg-feedback-success-dark border-feedback-success shadow-sm btn-bounce hover:shadow-[0_0_20px_rgba(95,212,160,0.3)] active:scale-[0.98]",
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
