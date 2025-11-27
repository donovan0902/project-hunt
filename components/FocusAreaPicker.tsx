"use client";

import { ChevronDown, X } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type FocusArea = {
  _id: Id<"focusAreas">;
  name: string;
  description?: string;
  group: string;
};

type FocusAreasGrouped = Record<string, FocusArea[]>;

interface FocusAreaPickerProps {
  focusAreasGrouped: FocusAreasGrouped | undefined;
  selectedFocusAreas: Id<"focusAreas">[];
  onSelectionChange: (selected: Id<"focusAreas">[]) => void;
}

export function FocusAreaPicker({
  focusAreasGrouped,
  selectedFocusAreas,
  onSelectionChange,
}: FocusAreaPickerProps) {
  const toggleFocusArea = (id: Id<"focusAreas">) => {
    if (selectedFocusAreas.includes(id)) {
      onSelectionChange(selectedFocusAreas.filter((areaId) => areaId !== id));
    } else {
      onSelectionChange([...selectedFocusAreas, id]);
    }
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  if (!focusAreasGrouped) {
    return (
      <Button variant="outline" disabled className="w-full justify-between">
        <span className="text-zinc-500">Loading focus areas...</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between h-auto min-h-9 py-2"
        >
          <span className="text-left truncate">
            {selectedFocusAreas.length === 0 ? (
              <span className="text-zinc-500">Select focus areas...</span>
            ) : (
              <span className="text-zinc-900">
                {selectedFocusAreas.length} selected
              </span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[800px] max-h-[480px] overflow-y-auto p-0"
        align="start"
      >
        {/* Header with clear button */}
        {selectedFocusAreas.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200">
            <span className="text-sm text-zinc-600">
              {selectedFocusAreas.length} selected
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          </div>
        )}

        {/* Domains grid with problem spaces */}
        <div className="p-5 grid grid-cols-2 gap-x-8 gap-y-5">
          {Object.entries(focusAreasGrouped).map(([group, areas]) => (
            <div key={group}>
              <div className="text-sm font-semibold text-zinc-800 mb-2">
                {group}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {areas.map((fa) => {
                  const isSelected = selectedFocusAreas.includes(fa._id);
                  return (
                    <button
                      key={fa._id}
                      type="button"
                      onClick={() => toggleFocusArea(fa._id)}
                      title={fa.description}
                      className={cn(
                        "px-2.5 py-1.5 rounded-md text-xs transition-all",
                        "border",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                          : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300"
                      )}
                    >
                      {fa.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

