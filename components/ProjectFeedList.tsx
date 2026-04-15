"use client";

import { useCallback, useEffect, useRef } from "react";
import React from "react";
import { motion, LayoutGroup } from "motion/react";

import { Id } from "@/convex/_generated/dataModel";
import { ProjectRow } from "@/components/ProjectRow";
import { Separator } from "@/components/ui/separator";
import type { ProjectRowData } from "@/lib/types";

interface ProjectFeedListProps {
  results: ProjectRowData[];
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
  loadMore: (numItems: number) => void;
  onUpvote: (id: Id<"projects">) => Promise<void>;
  onFollow: (id: Id<"projects">) => Promise<void>;
  isAuthenticated: boolean;
  hideSpaceLabel?: boolean;
  emptyState: React.ReactNode;
}

export function ProjectFeedList({
  results,
  status,
  loadMore,
  onUpvote,
  onFollow,
  isAuthenticated,
  hideSpaceLabel,
  emptyState,
}: ProjectFeedListProps) {
  const isLoading = status === "LoadingFirstPage";
  const canLoadMore = status === "CanLoadMore";
  const isLoadingMore = status === "LoadingMore";
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadMoreCallback = useCallback(() => {
    if (canLoadMore) {
      loadMore(15);
    }
  }, [canLoadMore, loadMore]);

  useEffect(() => {
    if (!canLoadMore || !loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreCallback();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [canLoadMore, loadMoreCallback]);

  return (
    <LayoutGroup>
      <div className="space-y-0">
        {isLoading ? (
          <div className="py-8 text-center text-sm text-zinc-500">
            Loading projects...
          </div>
        ) : results.length ? (
          <>
            {results.map((project, index) => (
              <React.Fragment key={project._id}>
                {index > 0 && <Separator className="bg-zinc-200" />}
                <motion.div
                  layout
                  layoutId={project._id}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                >
                  <ProjectRow
                    project={project}
                    onUpvote={onUpvote}
                    onFollow={onFollow}
                    isAuthenticated={isAuthenticated}
                    hideSpaceLabel={hideSpaceLabel}
                  />
                </motion.div>
              </React.Fragment>
            ))}
            <div ref={loadMoreRef} className="h-4" />
            {isLoadingMore && (
              <div className="py-4 text-center text-sm text-zinc-500">
                Loading more projects...
              </div>
            )}
          </>
        ) : (
          emptyState
        )}
      </div>
    </LayoutGroup>
  );
}
