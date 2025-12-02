import { Badge } from "@/components/ui/badge";

type ReadinessStatus = "in_progress" | "ready_to_use";

interface ReadinessBadgeProps {
  status: ReadinessStatus | undefined;
  className?: string;
}

export function ReadinessBadge({ status, className }: ReadinessBadgeProps) {
  const effectiveStatus = status ?? "in_progress";

  if (effectiveStatus === "ready_to_use") {
    return (
      <Badge className={`bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 ${className ?? ""}`}>
        Ready to Use
      </Badge>
    );
  }

  return (
    <Badge className={`bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-100 ${className ?? ""}`}>
      In Progress
    </Badge>
  );
}

export function getReadinessStatusDescription(status: ReadinessStatus | undefined): string {
  const effectiveStatus = status ?? "in_progress";
  if (effectiveStatus === "ready_to_use") {
    return "This project is stable, functional, and documented. It's safe for others to use.";
  }
  return "This project is still being built. Features may be incomplete or subject to change.";
}
