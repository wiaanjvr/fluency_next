import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ocean-turquoise/40",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-ocean-turquoise/15 text-ocean-turquoise",
        secondary: "border-transparent bg-white/5 text-seafoam/80",
        outline: "border-ocean-turquoise/30 text-seafoam",
        destructive: "border-transparent bg-red-500/15 text-red-400",
        success: "border-transparent bg-emerald-500/15 text-emerald-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
