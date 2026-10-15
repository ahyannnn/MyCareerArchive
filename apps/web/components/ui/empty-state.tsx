import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("mx-auto max-w-md px-6 py-12 text-center", className)}
    >
      <Icon className="mx-auto size-12 text-muted-foreground" strokeWidth={1.5} />
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      {description && (
        <p className="mt-2 text-balance text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">{action}</div>}
    </div>
  );
}
