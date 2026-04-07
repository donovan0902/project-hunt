"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowBigUp, MessageCircle, Forward } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { stripHtml, getRelativeTime } from "@/lib/utils";
import type { ThreadRowData } from "@/lib/types";

interface ThreadRowProps {
  thread: ThreadRowData;
  onUpvote: (threadId: Id<"threads">) => void;
  isAuthenticated: boolean;
}


export function ThreadRow({
  thread,
  onUpvote,
  isAuthenticated,
}: ThreadRowProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/thread/${thread._id}`);
  };

  const handleUpvoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpvote(thread._id);
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/thread/${thread._id}#discussion`);
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(
      `${window.location.origin}/thread/${thread._id}`
    );
  };

  return (
    <div
      className="flex flex-col gap-2 pb-3 pt-3 cursor-pointer hover:bg-zinc-100 rounded-lg transition-colors px-4 -mx-4"
      onClick={handleClick}
    >
      {/* Header: user + time */}
      <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
        <Link
          href={`/profile/${thread.userId}`}
          className="font-medium text-zinc-600 transition-colors hover:text-green-600"
          onClick={(e) => e.stopPropagation()}
        >
          u/{thread.creatorName}
        </Link>
        <span className="shrink-0 text-zinc-400">{getRelativeTime(thread.createdAt)}</span>
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-zinc-900 -mt-1">
        {thread.title}
      </h3>

      {/* Body preview */}
      {thread.body && (
        <p className="text-sm leading-5 text-zinc-600 line-clamp-2 break-words">
          {stripHtml(thread.body)}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {isAuthenticated ? (
          <motion.div
            whileTap={{ scale: 1.15, rotate: -3 }}
            transition={{ type: "spring", stiffness: 800, damping: 20 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUpvoteClick}
              className={`group flex items-center gap-1.5 rounded-full px-3 h-8 text-sm font-medium !bg-zinc-200 hover:!bg-zinc-300 active:!bg-zinc-400 ${thread.hasUpvoted ? "text-emerald-700 hover:text-emerald-800" : "text-zinc-700 hover:text-emerald-700"}`}
            >
              <ArrowBigUp
                className={`h-4 w-4 transition-colors ${thread.hasUpvoted ? "" : "text-zinc-700 group-hover:text-emerald-700"}`}
                fill={thread.hasUpvoted ? "currentColor" : "none"}
                aria-hidden="true"
              />
              <span>{thread.upvoteCount}</span>
            </Button>
          </motion.div>
        ) : (
          <motion.div
            whileTap={{ scale: 1.15, rotate: -3 }}
            transition={{ type: "spring", stiffness: 800, damping: 20 }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 rounded-full px-3 h-8 text-sm font-medium !bg-zinc-200 hover:!bg-zinc-300 active:!bg-zinc-400 !text-zinc-700"
              asChild
            >
              <Link href="/sign-in" prefetch={false}>
                <ArrowBigUp className="h-4 w-4" fill="none" aria-hidden="true" />
                <span>{thread.upvoteCount}</span>
              </Link>
            </Button>
          </motion.div>
        )}
        <motion.div
          whileTap={{ scale: 1.15, rotate: -3 }}
          transition={{ type: "spring", stiffness: 800, damping: 20 }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={handleCommentClick}
            className="flex items-center gap-1.5 rounded-full px-3 h-8 text-sm font-medium !bg-zinc-200 hover:!bg-zinc-300 active:!bg-zinc-400 !text-zinc-700"
            aria-label={`View ${thread.commentCount} comments`}
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            <span>{thread.commentCount}</span>
          </Button>
        </motion.div>
        <motion.div
          whileTap={{ scale: 1.15, rotate: -3 }}
          transition={{ type: "spring", stiffness: 800, damping: 20 }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={handleShareClick}
            className="flex items-center gap-1.5 rounded-full px-3 h-8 text-sm font-medium !bg-zinc-200 hover:!bg-zinc-300 active:!bg-zinc-400 !text-zinc-700"
            aria-label="Copy thread link"
          >
            <span aria-hidden="true">Share</span>
            <Forward className="h-4 w-4" aria-hidden="true" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
