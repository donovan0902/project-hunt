import { Badge } from "@/components/ui/badge";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

type FocusArea = {
  _id: Id<"focusAreas">;
  name: string;
  group: string;
};

export function FocusAreaBadges({
  focusAreas,
  className,
}: {
  focusAreas: FocusArea[];
  className?: string;
}) {
  if (!focusAreas || focusAreas.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-nowrap items-center gap-2 overflow-x-auto pr-1",
        "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      aria-label="Project focus areas"
    >
      {focusAreas.map((area) => (
        <Badge
          key={area._id}
          variant="secondary"
          className="border border-zinc-200 bg-white text-zinc-700 shrink-0"
        >
          {area.name}
        </Badge>
      ))}
    </div>
  );
}
