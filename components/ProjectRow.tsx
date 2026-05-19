// components/ProjectRow.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowBigUp, Eye, EyeOff, Forward, MessageCircle } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ProjectMediaCarousel } from "@/components/ProjectMediaCarousel";
import { ReadinessBadge } from "@/components/ReadinessBadge";
import { SpaceIcon } from "@/components/SpaceIcon";
import { stripHtml, getRelativeTime } from "@/lib/utils";
import type { ProjectRowData } from "@/lib/types";

interface ProjectRowProps {
  project: ProjectRowData;
  onUpvote: (projectId: Id<"projects">) => void;
  onFollow: (projectId: Id<"projects">) => void;
  isAuthenticated: boolean;
  hideSpaceLabel?: boolean;
}


export function ProjectRow({
  project,
  onUpvote,
  onFollow,
  isAuthenticated,
  hideSpaceLabel,
}: ProjectRowProps) {
  const router = useRouter();
  const [shareOpen, setShareOpen] = useState(false);

  const handleProjectClick = () => {
    router.push(`/project/${project._id}`);
  };

  const handleUpvoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpvote(project._id);
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/project/${project._id}#discussion`);
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/project/${project._id}`);
    setShareOpen(true);
  };

  const handleFollowClick = () => {
    onFollow(project._id);
  };

  const hasMedia = project.previewMedia.length > 0;

  return (
    <div
      className="flex flex-col gap-2 pb-3 pt-3 cursor-pointer hover:bg-zinc-100 rounded-lg transition-colors px-4 -mx-4"
      onClick={handleProjectClick}
    >
      {/* Header: Focus area, time, views, facepile */}
      <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
        <div className="flex flex-wrap items-center gap-2">
          {project.focusArea && !hideSpaceLabel ? (
            <Link
              href={`/space/${project.focusArea._id}`}
              className="flex items-center gap-1 font-medium text-zinc-600 transition-colors hover:text-green-600"
              onClick={(e) => e.stopPropagation()}
            >
              <SpaceIcon icon={project.focusArea.icon} name={project.focusArea.name} size="sm" />
              g/{project.focusArea.name}
            </Link>
          ) : (
            <Link
              href={`/profile/${project.userId}`}
              className="font-medium text-zinc-600 transition-colors hover:text-green-600"
              onClick={(e) => e.stopPropagation()}
            >
              u/{project.creatorName}
            </Link>
          )}
        </div>
        <span className="shrink-0 text-zinc-400">{getRelativeTime(project.lastVersionAt ?? project._creationTime)}</span>
      </div>

      {/* Title */}
      <div className="-mt-1 flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold text-zinc-900">{project.name}</h3>
        <ReadinessBadge status={project.readinessStatus} />
      </div>

      {/* Media carousel OR summary - not both */}
      {hasMedia ? (
        <div className="w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
          <ProjectMediaCarousel media={project.previewMedia} />
        </div>
      ) : project.summary ? (
        <p className="text-sm leading-5 text-zinc-600 line-clamp-2 break-words">
          {stripHtml(project.summary)}
        </p>
      ) : null}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {isAuthenticated ? (
          <motion.div whileTap={{ scale: 1.15, rotate: -3 }} transition={{ type: "spring", stiffness: 800, damping: 20 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUpvoteClick}
              className={`group flex items-center gap-1.5 rounded-full px-3 h-8 text-sm font-medium !bg-zinc-200 hover:!bg-zinc-300 active:!bg-zinc-400 ${project.hasUpvoted ? "text-emerald-700 hover:text-emerald-800" : "text-zinc-700 hover:text-emerald-700"}`}
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
          <motion.div whileTap={{ scale: 1.15, rotate: -3 }} transition={{ type: "spring", stiffness: 800, damping: 20 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 rounded-full px-3 h-8 text-sm font-medium !bg-zinc-200 hover:!bg-zinc-300 active:!bg-zinc-400 !text-zinc-700"
              asChild
            >
              <Link href="/sign-in" prefetch={false}>
                <ArrowBigUp className="h-4 w-4" fill="none" aria-hidden="true" />
                <span>{project.upvotes}</span>
              </Link>
            </Button>
          </motion.div>
        )}
        <motion.div whileTap={{ scale: 1.15, rotate: -3 }} transition={{ type: "spring", stiffness: 800, damping: 20 }}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCommentClick}
            className="flex items-center gap-1.5 rounded-full px-3 h-8 text-sm font-medium !bg-zinc-200 hover:!bg-zinc-300 active:!bg-zinc-400 !text-zinc-700"
            aria-label={`View ${project.commentCount} comments`}
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            <span>{project.commentCount}</span>
          </Button>
        </motion.div>
        {isAuthenticated ? (
          <motion.div whileTap={{ scale: 1.15, rotate: -3 }} transition={{ type: "spring", stiffness: 800, damping: 20 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleFollowClick(); }}
              className={`flex items-center gap-1.5 rounded-full px-3 h-8 text-sm font-medium !bg-zinc-200 hover:!bg-zinc-300 active:!bg-zinc-400 ${project.hasFollowed ? "text-emerald-700 hover:text-emerald-800" : "text-zinc-700 hover:text-zinc-800"}`}
              aria-label={project.hasFollowed ? `Unwatch (${project.followerCount} watching)` : `Watch (${project.followerCount} watching)`}
              title={project.hasFollowed ? `Unwatch (${project.followerCount} watching)` : `Watch (${project.followerCount} watching)`}
            >
              {project.hasFollowed ? (
                <Eye className="h-4 w-4" aria-hidden="true" />
              ) : (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{project.followerCount}</span>
            </Button>
          </motion.div>
        ) : (
          <motion.div whileTap={{ scale: 1.15, rotate: -3 }} transition={{ type: "spring", stiffness: 800, damping: 20 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 rounded-full px-3 h-8 text-sm font-medium !bg-zinc-200 hover:!bg-zinc-300 active:!bg-zinc-400 !text-zinc-700"
              asChild
            >
              <Link href="/sign-in" prefetch={false} title={`Watch (${project.followerCount} watching)`}>
                <EyeOff className="h-4 w-4" aria-hidden="true" />
                <span>{project.followerCount}</span>
              </Link>
            </Button>
          </motion.div>
        )}
        <motion.div whileTap={{ scale: 1.15, rotate: -3 }} transition={{ type: "spring", stiffness: 800, damping: 20 }}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShareClick}
            className="flex items-center gap-1.5 rounded-full px-3 h-8 text-sm font-medium !bg-zinc-200 hover:!bg-zinc-300 active:!bg-zinc-400 !text-zinc-700"
            aria-label="Copy project link"
          >
            <span aria-hidden="true">Share</span>
            <Forward className="h-4 w-4" aria-hidden="true" />
          </Button>
        </motion.div>
      </div>

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
