import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-primary/10 animate-shimmer",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
