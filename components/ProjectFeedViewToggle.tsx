"use client";

import { LibraryBig, List } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    <Tabs
      value={viewMode}
      onValueChange={(value) => onChange(value as CatalogSurfaceView)}
      className={className}
    >
      <TabsList className={cn("gap-0 bg-transparent p-0")}>
        <TabsTrigger
          value="feed"
          aria-label="Feed view"
          title="Feed"
          className={cn(
            "h-auto flex-none rounded-md border-0 p-2 transition-colors after:hidden",
            "data-[state=active]:bg-zinc-200 data-[state=active]:text-zinc-900 hover:bg-zinc-100 hover:text-zinc-900",
            "text-zinc-600"
          )}
        >
          <List className="h-4 w-4" />
        </TabsTrigger>
        <TabsTrigger
          value="catalog"
          aria-label="Catalog view"
          title="Catalog"
          className={cn(
            "h-auto flex-none rounded-md border-0 p-2 transition-colors after:hidden",
            "data-[state=active]:bg-zinc-200 data-[state=active]:text-zinc-900 hover:bg-zinc-100 hover:text-zinc-900",
            "text-zinc-600"
          )}
        >
          <LibraryBig className="h-4 w-4" />
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
