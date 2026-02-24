import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white/[0.04] relative overflow-hidden",
        className,
      )}
      {...props}
    >
      <div className="absolute inset-0 skeleton-shimmer" />
    </div>
  );
}

export { Skeleton };
