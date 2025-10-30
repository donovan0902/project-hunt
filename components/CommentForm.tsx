"use client";

import { useState } from "react";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SignInButton } from "@clerk/nextjs";
import { Id } from "@/convex/_generated/dataModel";

interface CommentFormProps {
  projectId: Id<"projects">;
  parentCommentId?: Id<"comments">;
  onCancel?: () => void;
  placeholder?: string;
  submitText?: string;
}

export function CommentForm({
  projectId,
  parentCommentId,
  onCancel,
  placeholder = "Add a comment...",
  submitText = "Post Comment",
}: CommentFormProps) {
  const { isAuthenticated } = useConvexAuth();
  const addComment = useMutation(api.comments.addComment);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await addComment({
        projectId,
        content: content.trim(),
        parentCommentId,
      });
      setContent("");
      onCancel?.();
    } catch (error) {
      console.error("Failed to post comment:", error);
      alert("Failed to post comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="mb-3 text-sm text-zinc-500">
          Sign in to join the discussion
        </p>
        <SignInButton mode="modal">
          <Button variant="outline">Sign In</Button>
        </SignInButton>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-zinc-200 bg-white p-4">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="min-h-20 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
        disabled={isSubmitting}
      />
      <div className="mt-2 flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || !content.trim()}>
          {isSubmitting ? "Posting..." : submitText}
        </Button>
      </div>
    </form>
  );
}
