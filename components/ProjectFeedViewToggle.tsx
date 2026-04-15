"use client";

import { LibraryBig, List } from "lucide-react";

import { cn } from "@/lib/utils";

export type CatalogSurfaceView = "feed" | "catalog";

interface ProjectFeedViewToggleProps {
  viewMode: CatalogSurfaceView;
  onChange: (view: CatalogSurfaceView) => void;
  className?: string;
}

export function ProjectFeedViewToggle({
  viewMode,
  onChange,
  className,
}: ProjectFeedViewToggleProps) {
  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <button
        type="button"
        onClick={() => onChange("feed")}
        aria-label="Feed view"
        title="Feed"
        className={cn(
          "rounded-md p-2 text-sm font-medium transition-colors",
          viewMode === "feed"
            ? "bg-zinc-200 text-zinc-900 hover:bg-zinc-300"
            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        )}
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange("catalog")}
        aria-label="Catalog view"
        title="Catalog"
        className={cn(
          "rounded-md p-2 text-sm font-medium transition-colors",
          viewMode === "catalog"
            ? "bg-zinc-200 text-zinc-900 hover:bg-zinc-300"
            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        )}
      >
        <LibraryBig className="h-4 w-4" />
      </button>
    </div>
  );
}
