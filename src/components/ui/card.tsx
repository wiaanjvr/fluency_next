import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { floating?: boolean }
>(({ className, floating = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-3xl border-[1.5px] border-ocean-turquoise/60 bg-card text-card-foreground shadow-[0_4px_16px_rgba(0,0,0,0.12),0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm transition-all duration-400",
      floating && "animate-float",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

// Interactive card with hover lift effect
const CardInteractive = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { floating?: boolean }
>(({ className, floating = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-3xl border-[1.5px] border-ocean-turquoise/60 bg-card text-card-foreground shadow-[0_4px_16px_rgba(0,0,0,0.12),0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.2),0_16px_48px_rgba(0,0,0,0.12),0_0_0_1px_rgba(42,169,160,0.2)] hover:-translate-y-1.5",
      floating && "animate-float",
      className,
    )}
    {...props}
  />
));
CardInteractive.displayName = "CardInteractive";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-2xl font-light leading-none tracking-tight", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground font-light", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-7 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-7 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardInteractive,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
