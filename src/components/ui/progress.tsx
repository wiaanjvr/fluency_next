import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.ComponentPropsWithoutRef<
  typeof ProgressPrimitive.Root
> {
  animated?: boolean;
  showShine?: boolean;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, animated = true, showShine = true, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-3 w-full overflow-hidden rounded-full bg-secondary",
      className,
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        "h-full w-full flex-1 bg-gradient-to-r from-library-brass to-library-gold rounded-full",
        animated && "transition-all duration-1000 ease-out",
      )}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    >
      {/* Shine effect */}
      {showShine && (value || 0) > 0 && (
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
            animation: "progressShine 2s ease-in-out infinite",
          }}
        />
      )}
    </ProgressPrimitive.Indicator>
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
