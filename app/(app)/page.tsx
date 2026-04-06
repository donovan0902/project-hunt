"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, LayoutGroup } from "motion/react";
import React from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCurrentUser } from "@/app/useCurrentUser";
import { ProjectRow } from "@/components/ProjectRow";
import type { ProjectRowData } from "@/lib/types";
import { ArrowBigUp, MessageCircle, PlusCircle } from "lucide-react";
import { SpaceIcon } from "@/components/SpaceIcon";
import { cn } from "@/lib/utils";

type FeedTab = "for-you" | "trending" | "newest";

export default function Home() {
  const { isAuthenticated } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<FeedTab>(
    isAuthenticated ? "for-you" : "trending"
  );

  const toggleUpvote = useMutation(api.projects.toggleUpvote);
  const toggleFollow = useMutation(api.projects.toggleFollow);

  const handleUpvote = async (projectId: Id<"projects">) => {
    try {
      await toggleUpvote({ projectId });
    } catch (error) {
      console.error("Failed to toggle upvote:", error);
      toast.error("Failed to upvote. Please try again.");
    }
  };

  const handleFollow = async (projectId: Id<"projects">) => {
    try {
      await toggleFollow({ projectId });
    } catch (error) {
      console.error("Failed to toggle follow:", error);
      toast.error("Failed to update follow. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-6 pb-16 pt-4">
        <section className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="space-y-2">
            <div className="-mx-4 flex gap-1">
              {isAuthenticated && (
                <button
                  onClick={() => setActiveTab("for-you")}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    activeTab === "for-you"
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  )}
                >
                  For You
                </button>
              )}
              <button
                onClick={() => setActiveTab("trending")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  activeTab === "trending"
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                )}
              >
                Trending
              </button>
              <button
                onClick={() => setActiveTab("newest")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  activeTab === "newest"
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                )}
              >
                Newest
              </button>
            </div>

            <div className="-mx-4 flex items-center justify-between gap-4 rounded-xl border border-border bg-muted px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">
                  Only share things you&apos;d be comfortable posting in a public Teams channel.{" "}
                  <Link
                    href="/guidelines"
                    className="underline underline-offset-2 transition-colors hover:text-foreground"
                  >
                    Content Guidelines
                  </Link>
                </p>
              </div>
              <Link
                href="/submit"
                className="flex-shrink-0 text-emerald-700 transition-colors hover:text-emerald-800"
              >
                <PlusCircle className="h-5 w-5" />
              </Link>
            </div>

            {activeTab === "for-you" && isAuthenticated ? (
              <PersonalizedFeed
                onUpvote={handleUpvote}
                onFollow={handleFollow}
                isAuthenticated={isAuthenticated}
              />
            ) : activeTab === "newest" ? (
              <NewestFeed
                onUpvote={handleUpvote}
                onFollow={handleFollow}
                isAuthenticated={isAuthenticated}
              />
            ) : (
              <TrendingFeed
                onUpvote={handleUpvote}
                onFollow={handleFollow}
                isAuthenticated={isAuthenticated}
              />
            )}
          </div>

          <div className="flex flex-col gap-8">
            <TrendingThreads />
          </div>
        </section>
      </main>
    </div>
  );
}

function PersonalizedFeed({
  onUpvote,
  onFollow,
  isAuthenticated,
}: {
  onUpvote: (id: Id<"projects">) => Promise<void>;
  onFollow: (id: Id<"projects">) => Promise<void>;
  isAuthenticated: boolean;
}) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.projects.listPersonalizedFeed,
    {},
    { initialNumItems: 15 }
  );

  return (
    <FeedList
      results={results}
      status={status}
      loadMore={loadMore}
      onUpvote={onUpvote}
      onFollow={onFollow}
      isAuthenticated={isAuthenticated}
    />
  );
}

