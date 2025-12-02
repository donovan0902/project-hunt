"use client";

import { use } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCurrentUser } from "@/app/useCurrentUser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CommentForm } from "@/components/CommentForm";
import { CommentThread } from "@/components/CommentThread";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { FocusAreaBadges } from "@/components/FocusAreaBadges";
import { ReadinessBadge, getReadinessStatusDescription } from "@/components/ReadinessBadge";
import Link from "next/link";

function MediaCarousel({
  mediaFiles,
}: {
  mediaFiles: Array<{
    _id: Id<"mediaFiles">;
    storageId: Id<"_storage">;
    type: string;
  }>;
}) {
  if (!mediaFiles || mediaFiles.length === 0) {
    return null;
  }

  return (
    <Carousel className="w-full">
      <CarouselContent>
        {mediaFiles.map((media) => (
          <CarouselItem key={media._id}>
            <MediaSlide media={media} />
          </CarouselItem>
        ))}
      </CarouselContent>
      {mediaFiles.length > 1 && (
        <>
          <CarouselPrevious />
          <CarouselNext />
        </>
      )}
    </Carousel>
  );
}

function MediaSlide({
  media,
}: {
  media: {
    storageId: Id<"_storage">;
    type: string;
  };
}) {
  const mediaUrl = useQuery(api.projects.getMediaUrl, {
    storageId: media.storageId,
  });

  if (!mediaUrl) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-zinc-100"
        style={{ minHeight: "400px" }}
      >
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  const isVideo = media.type === "video";

  return (
    <div className="px-2">
      {isVideo ? (
        <video
          src={mediaUrl}
          controls
          className="mx-auto h-auto w-full max-h-[600px] rounded-lg"
          style={{ objectFit: "contain" }}
        />
      ) : (
        <div
          className="relative mx-auto w-full"
          style={{ minHeight: "400px", maxHeight: "600px" }}
        >
          <Image
            src={mediaUrl}
            alt="Project media"
            fill
            className="object-contain rounded-lg"
            unoptimized
          />
        </div>
      )}
    </div>
  );
}

function formatProjectLink(link?: string | null): {
  href: string;
  label: string;
} | null {
  if (!link) {
    return null;
  }

  const trimmed = link.trim();
  if (!trimmed) {
    return null;
  }

  const href = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
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
  const comments = useQuery(api.comments.getComments, { projectId });
  const toggleUpvote = useMutation(api.projects.toggleUpvote);

  const isOwner = user && project && project.userId === user._id;

  // Get top-level comments (no parent)
  const topLevelComments =
    comments?.filter((c) => !c.parentCommentId && !c.isDeleted) || [];

  const handleUpvote = async () => {
    try {
      await toggleUpvote({ projectId });
    } catch (error) {
      console.error("Failed to toggle upvote:", error);
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

  const projectLink = formatProjectLink(project.link);

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="space-y-8">
          <div className="flex items-start justify-between gap-6">
            <div className="relative flex-1">
              {isOwner && (
                <Button
                  variant="outline"
                  onClick={() => router.push(`/project/${id}/edit`)}
                  className="absolute -left-20 top-0"
                >
                  Edit
                </Button>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-bold text-zinc-900">
                  {project.name}
                </h1>
                {projectLink && (
                  <a
                    href={projectLink.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline"
                  >
                    {projectLink.label}
                  </a>
                )}
              </div>
              {project.headline && (
                <p className="mt-2 text-lg text-zinc-600">{project.headline}</p>
              )}
            </div>
            {isAuthenticated ? (
              <motion.div whileTap={{ scale: 1.15, rotate: -3 }} transition={{ type: "spring", stiffness: 800, damping: 20 }}>
                <Button
                  variant={project.hasUpvoted ? "default" : "outline"}
                  onClick={handleUpvote}
                  className={`rounded-full px-6 py-3 text-base font-semibold hover:ring-2 hover:ring-accent hover:ring-offset-2 transition-all ${project.hasUpvoted ? "!text-primary-foreground hover:!bg-primary hover:!text-primary-foreground" : "!text-foreground hover:!bg-background hover:!text-foreground"}`}
                >
                  ↑ {project.upvotes}
                </Button>
              </motion.div>
            ) : (
              <motion.div whileTap={{ scale: 1.15, rotate: -3 }} transition={{ type: "spring", stiffness: 800, damping: 20 }}>
                  <Button
                    variant="outline"
                    className="rounded-full border-zinc-200 px-6 py-3 text-base font-semibold !text-foreground hover:!bg-background hover:!text-foreground hover:ring-2 hover:ring-accent hover:ring-offset-2 transition-all"
                    asChild
                  >
                    <Link href="/sign-in">
                    ↑ {project.upvotes}
                    </Link>
                  </Button>
              </motion.div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-base sm:flex-nowrap">
            <span className="flex items-center gap-2 whitespace-nowrap">
              <Avatar className="h-10 w-10 bg-zinc-100 text-sm font-semibold text-zinc-600">
                <AvatarImage
                  src={project.creatorAvatar}
                  alt={project.creatorName || "User"}
                />
                <AvatarFallback>
                  {(project.creatorName || "U").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-zinc-500">
                By{" "}
                <span className="font-medium text-zinc-900">
                  {project.creatorName || "Unknown User"}
                </span>
              </span>
            </span>
            <span className="text-zinc-300">•</span>
            <span className="text-zinc-500 whitespace-nowrap">
              Team{" "}
              <span className="font-medium text-zinc-900">
                {project.team}
              </span>
            </span>
            {project.focusAreas?.length ? (
              <>
                <span className="text-zinc-300">•</span>
                <FocusAreaBadges
                  focusAreas={project.focusAreas}
                  className="min-w-0 flex-1 text-sm"
                />
              </>
            ) : null}
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-start gap-3">
              <div>
                <ReadinessBadge status={project.readinessStatus} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-zinc-900 mb-1">
                  What you can expect
                </h3>
                <p className="text-sm text-zinc-600">
                  {getReadinessStatusDescription(project.readinessStatus)}
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-base leading-relaxed text-zinc-600">
              {project.summary}
            </p>
          </div>

          {projectMedia && projectMedia.length > 0 && (
            <div className="my-8">
              <MediaCarousel mediaFiles={projectMedia} />
            </div>
          )}

          <div id="discussion">
            <div className="space-y-4">
              <CommentForm projectId={projectId} />
              {comments === undefined ? (
                <div className="py-8 text-center text-sm text-zinc-500">
                  Loading comments...
                </div>
              ) : topLevelComments.length === 0 ? (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 py-12 text-center">
                  <p className="text-sm text-zinc-500">
                    No comments yet. Be the first to start the discussion!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topLevelComments.map((comment) => (
                    <CommentThread
                      key={comment._id}
                      comment={comment}
                      allComments={comments}
                      projectId={projectId}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
