import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ReadinessStatus = "in_progress" | "ready_to_use";

interface ReadinessBadgeProps {
  status: ReadinessStatus | undefined;
  className?: string;
}

export function ReadinessBadge({ status, className }: ReadinessBadgeProps) {
  const effectiveStatus = status ?? "in_progress";
  const description = getReadinessStatusDescription(effectiveStatus);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {effectiveStatus === "ready_to_use" ? (
          <Badge className={`bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-50 cursor-help ${className ?? ""}`}>
            Ready to Use
          </Badge>
        ) : (
          <Badge className={`bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-50 cursor-help ${className ?? ""}`}>
            In Progress
          </Badge>
        )}
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-xs">{description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function getReadinessStatusDescription(status: ReadinessStatus | undefined): string {
  const effectiveStatus = status ?? "in_progress";
  if (effectiveStatus === "ready_to_use") {
    return "This project is stable, functional, and documented. It's safe for others to use.";
  }
  return "This project is still being built. Features may be incomplete or subject to change.";
}
