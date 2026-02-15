import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[100px] w-full rounded-2xl border-[1.5px] border-border/50 bg-background px-5 py-4 text-sm font-light transition-all duration-300 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:border-library-brass focus-visible:shadow-[0_0_0_4px_rgba(212,175,106,0.15),0_0_20px_rgba(212,175,106,0.1)] disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
