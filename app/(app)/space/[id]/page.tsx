"use client";

import { use, useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, LayoutGroup } from "motion/react";
import React from "react";
import Link from "next/link";

import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/app/useCurrentUser";
import { ProjectFeedList } from "@/components/ProjectFeedList";
import { ThreadRow } from "@/components/ThreadRow";
import { CreateThreadForm } from "@/components/CreateThreadForm";
import type { ProjectRowData, ThreadRowData } from "@/lib/types";
import { SpaceIcon } from "@/components/SpaceIcon";
import { ArrowBigUp, Users, MessageCircle } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

export default function SpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const focusAreaId = id as Id<"focusAreas">;

  const focusArea = useQuery(api.focusAreas.getById, { id: focusAreaId });
  const { isAuthenticated } = useCurrentUser();
  const isFollowing = useQuery(api.focusAreas.isFollowingSpace, { focusAreaId });
  const memberCount = useQuery(api.focusAreas.getMemberCount, { focusAreaId });
  const toggleFollowSpace = useMutation(api.focusAreas.toggleFollowSpace);
  const toggleUpvote = useMutation(api.projects.toggleUpvote);
  const toggleProjectFollow = useMutation(api.projects.toggleFollow);
  const toggleThreadUpvote = useMutation(api.threads.toggleUpvote);
  const topThreads = useQuery(api.threads.getTopThreadsBySpace, { focusAreaId });
  const topProjects = useQuery(api.projects.getTopProjectsBySpace, { focusAreaId });

  const [activeTab, setActiveTab] = useState("projects");

  // Projects pagination
  const {
    results: projectResults,
    status: projectStatus,
    loadMore: loadMoreProjects,
  } = usePaginatedQuery(
    api.projects.listPaginatedBySpaceMembership,
    { focusAreaId },
    { initialNumItems: 15 }
  );

  // Threads pagination
  const {
    results: threadResults,
    status: threadStatus,
    loadMore: loadMoreThreads,
  } = usePaginatedQuery(
    api.threads.listPaginatedBySpace,
    { focusAreaId },
    { initialNumItems: 15 }
  );

  // Threads loading states
  const isLoadingThreads = threadStatus === "LoadingFirstPage";
  const canLoadMoreThreads = threadStatus === "CanLoadMore";
  const isLoadingMoreThreads = threadStatus === "LoadingMore";

  // Threads infinite scroll
  const threadLoadMoreRef = useRef<HTMLDivElement>(null);
  const loadMoreThreadsCallback = useCallback(() => {
    if (canLoadMoreThreads) {
      loadMoreThreads(15);
    }
  }, [canLoadMoreThreads, loadMoreThreads]);

  useEffect(() => {
    if (!canLoadMoreThreads || !threadLoadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreThreadsCallback();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(threadLoadMoreRef.current);
    return () => observer.disconnect();
  }, [canLoadMoreThreads, loadMoreThreadsCallback]);

  const handleFollowSpace = async () => {
    try {
      await toggleFollowSpace({ focusAreaId });
    } catch (error) {
      console.error("Failed to toggle follow:", error);
      toast.error("Failed to update membership. Please try again.");
    }
  };

  const handleUpvote = async (projectId: Id<"projects">) => {
    try {
      await toggleUpvote({ projectId });
    } catch (error) {
      console.error("Failed to toggle upvote:", error);
      toast.error("Failed to upvote. Please try again.");
    }
  };

  const handleProjectFollow = async (projectId: Id<"projects">) => {
    try {
      await toggleProjectFollow({ projectId });
    } catch (error) {
      console.error("Failed to toggle follow:", error);
      toast.error("Failed to update follow. Please try again.");
    }
  };

  const handleThreadUpvote = async (threadId: Id<"threads">) => {
    try {
      await toggleThreadUpvote({ threadId });
    } catch (error) {
      console.error("Failed to toggle upvote:", error);
      toast.error("Failed to upvote. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto w-full max-w-[1400px] px-6 pb-16 pt-4">
        {focusArea && (
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>g/{focusArea.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )}
        <div className="space-y-6">
          {/* Full-width space header */}
          <div className="space-y-2 lg:flex lg:items-start lg:justify-between lg:gap-10 lg:space-y-0">
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-3">
                {focusArea && <SpaceIcon icon={focusArea.icon} name={focusArea.name} size="md" />}
                <h2 className="text-3xl font-semibold tracking-tight">
                  {focusArea?.name ?? "Loading..."}
                </h2>
              </div>
              {focusArea?.description && (
                <p className="text-sm text-zinc-500">{focusArea.description}</p>
              )}
            </div>
            <div className="hidden lg:flex lg:w-72 xl:w-80 lg:items-center lg:justify-end lg:gap-4">
              <div className="flex items-center gap-1.5 text-sm text-zinc-500">
                <Users className="h-4 w-4" />
                <span>{memberCount ?? 0} members</span>
              </div>
              {isAuthenticated ? (
                <Button
                  variant={isFollowing ? "default" : "outline"}
                  size="sm"
                  onClick={handleFollowSpace}
                >
                  {isFollowing ? "Joined" : "Join"}
                </Button>
              ) : (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/sign-in" prefetch={false}>
                    Join
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Two-column: feed + sidebar */}
          <div className="lg:flex lg:items-start lg:gap-10">
            <section className="flex-1 min-w-0 space-y-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab("projects")}
                className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${
                  activeTab === "projects"
                    ? "text-zinc-900 border-zinc-900"
                    : "text-zinc-400 border-transparent hover:text-zinc-600"
                }`}
              >
                Projects
              </button>
              <button
                onClick={() => setActiveTab("threads")}
                className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${
                  activeTab === "threads"
                    ? "text-zinc-900 border-zinc-900"
                    : "text-zinc-400 border-transparent hover:text-zinc-600"
                }`}
              >
                Threads
              </button>
            </div>
            {activeTab === "projects" ? (
              <div className="space-y-4">
                <ProjectFeedList
                  results={projectResults as ProjectRowData[]}
                  status={projectStatus}
                  loadMore={loadMoreProjects}
                  onUpvote={handleUpvote}
                  onFollow={handleProjectFollow}
                  isAuthenticated={isAuthenticated}
                  hideSpaceLabel
                  emptyState={
                    <div className="rounded-3xl bg-zinc-100/60 p-6 text-center text-sm text-zinc-500 space-y-3">
                      <p className="font-medium text-zinc-900">
                        No projects in this space yet.
                      </p>
                    </div>
                  }
                />
              </div>
            ) : (
              <div className="space-y-4">
                {isAuthenticated && (
                  <CreateThreadForm focusAreaId={focusAreaId} />
                )}

                <LayoutGroup>
                  <div className="space-y-0">
                    {isLoadingThreads ? (
                      <div className="py-8 text-center text-sm text-zinc-500">
                        Loading threads...
                      </div>
                    ) : threadResults.length ? (
                      <>
                        {threadResults.map((thread, index) => (
                          <React.Fragment key={thread._id}>
                            {index > 0 && (
                              <Separator className="bg-zinc-200" />
                            )}
                            <motion.div
                              layout
                              layoutId={thread._id}
                              transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 35,
                              }}
                            >
                              <ThreadRow
                                thread={thread as ThreadRowData}
                                onUpvote={handleThreadUpvote}
                                isAuthenticated={isAuthenticated}
                              />
                            </motion.div>
                          </React.Fragment>
                        ))}
                        <div ref={threadLoadMoreRef} className="h-4" />
                        {isLoadingMoreThreads && (
                          <div className="py-4 text-center text-sm text-zinc-500">
                            Loading more threads...
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="rounded-3xl bg-zinc-100/60 p-6 text-center text-sm text-zinc-500 space-y-3">
                        <p className="font-medium text-zinc-900">
                          No threads in this space yet.
                        </p>
                        <p>Start a conversation to get things going.</p>
                      </div>
                    )}
                  </div>
                </LayoutGroup>
              </div>
            )}
            </section>

            <aside className="w-full lg:sticky lg:top-20 lg:w-72 xl:w-80">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm space-y-4">
              {/* Member count + join */}
              <div className="flex items-center justify-between lg:hidden">
                <div className="flex items-center gap-1.5 text-sm text-zinc-500">
                  <Users className="h-4 w-4" />
                  <span>{memberCount ?? 0} members</span>
                </div>
                {isAuthenticated ? (
                  <Button variant={isFollowing ? "default" : "outline"} size="sm" onClick={handleFollowSpace}>
                    {isFollowing ? "Joined" : "Join"}
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/sign-in" prefetch={false}>Join</Link>
                  </Button>
                )}
              </div>
              {/* Context-aware cross-promotion */}
              {activeTab === "projects" ? (
                <div>
                  <p className="text-sm font-semibold text-zinc-700 mb-3">
                    Threads
                  </p>

                  {topThreads === undefined ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse space-y-1">
                          <div className="h-3 bg-zinc-200 rounded w-3/4" />
                          <div className="h-2 bg-zinc-200 rounded w-1/2" />
                        </div>
                      ))}
                    </div>
                  ) : topThreads.length === 0 ? (
                    <p className="text-sm text-zinc-500">No threads yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {topThreads.map((thread) => (
                        <Link
                          key={thread._id}
                          href={`/thread/${thread._id}`}
                          className="block rounded-md px-2 py-2 -mx-2 hover:bg-zinc-50 transition-colors"
                        >
                          <h4 className="text-sm font-medium text-zinc-900 line-clamp-2 leading-tight">
                            {thread.title}
                          </h4>
                          <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                            <span className="flex items-center gap-0.5">
                              <ArrowBigUp className="h-3.5 w-3.5" fill="none" aria-hidden="true" />
                              {thread.upvoteCount}
                            </span>
                            <span className="text-zinc-300">&bull;</span>
                            <span className="flex items-center gap-0.5">
                              <MessageCircle className="h-3 w-3" /> {thread.commentCount}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  <div className="mt-3">
                    <button
                      onClick={() => setActiveTab("threads")}
                      className="text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
                    >
                      View all threads
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-zinc-700 mb-3">
                    Projects
                  </p>

                  {topProjects === undefined ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse space-y-1">
                          <div className="h-3 bg-zinc-200 rounded w-3/4" />
                          <div className="h-2 bg-zinc-200 rounded w-1/2" />
                        </div>
                      ))}
                    </div>
                  ) : topProjects.length === 0 ? (
                    <p className="text-sm text-zinc-500">No projects yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {topProjects.map((project) => (
                        <Link
                          key={project._id}
                          href={`/project/${project._id}`}
                          className="block rounded-md px-2 py-2 -mx-2 hover:bg-zinc-50 transition-colors"
                        >
                          <h4 className="text-sm font-medium text-zinc-900 line-clamp-2 leading-tight">
                            {project.name}
                          </h4>
                          <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                            <span className="flex items-center gap-0.5">
                              <ArrowBigUp className="h-3.5 w-3.5" fill="none" aria-hidden="true" />
                              {project.upvoteCount}
                            </span>
                            <span className="text-zinc-300">&bull;</span>
                            <span className="flex items-center gap-0.5">
                              <MessageCircle className="h-3 w-3" /> {project.commentCount}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  <div className="mt-3">
                    <button
                      onClick={() => setActiveTab("projects")}
                      className="text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
                    >
                      View all projects
                    </button>
                  </div>
                </div>
              )}
            </div>
            </aside>
          </div>
        </div>

      </main>
    </div>
  );
}