function TrendingFeed({
  onUpvote,
  onFollow,
  isAuthenticated,
}: {
  onUpvote: (id: Id<"projects">) => Promise<void>;
  onFollow: (id: Id<"projects">) => Promise<void>;
  isAuthenticated: boolean;
}) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.projects.listPaginated,
    {},
    { initialNumItems: 15 }
  );

  return (
    <FeedList
      results={results}
      status={status}
      loadMore={loadMore}
      onUpvote={onUpvote}
      onFollow={onFollow}
      isAuthenticated={isAuthenticated}
    />
  );
}

function NewestFeed({
  onUpvote,
  onFollow,
  isAuthenticated,
}: {
  onUpvote: (id: Id<"projects">) => Promise<void>;
  onFollow: (id: Id<"projects">) => Promise<void>;
  isAuthenticated: boolean;
}) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.projects.listNewestPaginated,
    {},
    { initialNumItems: 15 }
  );

  return (
    <FeedList
      results={results}
      status={status}
      loadMore={loadMore}
      onUpvote={onUpvote}
      onFollow={onFollow}
      isAuthenticated={isAuthenticated}
    />
  );
}

function FeedList({
  results,
  status,
  loadMore,
  onUpvote,
  onFollow,
  isAuthenticated,
}: {
  results: ProjectRowData[];
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
  loadMore: (numItems: number) => void;
  onUpvote: (id: Id<"projects">) => Promise<void>;
  onFollow: (id: Id<"projects">) => Promise<void>;
  isAuthenticated: boolean;
}) {
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
                    project={project as ProjectRowData}
                    onUpvote={onUpvote}
                    onFollow={onFollow}
                    isAuthenticated={isAuthenticated}
                  />
                </motion.div>
              </React.Fragment>
            ))}
            {/* Infinite scroll sentinel */}
            <div ref={loadMoreRef} className="h-4" />
            {isLoadingMore && (
              <div className="py-4 text-center text-sm text-zinc-500">
                Loading more projects...
              </div>
            )}
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </LayoutGroup>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl bg-zinc-100/60 p-6 text-center text-sm text-zinc-500 space-y-3">
      <p className="font-medium text-zinc-900">The catalog is empty.</p>
      <p className="text-zinc-600">
        Be the first to register a tool.
      </p>
      <Link href="/submit">
        <Button size="sm" className="whitespace-nowrap">
          Register the first tool
        </Button>
      </Link>
    </div>
  );
}

function TrendingThreads() {
  const trendingThreads = useQuery(api.threads.getTrendingThreads, { limit: 5 });
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-3">
        <h3 className="text-lg font-semibold text-zinc-900">Trending Threads</h3>
      </div>

      {!trendingThreads ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-4 bg-zinc-200 rounded w-3/4" />
              <div className="h-3 bg-zinc-200 rounded w-full" />
            </div>
          ))}
        </div>
      ) : trendingThreads.length === 0 ? (
        <p className="text-sm text-zinc-500 px-3">No threads yet.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {trendingThreads.map((thread) => (
            <div
              key={thread._id}
              className="rounded-lg p-3 transition-colors hover:bg-zinc-100 space-y-1.5 cursor-pointer"
              onClick={() => router.push(`/thread/${thread._id}`)}
            >
              {thread.spaceName && thread.spaceId && (
                <Link
                  href={`/space/${thread.spaceId}`}
                  className="flex items-center gap-1 text-xs font-medium text-zinc-600 transition-colors hover:text-green-600"
                  onClick={(e) => e.stopPropagation()}
                >
                  <SpaceIcon
                    icon={thread.spaceIcon ?? undefined}
                    name={thread.spaceName}
                    size="xs"
                  />
                  g/{thread.spaceName}
                </Link>
              )}
              <h4 className="font-semibold text-zinc-900 text-sm leading-tight line-clamp-2">
                {thread.title}
              </h4>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span className="flex items-center gap-0.5">
                  <ArrowBigUp className="h-3.5 w-3.5" fill="none" aria-hidden="true" /> {thread.upvoteCount}
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-0.5">
                  <MessageCircle className="h-3 w-3" /> {thread.commentCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

