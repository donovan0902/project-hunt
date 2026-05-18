"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import React from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUser } from "@/app/useCurrentUser";
import { ProjectFeedList } from "@/components/ProjectFeedList";
import {
  ProjectFeedViewToggle,
  type CatalogSurfaceView,
} from "@/components/ProjectFeedViewToggle";
import type { FocusArea, ProjectRowData } from "@/lib/types";
import { ArrowBigUp, MessageCircle, PlusCircle } from "lucide-react";
import { SpaceIcon } from "@/components/SpaceIcon";
import { cn } from "@/lib/utils";

type FeedTab = "for-you" | "trending" | "newest";

export default function Home() {
  const { isAuthenticated } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<FeedTab | null>(null);
  const [viewMode, setViewMode] = useState<CatalogSurfaceView>("feed");
  const listingTabsDisabled = viewMode === "catalog";

  // Derive effective tab: user's explicit choice if set, otherwise default based on auth.
  // Coerce "for-you" to "trending" when unauthenticated (e.g., after sign-out).
  const effectiveTab: FeedTab =
    activeTab === "for-you" && !isAuthenticated
      ? "trending"
      : activeTab ?? (isAuthenticated ? "for-you" : "trending");

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
            <div className="-mx-4 flex items-center justify-between gap-3">
              <Tabs
                value={effectiveTab}
                onValueChange={(value) => setActiveTab(value as FeedTab)}
              >
                <TabsList className="gap-0 bg-transparent p-0">
                  {isAuthenticated && (
                    <TabsTrigger
                      value="for-you"
                      disabled={listingTabsDisabled}
                      className={cn(
                        "h-auto flex-none rounded-md border-0 px-3 py-1.5 after:hidden",
                        "data-[state=active]:bg-zinc-200 data-[state=active]:text-zinc-900 hover:bg-zinc-100 hover:text-zinc-900",
                        "text-zinc-600 disabled:pointer-events-none disabled:opacity-50"
                      )}
                    >
                      Recommended
                    </TabsTrigger>
                  )}
                  <TabsTrigger
                    value="trending"
                    disabled={listingTabsDisabled}
                    className={cn(
                      "h-auto flex-none rounded-md border-0 px-3 py-1.5 after:hidden",
                      "data-[state=active]:bg-zinc-200 data-[state=active]:text-zinc-900 hover:bg-zinc-100 hover:text-zinc-900",
                      "text-zinc-600 disabled:pointer-events-none disabled:opacity-50"
                    )}
                  >
                    Trending
                  </TabsTrigger>
                  <TabsTrigger
                    value="newest"
                    disabled={listingTabsDisabled}
                    className={cn(
                      "h-auto flex-none rounded-md border-0 px-3 py-1.5 after:hidden",
                      "data-[state=active]:bg-zinc-200 data-[state=active]:text-zinc-900 hover:bg-zinc-100 hover:text-zinc-900",
                      "text-zinc-600 disabled:pointer-events-none disabled:opacity-50"
                    )}
                  >
                    Newest
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <ProjectFeedViewToggle
                viewMode={viewMode}
                onChange={setViewMode}
                className="flex-shrink-0"
              />
            </div>

            <div className="-mx-4 flex items-center justify-between gap-4 rounded-xl border border-border bg-muted px-4 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-foreground">
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
            {viewMode === "catalog" ? (
              <CatalogDirectory />
            ) : effectiveTab === "for-you" && isAuthenticated ? (
              <PersonalizedFeed
                onUpvote={handleUpvote}
                onFollow={handleFollow}
                isAuthenticated={isAuthenticated}
              />
            ) : effectiveTab === "newest" ? (
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

          <div className="flex flex-col gap-8 self-start rounded-xl border border-zinc-200 bg-white p-5 shadow-sm lg:sticky lg:top-20">
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
  return (
    <ProjectFeedList
      results={results}
      status={status}
      loadMore={loadMore}
      onUpvote={onUpvote}
      onFollow={onFollow}
      isAuthenticated={isAuthenticated}
      emptyState={<EmptyState />}
    />
  );
}

type CatalogProject = {
  _id: Id<"projects">;
  name: string;
  spaces: FocusArea[];
};

function CatalogDirectory() {
  const catalogProjects = useQuery(api.projects.listCatalog, {});

  if (catalogProjects === undefined) {
    return (
      <div className="py-8 text-center text-sm text-zinc-500">
        Loading catalog...
      </div>
    );
  }

  if (catalogProjects.length === 0) {
    return <EmptyState />;
  }

  const groups = buildCatalogGroups(catalogProjects);

  return (
    <div className="mt-6 space-y-10">
      {groups.map((group) => (
        <section key={group.key} className="space-y-4">
          <div className="mb-4 flex items-center gap-2">
            {group.space && (
              <SpaceIcon
                icon={group.space.icon}
                name={group.space.name}
                size="sm"
              />
            )}
            <h3 className="text-lg font-semibold text-zinc-900">
              {group.name}
            </h3>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,200px))] gap-x-0 gap-y-2">
            {group.projects.map((project) => (
              <Link
                key={project._id}
                href={`/project/${project._id}`}
                className="block max-w-[160px] truncate py-1 text-sm text-zinc-700 transition-colors hover:text-zinc-900 hover:underline"
                title={project.name}
              >
                {project.name}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function buildCatalogGroups(projects: CatalogProject[]) {
  const groups = new Map<
    string,
    { key: string; name: string; space: FocusArea | null; projects: CatalogProject[] }
  >();

  for (const project of projects) {
    if (project.spaces.length === 0) {
      const fallbackKey = "unassigned";
      const existingGroup = groups.get(fallbackKey);
      if (existingGroup) {
        existingGroup.projects.push(project);
      } else {
        groups.set(fallbackKey, {
          key: fallbackKey,
          name: "Other",
          space: null,
          projects: [project],
        });
      }
      continue;
    }

    for (const space of project.spaces) {
      const key = space._id;
      const existingGroup = groups.get(key);
      if (existingGroup) {
        existingGroup.projects.push(project);
      } else {
        groups.set(key, {
          key,
          name: space.name,
          space,
          projects: [project],
        });
      }
    }
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      projects: group.projects.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
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
