"use client";

import { use, useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/app/useCurrentUser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CommentForm } from "@/components/CommentForm";
import { CommentThread } from "@/components/CommentThread";
import { ProjectMediaCarousel } from "@/components/ProjectMediaCarousel";
import { ProjectFileDownload } from "@/components/ProjectFileDownload";
import { RichTextContent } from "@/components/RichTextContent";
import { ReadinessBadge } from "@/components/ReadinessBadge";
import { Facepile } from "@/components/Facepile";
import Link from "next/link";
import { ArrowBigUp, Forward, Link2, MousePointerClick, Pencil, Plus, Tag } from "lucide-react";
import { ViewsIcon } from "@/components/ViewsIcon";
import { SpaceIcon } from "@/components/SpaceIcon";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const VIEWER_ID_STORAGE_KEY = "ph_viewer_id";

function getOrCreateViewerId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(VIEWER_ID_STORAGE_KEY);
    if (stored) {
      return stored;
    }

    const created =
      typeof crypto?.randomUUID === "function"
        ? crypto.randomUUID()
        : `viewer_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(VIEWER_ID_STORAGE_KEY, created);
    return created;
  } catch {
    return null;
  }
}

function formatProjectLink(url: string, label?: string): {
  href: string;
  label: string;
} | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  const href = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  if (label?.trim()) {
    return { href, label: label.trim() };
  }
  try {
    const hostname = new URL(href).hostname.replace(/^www\./, "");
    return {
      href,
      label: hostname || trimmed,
    };
  } catch {
    return {
      href,
      label: trimmed,
    };
  }
}

function getProjectLinks(project: { links?: Array<{ url: string; label?: string }> | null }): Array<{ href: string; label: string }> {
  if (!project.links || project.links.length === 0) return [];
  return project.links
    .map((l) => formatProjectLink(l.url, l.label))
    .filter((l): l is NonNullable<typeof l> => l !== null);
}

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const { isAuthenticated, user } = useCurrentUser();
  const projectId = id as Id<"projects">;
  const project = useQuery(api.projects.getById, { projectId });
  const projectMedia = useQuery(api.projects.getProjectMedia, { projectId });
  const projectFiles = useQuery(api.projects.getProjectFiles, { projectId });
  const comments = useQuery(api.comments.getComments, { projectId });
  const toggleUpvote = useMutation(api.projects.toggleUpvote);
  const toggleFollow = useMutation(api.projects.toggleFollow);
  const trackView = useMutation(api.projects.trackView);
  const trackLinkClick = useMutation(api.projects.trackLinkClick);
  const linkClickCounts = useQuery(api.projects.getLinkClickCounts, { projectId });
  const addComment = useMutation(api.comments.addComment);
  const deleteComment = useMutation(api.comments.deleteComment);
  const editComment = useMutation(api.comments.editComment);
  const toggleCommentUpvote = useMutation(api.comments.toggleCommentUpvote);
  const trackedProjectId = useRef<Id<"projects"> | null>(null);

  const versions = useQuery(api.projects.listVersionsByProject, { projectId });
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const activeVersionId =
    versions?.some((version) => version._id === selectedVersionId)
      ? selectedVersionId
      : (versions?.[0]?._id ?? "");
  const selectedVersionFiles = useQuery(
    api.projects.getVersionFiles,
    activeVersionId ? { versionId: activeVersionId as Id<"projectVersions"> } : "skip"
  );

  const isOwner = user && project && project.userId === user._id;
  const [shareOpen, setShareOpen] = useState(false);

  // Get top-level comments (no parent); keep deleted ones that have non-deleted replies
  const topLevelComments =
    comments?.filter((c) => {
      if (c.parentCommentId) return false;
      if (!c.isDeleted) return true;
      return comments.some((r) => r.parentCommentId === c._id && !r.isDeleted);
    }) || [];

  useEffect(() => {
    if (!project) {
      return;
    }

    if (trackedProjectId.current === projectId) {
      return;
    }

    const viewerId = getOrCreateViewerId();
    if (!viewerId) {
      return;
    }

    trackedProjectId.current = projectId;
    void trackView({ projectId, viewerId });
  }, [project, projectId, trackView]);

  const handleUpvote = async () => {
    try {
      await toggleUpvote({ projectId });
    } catch (error) {
      console.error("Failed to toggle upvote:", error);
    }
  };

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setShareOpen(true);
  };

  const handleFollow = async () => {
    try {
      await toggleFollow({ projectId });
    } catch (error) {
      console.error("Failed to toggle follow:", error);
    }
  };

  if (project === undefined) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="text-center text-zinc-500">Loading project...</div>
        </div>
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="text-center">
            <p className="text-xl font-semibold text-zinc-900">
              Project not found
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/")}
            >
              Back to home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const projectLinks = getProjectLinks(project);
  const selectedVersion = versions?.find((v) => v._id === activeVersionId);
  const activeLinks = selectedVersion
    ? getProjectLinks({ links: selectedVersion.links ?? [] })
    : projectLinks;

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto max-w-5xl px-6 pt-4 pb-10">
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {project.focusArea && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={`/space/${project.focusArea._id}`}>
                      g/{project.focusArea.name}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            )}
            <BreadcrumbItem>
              <BreadcrumbPage>{project.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="space-y-8 lg:flex lg:items-start lg:gap-10 lg:space-y-0">
          <section className="flex-1 min-w-0 space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-500 sm:flex-nowrap">
                <div className="flex items-center gap-2">
                  {project.focusArea ? (
                    <SpaceIcon icon={project.focusArea.icon} name={project.focusArea.name} size="md" />
                  ) : (
                    <Avatar className="h-8 w-8 bg-zinc-100 text-xs font-semibold text-zinc-600">
                      <AvatarImage
                        src={project.creatorAvatar}
                        alt={project.creatorName || "User"}
                      />
                      <AvatarFallback>
                        {(project.creatorName || "U").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex flex-col">
                    <div className="flex flex-wrap items-center gap-x-2">
                      {project.focusArea && (
                        <Link
                          href={`/space/${project.focusArea._id}`}
                          className="whitespace-nowrap text-xs font-semibold text-zinc-900 hover:underline"
                        >
                          g/{project.focusArea.name}
                        </Link>
                      )}
                      {project.additionalFocusAreas && project.additionalFocusAreas.length > 0 && (
                        project.additionalFocusAreas.map((space) => (
                          <Link
                            key={space._id}
                            href={`/space/${space._id}`}
                            className="flex items-center gap-0.5 whitespace-nowrap text-xs text-zinc-400 hover:text-zinc-700 hover:underline"
                          >
                            <SpaceIcon icon={space.icon} name={space.name} size="sm" />
                            g/{space.name}
                          </Link>
                        ))
                      )}
                    </div>
                    <Link
                      href={`/profile/${project.userId}`}
                      className="whitespace-nowrap text-xs text-zinc-900 hover:underline"
                    >
                      u/{project.creatorName || "Unknown User"}
                    </Link>
                  </div>
                </div>
                {isOwner && (
                  <div className="flex items-center gap-1 text-xs text-zinc-400">
                    <ViewsIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {project.viewCount ?? 0} views
                  </div>
                )}
              </div>

              <div className="relative">
                {isOwner && (
                  <Button
                    variant="ghost"
                    onClick={() => router.push(`/project/${id}/edit`)}
                    className="absolute -left-20 top-0"
                    size="icon"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold text-zinc-900">
                    {project.name}
                  </h1>
                  <ReadinessBadge status={project.readinessStatus} />
                </div>
              </div>
              {projectMedia && projectMedia.length > 0 && (
                <div className="mt-2">
                  <ProjectMediaCarousel media={projectMedia} />
                </div>
              )}

              {project.summary && (
                <RichTextContent html={project.summary} />
              )}
            </div>

            <div id="discussion" className="space-y-6">
              <div className="space-y-4">
                <CommentForm
                  onSubmit={(content) => addComment({ projectId, content })}
                />
                {comments === undefined ? (
                  <div className="py-8 text-center text-sm text-zinc-500">
                    Loading comments...
                  </div>
                ) : topLevelComments.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm text-zinc-500">
                      No comments yet. Start the conversation?
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topLevelComments.map((comment) => (
                      <CommentThread
                        key={comment._id}
                        comment={comment}
                        allComments={comments}
                        onDelete={(id) => deleteComment({ commentId: id as Id<"comments"> })}
                        onToggleUpvote={(id) => toggleCommentUpvote({ commentId: id as Id<"comments"> })}
                        onSubmitReply={(content, parentId) => addComment({ projectId, content, parentCommentId: parentId as Id<"comments"> })}
                        onEdit={(id, content) => editComment({ commentId: id as Id<"comments">, content })}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="w-full lg:w-72 xl:w-80">
            <div className="rounded-lg bg-zinc-100 p-4">
              <div className="space-y-6">
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <Facepile
                        followers={project.followers}
                        totalCount={project.followerCount}
                        maxVisible={3}
                        size="sm"
                        hasFollowed={project.hasFollowed}
                        showLabel={true}
                        currentUser={
                          user
                            ? {
                                _id: user._id,
                                name: user.name,
                                avatarUrl: user.avatarUrlId || "",
                              }
                            : null
                        }
                        isAuthenticated={isAuthenticated}
                        onToggle={handleFollow}
                        projectId={projectId}
                      />
                      {isAuthenticated ? (
                        <motion.div
                          whileTap={{ scale: 1.1, rotate: -2 }}
                          transition={{
                            type: "spring",
                            stiffness: 700,
                            damping: 20,
                          }}
                        >
                          <Button
                            variant="ghost"
                            onClick={handleUpvote}
                            className={`group h-9 rounded-md px-3 text-sm font-semibold flex items-center gap-1.5 border shadow-sm ${project.hasUpvoted ? "!bg-emerald-100 border-emerald-300/70 hover:!bg-emerald-200 active:!bg-emerald-300 text-emerald-700 hover:text-emerald-800" : "!bg-zinc-200 border-zinc-300/80 hover:!bg-zinc-300 active:!bg-zinc-400 text-zinc-700 hover:text-emerald-700"}`}
                          >
                            <ArrowBigUp
                              className={`h-4 w-4 transition-colors ${project.hasUpvoted ? "" : "text-zinc-700 group-hover:text-emerald-700"}`}
                              fill={project.hasUpvoted ? "currentColor" : "none"}
                              aria-hidden="true"
                            />
                            <span>{project.upvotes}</span>
                          </Button>
                        </motion.div>
                      ) : (
                        <motion.div
                          whileTap={{ scale: 1.1, rotate: -2 }}
                          transition={{
                            type: "spring",
                            stiffness: 700,
                            damping: 20,
                          }}
                        >
                          <Button
                            variant="outline"
                            className="h-9 rounded-md px-3 text-sm font-semibold border border-zinc-300/80 shadow-sm !bg-zinc-200 hover:!bg-zinc-300 active:!bg-zinc-400 !text-zinc-700"
                            asChild
                          >
                            <Link href="/sign-in" prefetch={false}>
                              <ArrowBigUp className="h-4 w-4" fill="none" aria-hidden="true" />
                              <span>{project.upvotes}</span>
                            </Link>
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Button
                    variant="outline"
                    className="w-full gap-2 rounded-full !bg-zinc-200 hover:!bg-zinc-300 active:!bg-zinc-400 !text-zinc-700"
                    onClick={handleShare}
                  >
                    <Forward className="h-4 w-4" />
                    Share
                  </Button>
                </div>

                {((versions && versions.length > 0) || isOwner) && (
                  <div className="min-w-0 space-y-3 border-t border-zinc-300 pt-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-zinc-800">
                        Versions
                      </p>
                      {isOwner && (
                        <Link
                          href={`/project/${id}/versions/new`}
                          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800"
                        >
                          <Plus className="h-3 w-3" />
                          New
                        </Link>
                      )}
                    </div>
                    {versions && versions.length > 0 && (
                      <>
                        <Tabs value={activeVersionId} onValueChange={setSelectedVersionId}>
                          <TabsList variant="line" className="h-auto max-w-full justify-start overflow-x-auto flex-nowrap gap-1 bg-transparent p-0 pb-1">
                            {versions.map((version) => (
                              <TabsTrigger key={version._id} value={version._id} className="text-xs px-2.5 py-0.5 shrink-0">
                                <Tag className="h-3 w-3 mr-1" />
                                {version.tag}
                              </TabsTrigger>
                            ))}
                          </TabsList>
                        </Tabs>
                        <Link
                          href={`/project/${id}/versions`}
                          className="text-xs text-zinc-400 hover:text-zinc-700"
                        >
                          View all releases →
                        </Link>
                      </>
                    )}
                  </div>
                )}

                {(() => {
                  const filesToShow = activeVersionId ? (selectedVersionFiles ?? []) : (projectFiles ?? []);
                  return (activeLinks.length > 0 || filesToShow.length > 0) && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-zinc-800">
                          Links &amp; Downloads
                        </p>
                        <MousePointerClick className="h-4 w-4 text-zinc-500" aria-label="Click counts" />
                      </div>
                      <div className="space-y-2">
                        {filesToShow.length > 0 && (
                          <ProjectFileDownload
                            files={filesToShow}
                            projectId={projectId}
                            clickCounts={linkClickCounts ?? {}}
                          />
                        )}
                        {activeLinks.map((pl, i) => {
                          const count = linkClickCounts?.[pl.href] ?? 0;
                          return (
                            <a
                              key={i}
                              href={pl.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-700 hover:underline"
                              onClick={() => void trackLinkClick({ projectId, resourceId: pl.href, resourceType: "link" })}
                            >
                              <Link2 className="h-4 w-4 text-zinc-400 shrink-0" aria-hidden="true" />
                              <span className="flex-1 min-w-0 truncate">{pl.label}</span>
                              {count > 0 && (
                                <span className="text-zinc-500 shrink-0 ml-auto pl-2">{count}</span>
                              )}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link copied!</DialogTitle>
            <DialogDescription>
              The link to this project has been copied to your clipboard.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
