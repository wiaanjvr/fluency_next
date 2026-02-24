import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-2xl border-[1.5px] border-border/50 bg-background px-5 py-3 text-sm font-light transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] file:border-0 file:bg-transparent file:text-sm file:font-light placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-ocean-turquoise focus-visible:shadow-[0_0_0_4px_rgba(42,169,160,0.12),0_0_24px_rgba(42,169,160,0.08)] hover:border-ocean-turquoise/40 disabled:cursor-not-allowed disabled:opacity-50 min-h-touch",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
