"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/RichTextEditor";
import { isRichTextEmpty } from "@/lib/utils";
import { useThreadImageUpload } from "@/hooks/use-thread-image-upload";
import { useMentionSearch } from "@/hooks/use-mention-search";
import { MessageSquarePlus } from "lucide-react";

interface CreateThreadFormProps {
  focusAreaId: Id<"focusAreas">;
  defaultExpanded?: boolean;
  onSuccess?: () => void;
}

export function CreateThreadForm({ focusAreaId, defaultExpanded, onSuccess }: CreateThreadFormProps) {
  const createThread = useMutation(api.threads.createThread);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded ?? false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { handleImageUpload, getStorageIdsFromHtml, resetImageMap } =
    useThreadImageUpload();
  const mentionSearch = useMentionSearch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const storageIdsFromBody = getStorageIdsFromHtml(body);
      const hasImages = storageIdsFromBody.length > 0;
      const bodyToSubmit = isRichTextEmpty(body) && !hasImages ? undefined : body;
      const imageStorageIds = hasImages ? storageIdsFromBody : undefined;
      await createThread({
        title: title.trim(),
        body: bodyToSubmit,
        focusAreaId,
        imageStorageIds:
          imageStorageIds && imageStorageIds.length > 0
            ? imageStorageIds
            : undefined,
      });
      setTitle("");
      setBody("");
      resetImageMap();
      setIsExpanded(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to create thread:", error);
      toast.error("Failed to create thread. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full rounded-lg border border-zinc-200 bg-white p-4 text-left text-sm text-zinc-400 hover:border-zinc-300 hover:bg-zinc-50 transition-colors flex items-center gap-2"
      >
        <MessageSquarePlus className="h-4 w-4" />
        Start a conversation...
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 py-2"
    >
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Thread title"
        className="text-base font-medium"
        disabled={isSubmitting}
        autoFocus
      />
      <RichTextEditor
        value={body}
        onChange={setBody}
        placeholder="Add more context (optional)"
        disabled={isSubmitting}
        onImageUpload={handleImageUpload}
        onMentionSearch={mentionSearch}
      />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setIsExpanded(false);
            setTitle("");
            setBody("");
            resetImageMap();
          }}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !title.trim()}>
          {isSubmitting ? "Posting..." : "Post Thread"}
        </Button>
      </div>
    </form>
  );
}
