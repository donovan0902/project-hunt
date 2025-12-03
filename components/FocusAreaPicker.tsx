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

  // Get selected focus area names from the grouped data
  const getSelectedNames = (): string[] => {
    if (!focusAreasGrouped) return [];
    const allAreas = Object.values(focusAreasGrouped).flat();
    return selectedFocusAreas
      .map((id) => allAreas.find((area) => area._id === id)?.name)
      .filter((name): name is string => !!name);
  };

  if (!focusAreasGrouped) {
    return (
      <Button variant="outline" disabled className="w-full justify-between">
        <span className="text-zinc-500">Loading focus areas...</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </Button>
    );
  }

  const selectedNames = getSelectedNames();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Select focus areas"
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm text-zinc-900 shadow-xs transition-[color,box-shadow]",
            "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-zinc-900/40 focus-visible:border-zinc-900",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          {selectedNames.length === 0 ? (
            <span className="text-muted-foreground">Select focus areas...</span>
          ) : (
            <div className="flex flex-wrap gap-1 overflow-hidden">
              {selectedNames.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[800px] max-h-[480px] overflow-y-auto p-0 border border-zinc-200 shadow-lg"
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

