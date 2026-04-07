"use client";

import { use, useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/app/useCurrentUser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUploadField } from "@/components/FileUploadField";
import { uploadFile } from "@/lib/upload";
import { LinksEditor } from "@/components/LinksEditor";
import { RichTextEditor } from "@/components/RichTextEditor";
import Link from "next/link";
import { toast } from "sonner";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import type { NewProjectFileItem, LinkItem } from "@/lib/types";
import { useMentionSearch } from "@/hooks/use-mention-search";

export default function EditVersionPage({
  params,
}: {
  params: Promise<{ id: string; versionId: string }>;
}) {
  const router = useRouter();
  const { id, versionId: versionIdParam } = use(params);
  const { user } = useCurrentUser();
  const projectId = id as Id<"projects">;
  const versionId = versionIdParam as Id<"projectVersions">;

  const project = useQuery(api.projects.getById, { projectId });
  const version = useQuery(api.projects.getVersionById, { versionId });

  const updateVersion = useMutation(api.projects.updateVersion);
  const generateUploadUrl = useMutation(api.projects.generateUploadUrl);
  const addFileToVersion = useMutation(api.projects.addFileToVersion);
  const deleteFileFromVersion = useMutation(api.projects.deleteFileFromVersion);

  const [tag, setTag] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [links, setLinks] = useState<LinkItem[]>([{ url: "", label: "" }]);
  const [newFiles, setNewFiles] = useState<NewProjectFileItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const mentionSearch = useMentionSearch();

  useEffect(() => {
    if (version && !initialized) {
      setTag(version.tag);
      setTitle(version.title);
      setBody(version.body ?? "");
      if (version.links && version.links.length > 0) {
        setLinks(version.links.map((l) => ({ url: l.url, label: l.label ?? "" })));
      } else {
        setLinks([{ url: "", label: "" }]);
      }
      setInitialized(true);
    }
  }, [version, initialized]);

  const isOwner = user && project && project.userId === user._id;

  if (project === undefined || version === undefined) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="text-center text-zinc-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (project === null || version === null || !isOwner) {
    router.push(project ? `/project/${id}` : "/");
    return null;
  }

  const existingFiles = version.files.map((f) => ({
    _id: f._id,
    filename: f.filename,
    fileSize: f.fileSize,
  }));

  const handleExistingFileDelete = async (fileId: Id<"versionFiles">) => {
    try {
      await deleteFileFromVersion({
        versionId,
        fileId,
      });
    } catch {
      toast.error("Failed to delete file");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tag.trim() || !title.trim()) return;

    setIsSubmitting(true);
    try {
      const cleanedLinks = links.filter((l) => l.url.trim());
      await updateVersion({
        versionId,
        tag: tag.trim(),
        title: title.trim(),
        body: body.trim() || undefined,
        links: cleanedLinks.length > 0 ? cleanedLinks : undefined,
      });

      // Upload new files — abort if any fail
      for (const fileItem of newFiles) {
        const { storageId, contentType } = await uploadFile(fileItem.file, generateUploadUrl);
        await addFileToVersion({
          versionId,
          storageId,
          filename: fileItem.file.name,
          contentType,
          fileSize: fileItem.file.size,
        });
      }

      toast.success("Version updated!");
      router.push(`/project/${id}/versions`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update version");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto max-w-3xl px-6 pt-4 pb-10">
        <Breadcrumb className="mb-6">
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
              <BreadcrumbLink asChild>
                <Link href={`/project/${id}`}>{project.name}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Edit Version</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="text-2xl font-semibold text-zinc-900 mb-6">
          Edit Version
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-4">
            <div className="space-y-2">
              <label htmlFor="tag" className="text-sm font-medium text-zinc-900">
                Tag
              </label>
              <Input
                id="tag"
                placeholder="v2.0"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium text-zinc-900">
                Release title
              </label>
              <Input
                id="title"
                placeholder="Dashboard Redesign"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="body" className="text-sm font-medium text-zinc-900">
              Describe this release{" "}
              <span className="text-xs text-zinc-500">(optional)</span>
            </label>
            <RichTextEditor
              value={body}
              onChange={setBody}
              placeholder="What's new in this release?"
              disabled={isSubmitting}
              onMentionSearch={mentionSearch}
            />
          </div>

          <FileUploadField
            existingFiles={existingFiles}
            onExistingFileDelete={handleExistingFileDelete}
            newFiles={newFiles}
            onNewFilesChange={setNewFiles}
            disabled={isSubmitting}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-900">
              Links{" "}
              <span className="text-xs text-zinc-500">(optional)</span>
            </label>
            <LinksEditor links={links} onChange={setLinks} disabled={isSubmitting} />
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-zinc-200">
            <Button type="submit" disabled={isSubmitting || !tag.trim() || !title.trim()}>
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push(`/project/${id}/versions`)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
