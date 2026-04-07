import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReadinessStatus } from "@/lib/types";

interface ReadinessBadgeProps {
  status: ReadinessStatus | undefined;
  className?: string;
}

const statusConfig: Record<string, { dot: string; badge: string; label: string; tooltip: string }> = {
  just_an_idea: {
    dot: "bg-zinc-400",
    badge: "border-zinc-200 bg-zinc-100 text-zinc-600",
    label: "Just an idea",
    tooltip: "Just an idea — not built yet.",
  },
  early_prototype: {
    dot: "bg-amber-400",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    label: "Early prototype",
    tooltip: "Early prototype, feedback welcome.",
  },
  mostly_working: {
    dot: "bg-[#c8d400]",
    badge:
      "border-[#d4e85c] bg-[#f6fce8] text-[#3d4d00]",
    label: "Mostly working",
    tooltip: "Mostly working, still has rough edges.",
  },
  ready_to_use: {
    dot: "bg-green-700",
    badge: "border-green-300 bg-green-50 text-green-900",
    label: "Ready to use",
    tooltip: "Stable and ready to use.",
  },
};

function resolveStatus(status: ReadinessStatus | undefined): string {
  if (!status || status === "in_progress") return "early_prototype";
  return status;
}

export function ReadinessBadge({ status, className }: ReadinessBadgeProps) {
  const resolved = resolveStatus(status);
  const config = statusConfig[resolved];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn("cursor-help gap-1.5", config.badge, className)}
        >
          {config.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-xs">{config.tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function getReadinessStatusDescription(status: ReadinessStatus | undefined): string {
  const resolved = resolveStatus(status);
  return statusConfig[resolved].tooltip;
}
