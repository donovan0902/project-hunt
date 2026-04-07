"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/RichTextEditor";
import { isRichTextEmpty } from "@/lib/utils";
import { SpacePicker } from "@/components/SpacePicker";
import { useThreadImageUpload } from "@/hooks/use-thread-image-upload";
import { useMentionSearch } from "@/hooks/use-mention-search";
import Link from "next/link";

export default function CreateThreadPage() {
  const router = useRouter();
  const focusAreas = useQuery(api.focusAreas.listActive);
  const createThread = useMutation(api.threads.createThread);
  const { handleImageUpload, getStorageIdsFromHtml } =
    useThreadImageUpload();
  const mentionSearch = useMentionSearch();

  const [selectedSpace, setSelectedSpace] = useState<
    Id<"focusAreas"> | "personal" | null
  >(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const focusAreaId =
    selectedSpace && selectedSpace !== "personal" ? selectedSpace : null;
  const canSubmit = focusAreaId && title.trim() && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const storageIdsFromBody = getStorageIdsFromHtml(body);
      const hasImages = storageIdsFromBody.length > 0;
      const bodyToSubmit = isRichTextEmpty(body) && !hasImages ? undefined : body;
      const imageStorageIds = hasImages ? storageIdsFromBody : undefined;
      const threadId = await createThread({
        title: title.trim(),
        body: bodyToSubmit,
        focusAreaId,
        imageStorageIds:
          imageStorageIds && imageStorageIds.length > 0
            ? imageStorageIds
            : undefined,
      });
      router.push(`/thread/${threadId}`);
    } catch (error) {
      console.error("Failed to create thread:", error);
      toast.error("Failed to create thread. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto max-w-xl px-6 pt-10 pb-16">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Start a Thread
          </h1>
          <Link href="/guidelines" className="text-sm text-zinc-500 underline underline-offset-4 hover:text-zinc-700">
            What can I post?
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700">Space</label>
            <SpacePicker
              spaces={focusAreas}
              selectedSpace={selectedSpace}
              onSelectionChange={setSelectedSpace}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700">Title</label>
            <Input
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setTitle(e.target.value)
              }
              placeholder="Thread title"
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700">
              Body{" "}
              <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <RichTextEditor
              value={body}
              onChange={setBody}
              placeholder="Add more context"
              disabled={isSubmitting}
              onImageUpload={handleImageUpload}
              onMentionSearch={mentionSearch}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? "Creating..." : "Create Thread"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
