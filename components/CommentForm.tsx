"use client";

import { useState } from "react";
import { useConvexAuth } from "convex/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/RichTextEditor";
import { useMentionSearch } from "@/hooks/use-mention-search";
import Link from "next/link";

interface CommentFormProps {
  onSubmit: (content: string) => Promise<unknown>;
  onCancel?: () => void;
  placeholder?: string;
  submitText?: string;
  initialValue?: string;
}

export function CommentForm({
  onSubmit,
  onCancel,
  placeholder = "What do you think?",
  submitText = "Comment",
  initialValue = "",
}: CommentFormProps) {
  const { isAuthenticated } = useConvexAuth();
  const mentionSearch = useMentionSearch();
  const [content, setContent] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEmpty = !content || content === "<p><br></p>";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEmpty) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content);
      setContent("");
      onCancel?.();
    } catch (error) {
      console.error("Failed to post comment:", error);
      toast.error("Failed to post comment. Please try again.");
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
        <Button variant="outline" asChild>
          <Link href="/sign-in" prefetch={false}>
            Sign In
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="rounded-md border border-zinc-300 bg-zinc-50 px-3.5 py-2.5">
        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder={placeholder}
          disabled={isSubmitting}
          minimal
          onMentionSearch={mentionSearch}
        />
        <div className="mt-2 flex justify-end gap-1.5">
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
          <Button type="submit" disabled={isSubmitting || isEmpty}>
            {isSubmitting ? "Posting..." : submitText}
          </Button>
        </div>
      </div>
    </form>
  );
}
