"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CommentForm } from "./CommentForm";
import { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/app/useCurrentUser";
import Link from "next/link";
import { ArrowBigUp, MessageSquare, Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { getRelativeTime } from "@/lib/utils";
import { RichTextContent } from "@/components/RichTextContent";

export interface BaseComment {
  _id: string;
  userId: Id<"users">;
  content: string;
  parentCommentId?: string;
  createdAt: number;
  editedAt?: number;
  isDeleted?: boolean;
  upvotes?: number;
  hasUpvoted?: boolean;
  userName: string;
  userAvatar: string;
}

interface CommentThreadProps {
  comment: BaseComment;
  allComments: BaseComment[];
  onDelete: (commentId: string) => Promise<unknown>;
  onToggleUpvote: (commentId: string) => Promise<unknown>;
  onSubmitReply: (content: string, parentCommentId: string) => Promise<unknown>;
  onEdit: (commentId: string, content: string) => Promise<unknown>;
  depth?: number;
}

function countDescendants(
  commentId: string,
  allComments: BaseComment[]
): number {
  let count = 0;
  const directReplies = allComments.filter(
    (c) => c.parentCommentId === commentId && !c.isDeleted
  );
  for (const reply of directReplies) {
    count += 1 + countDescendants(reply._id, allComments);
  }
  return count;
}

export function CommentThread({
  comment,
  allComments,
  onDelete,
  onToggleUpvote,
  onSubmitReply,
  onEdit,
  depth = 0,
}: CommentThreadProps) {
  const { user } = useCurrentUser();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingUpvote, setIsTogglingUpvote] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLineHovered, setIsLineHovered] = useState(false);

  const lineColor = isLineHovered ? "bg-zinc-500" : "bg-zinc-300";
  const lineIconColor = isLineHovered
    ? "border-zinc-500 text-zinc-600"
    : "border-zinc-400 text-zinc-400";
  const lineHandlers = {
    onMouseEnter: () => setIsLineHovered(true),
    onMouseLeave: () => setIsLineHovered(false),
  };

  const replies = allComments.filter(
    (c) => c.parentCommentId === comment._id && !c.isDeleted
  );

  // For deleted comments, also check if there are non-deleted descendants
  const hasVisibleReplies = replies.length > 0;

  // If deleted and no visible replies, hide completely
  if (comment.isDeleted && !hasVisibleReplies) {
    return null;
  }

  const isOwner = user?._id === comment.userId;
  const currentUpvotes = comment.upvotes ?? 0;
  const hasUpvoted = comment.hasUpvoted ?? false;

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    setIsDeleting(true);
    try {
      await onDelete(comment._id);
    } catch (error) {
      console.error("Failed to delete comment:", error);
      toast.error("Failed to delete comment. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleUpvote = async () => {
    if (isTogglingUpvote) return;

    setIsTogglingUpvote(true);
    try {
      await onToggleUpvote(comment._id);
    } catch (error) {
      console.error("Failed to toggle comment upvote:", error);
      toast.error("Failed to update upvote. Please try again.");
    } finally {
      setIsTogglingUpvote(false);
    }
  };

  // Collapsed state — compact one-liner
  if (isCollapsed) {
    const descendantCount = countDescendants(comment._id, allComments);
    return (
      <div className="flex items-center py-1">
        <div className="w-8 shrink-0 flex items-center justify-center">
          <button
            onClick={() => setIsCollapsed(false)}
            className="flex items-center justify-center w-5 h-5 rounded-sm text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
            aria-label="Expand thread"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <span className="pl-2 text-xs text-zinc-500">
          <span className="font-medium text-zinc-900">
            {comment.isDeleted ? "[deleted]" : comment.userName}
          </span>
          <span className="text-zinc-300 mx-1">&bull;</span>
          <span>{getRelativeTime(comment.createdAt)}</span>
          {descendantCount > 0 && (
            <span className="text-zinc-400">
              {" "}({descendantCount} {descendantCount === 1 ? "reply" : "replies"})
            </span>
          )}
        </span>
      </div>
    );
  }

  // Shared reply list renderer — each reply draws its own vertical + horizontal
  // line segment so the last reply's line stops at the L-connector (no overhang).
  const renderReplies = () => (
    <div className="ml-8 pl-2">
      {replies.map((reply, index) => {
        const isLastReply = index === replies.length - 1;
        return (
          <div key={reply._id} className="relative">
            {/* Combined L-connector: curved border creates parabolic branch */}
            <button
              onClick={() => setIsCollapsed(true)}
              className="absolute -left-[25px] top-0 bottom-0 w-[25px] cursor-pointer"
              aria-label="Collapse thread"
              {...lineHandlers}
            >
              {/* SVG curve — starts from top and curves into horizontal branch */}
              <svg
                className={`absolute top-0 left-0 h-full w-full overflow-visible transition-colors ${isLineHovered ? "text-zinc-500" : "text-zinc-300"}`}
              >
                <line
                  x1="1"
                  y1="0"
                  x2="1"
                  y2={isLastReply ? "5" : "100%"}
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M 1 5 Q 1 16 25 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <CommentThread
              comment={reply}
              allComments={allComments}
              onDelete={onDelete}
              onToggleUpvote={onToggleUpvote}
              onSubmitReply={onSubmitReply}
              onEdit={onEdit}
              depth={depth + 1}
            />
          </div>
        );
      })}
    </div>
  );

  // Deleted comment placeholder (has replies, so we show structure)
  if (comment.isDeleted) {
    return (
      <div className="relative">
        <div className="relative flex gap-0">
          {/* Keep trunk bound to this row so it doesn't overrun past descendants */}
          {hasVisibleReplies && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="absolute left-0 top-8 bottom-0 w-8 z-10 cursor-pointer flex flex-col items-center"
              aria-label="Collapse thread"
              {...lineHandlers}
            >
              <div className={`w-[1.5px] h-4 shrink-0 transition-colors ${lineColor}`} />
              <div className={`shrink-0 my-0.5 flex items-center justify-center w-4 h-4 rounded-full border transition-colors ${lineIconColor}`}>
                <Minus className="h-2.5 w-2.5" />
              </div>
              <div className={`w-[1.5px] flex-1 transition-colors ${lineColor}`} />
            </button>
          )}

          {/* Avatar column */}
          <div className="flex flex-col items-center w-8 shrink-0">
            <div className="w-8 h-8 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-zinc-200" />
            </div>
          </div>

          {/* Content column */}
          <div className="flex-1 min-w-0 pl-2">
            <div className="py-2">
              <span className="text-xs text-zinc-400 italic">[deleted]</span>
            </div>
          </div>
        </div>

        {hasVisibleReplies && renderReplies()}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative flex gap-0">
        {/* Keep trunk bound to this row so it doesn't overrun past descendants */}
        {hasVisibleReplies && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="absolute left-0 top-8 bottom-0 w-8 z-10 cursor-pointer flex flex-col items-center"
            aria-label="Collapse thread"
            {...lineHandlers}
          >
            <div className={`w-[1.5px] h-4 shrink-0 transition-colors ${lineColor}`} />
            <div className={`shrink-0 my-0.5 flex items-center justify-center w-4 h-4 rounded-full border transition-colors ${lineIconColor}`}>
              <Minus className="h-2.5 w-2.5" />
            </div>
            <div className={`w-[1.5px] flex-1 transition-colors ${lineColor}`} />
          </button>
        )}

        {/* Avatar column */}
        <div className="flex flex-col items-center w-8 shrink-0">
          <Link href={`/profile/${comment.userId}`}>
            <Avatar className="h-8 w-8 bg-zinc-100">
              <AvatarImage
                src={comment.userAvatar}
                alt={comment.userName || "User"}
              />
              <AvatarFallback className="text-xs font-semibold text-zinc-600">
                {(comment.userName || "U").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>

        {/* Content column */}
        <div className="flex-1 min-w-0 pl-2">
          <div className="py-1">
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <Link
                href={`/profile/${comment.userId}`}
                className="font-medium text-zinc-900 hover:underline"
              >
                {comment.userName || "Unknown User"}
              </Link>
              <span className="text-zinc-300">&bull;</span>
              <span>{getRelativeTime(comment.createdAt)}</span>
              {comment.editedAt && (
                <span className="text-zinc-400 italic">· edited</span>
              )}
            </div>
            {showEditForm ? (
              <div className="mt-1 mb-2">
                <CommentForm
                  onSubmit={async (content) => {
                    await onEdit(comment._id, content);
                    setShowEditForm(false);
                  }}
                  onCancel={() => setShowEditForm(false)}
                  initialValue={comment.content}
                  submitText="Save"
                />
              </div>
            ) : (
              <RichTextContent html={comment.content} className="mt-0.5 text-zinc-700" />
            )}
            <div className="mt-1 flex items-center gap-0.5 -ml-1.5">
              <Button
                variant="ghost"
                size="xs"
                onClick={handleToggleUpvote}
                disabled={isTogglingUpvote}
                className={`group gap-0.5 text-xs !bg-transparent hover:!bg-zinc-200 active:!bg-zinc-300 ${hasUpvoted ? "text-emerald-700 hover:text-emerald-800" : "text-zinc-400 hover:text-emerald-700"}`}
              >
                <ArrowBigUp
                  className={`h-4 w-4 transition-colors ${hasUpvoted ? "" : "text-zinc-400 group-hover:text-emerald-700"}`}
                  fill={hasUpvoted ? "currentColor" : "none"}
                />
                {currentUpvotes > 0 && (
                  <span className="text-xs">{currentUpvotes}</span>
                )}
              </Button>
              {depth < 3 && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="gap-1 text-xs text-zinc-400 hover:!bg-zinc-200 active:!bg-zinc-300 hover:text-zinc-600"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Reply
                </Button>
              )}
              {isOwner && (
                <>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => { setShowEditForm(!showEditForm); setShowReplyForm(false); }}
                    className="gap-1 text-xs text-zinc-400 hover:!bg-zinc-200 active:!bg-zinc-300 hover:text-zinc-600"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="gap-1 text-xs text-zinc-400 hover:!bg-zinc-200 active:!bg-zinc-300 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>

          {showReplyForm && (
            <div className="mt-1 mb-2">
              <CommentForm
                onSubmit={(content) => onSubmitReply(content, comment._id)}
                onCancel={() => setShowReplyForm(false)}
                placeholder="Write a reply..."
                submitText="Reply"
              />
            </div>
          )}
        </div>
      </div>

      {hasVisibleReplies && renderReplies()}
    </div>
  );
}
