"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CommentForm } from "./CommentForm";
import { useUser } from "@clerk/nextjs";
import { Id } from "@/convex/_generated/dataModel";

interface Comment {
  _id: Id<"comments">;
  projectId: Id<"projects">;
  userId: string;
  content: string;
  parentCommentId?: Id<"comments">;
  createdAt: number;
  isDeleted?: boolean;
}

interface CommentThreadProps {
  comment: Comment;
  allComments: Comment[];
  projectId: Id<"projects">;
  depth?: number;
}

export function CommentThread({
  comment,
  allComments,
  projectId,
  depth = 0,
}: CommentThreadProps) {
  const { user } = useUser();
  const deleteComment = useMutation(api.comments.deleteComment);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get replies to this comment
  const replies = allComments.filter(
    (c) => c.parentCommentId === comment._id && !c.isDeleted
  );

  const isOwner = user?.id === comment.userId;

  // Format timestamp
  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  // Get user initials from userId (simple approach)
  const getUserInitials = (userId: string) => {
    // If user is current user, use their data
    if (user?.id === userId) {
      const firstName = user.firstName || "";
      const lastName = user.lastName || "";
      if (firstName && lastName) {
        return `${firstName[0]}${lastName[0]}`.toUpperCase();
      }
      return userId.slice(0, 2).toUpperCase();
    }
    // For other users, use first 2 chars of userId
    return userId.slice(0, 2).toUpperCase();
  };

  const getUserName = (userId: string) => {
    if (user?.id === userId) {
      const firstName = user.firstName || "";
      const lastName = user.lastName || "";
      if (firstName && lastName) {
        return `${firstName} ${lastName}`;
      }
    }
    return `User ${userId.slice(0, 8)}`;
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    setIsDeleting(true);
    try {
      await deleteComment({ commentId: comment._id });
    } catch (error) {
      console.error("Failed to delete comment:", error);
      alert("Failed to delete comment. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (comment.isDeleted) {
    return null;
  }

  return (
    <div>
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8 bg-zinc-100">
            <AvatarFallback className="text-xs font-semibold text-zinc-600">
              {getUserInitials(comment.userId)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-zinc-900">
                {getUserName(comment.userId)}
              </span>
              <span className="text-sm text-zinc-500">
                {timeAgo(comment.createdAt)}
              </span>
            </div>
            <p className="mt-1 text-zinc-600 whitespace-pre-wrap break-words">
              {comment.content}
            </p>
            <div className="mt-2 flex items-center gap-2">
              {depth < 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="h-7 px-2 text-xs"
                >
                  Reply
                </Button>
              )}
              {isOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reply form */}
      {showReplyForm && (
        <div className="ml-11 mt-3">
          <CommentForm
            projectId={projectId}
            parentCommentId={comment._id}
            onCancel={() => setShowReplyForm(false)}
            placeholder="Write a reply..."
            submitText="Reply"
          />
        </div>
      )}

      {/* Nested replies */}
      {replies.length > 0 && (
        <div className="ml-11 mt-3 space-y-3 border-l-2 border-zinc-100 pl-4">
          {replies.map((reply) => (
            <CommentThread
              key={reply._id}
              comment={reply}
              allComments={allComments}
              projectId={projectId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
