"use client";

import { use, useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/app/useCurrentUser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { FileUploadField } from "@/components/FileUploadField";
import { uploadFile } from "@/lib/upload";
import { LinksEditor } from "@/components/LinksEditor";
import { RichTextEditor } from "@/components/RichTextEditor";
import Link from "next/link";
import { toast } from "sonner";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

const readinessSliderValues = ["just_an_idea", "early_prototype", "mostly_working", "ready_to_use"] as const;
const readinessSliderLabels = ["Just an idea", "Early prototype", "Mostly working", "Ready to use"];

export default function NewVersionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const { user, isLoading: isUserLoading } = useCurrentUser();
  const projectId = id as Id<"projects">;
  const project = useQuery(api.projects.getById, { projectId });

  const createVersion = useMutation(api.projects.createVersion);
  const generateUploadUrl = useMutation(api.projects.generateUploadUrl);
  const addFileToVersion = useMutation(api.projects.addFileToVersion);

  const [tag, setTag] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [newFiles, setNewFiles] = useState<NewProjectFileItem[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([{ url: "", label: "" }]);
  const [selectedReadinessStatus, setSelectedReadinessStatus] = useState<typeof readinessSliderValues[number]>("just_an_idea");
  const [readinessInitialized, setReadinessInitialized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mentionSearch = useMentionSearch();

  useEffect(() => {
    if (!project || readinessInitialized) return;

    const status = project.readinessStatus === "in_progress" ? "early_prototype" : project.readinessStatus ?? "just_an_idea";
    setSelectedReadinessStatus(status as typeof readinessSliderValues[number]);
    setReadinessInitialized(true);
  }, [project, readinessInitialized]);

  const isOwner = !!(user && project && project.userId === user._id);

  useEffect(() => {
    if (project === undefined || isUserLoading) return;
    if (project === null || !isOwner) {
      router.push(project ? `/project/${id}` : "/");
    }
  }, [id, isOwner, isUserLoading, project, router]);

  if (project === undefined || isUserLoading) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="text-center text-zinc-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (project === null || !isOwner) {
    return null;
  }

  const currentProjectReadiness = project.readinessStatus === "in_progress" ? "early_prototype" : project.readinessStatus ?? "just_an_idea";
  const readinessChanged = selectedReadinessStatus !== currentProjectReadiness;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tag.trim() || !title.trim()) return;

    setIsSubmitting(true);
    try {
      // Upload all files first — abort entirely if any fail
      const uploadedFiles: Array<{
        storageId: Id<"_storage">;
        filename: string;
        contentType: string;
        fileSize: number;
      }> = [];

      for (const fileItem of newFiles) {
        const { storageId, contentType } = await uploadFile(fileItem.file, generateUploadUrl);
        uploadedFiles.push({
          storageId,
          filename: fileItem.file.name,
          contentType,
          fileSize: fileItem.file.size,
        });
      }

      // All files uploaded successfully — now create the version
      const cleanedLinks = links.filter((l) => l.url.trim());
      const versionId = await createVersion({
        projectId,
        tag: tag.trim(),
        title: title.trim(),
        body: body.trim() || undefined,
        links: cleanedLinks.length > 0 ? cleanedLinks : undefined,
        readinessStatus: readinessChanged ? selectedReadinessStatus : undefined,
      });

      for (const file of uploadedFiles) {
        await addFileToVersion({ versionId, ...file });
      }

      toast.success("Release published!");
      router.push(`/project/${id}/versions`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish release");
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
              <BreadcrumbPage>New Release</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="text-2xl font-semibold text-zinc-900 mb-6">
          New Release
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

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label htmlFor="readinessStatus" className="text-sm font-medium text-zinc-900">
                Readiness status
              </label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-zinc-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    Update the project&apos;s readiness if this release changes its maturity level.
                  </p>
                </TooltipContent>
              </Tooltip>
              {readinessChanged && (
                <span className="text-xs text-amber-600 font-medium">Changed</span>
              )}
            </div>
            <div className="space-y-3 pt-1">
              <Slider
                id="readinessStatus"
                min={0}
                max={3}
                step={1}
                value={[readinessSliderValues.indexOf(selectedReadinessStatus)]}
                onValueChange={([val]) => setSelectedReadinessStatus(readinessSliderValues[val])}
                disabled={isSubmitting}
              />
              <div className="flex justify-between text-xs text-zinc-500">
                {readinessSliderLabels.map((label, i) => (
                  <span
                    key={label}
                    className={`text-center ${i === readinessSliderValues.indexOf(selectedReadinessStatus) ? "font-semibold text-zinc-900" : ""}`}
                    style={{ width: "25%" }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-zinc-200">
            <Button type="submit" disabled={isSubmitting || !tag.trim() || !title.trim()}>
              {isSubmitting ? "Publishing..." : "Publish release"}
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
