"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAction, useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/RichTextEditor";
import { isRichTextEmpty } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";
import { Info } from "lucide-react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { LinksEditor } from "@/components/LinksEditor";
import { SpacePicker } from "@/components/SpacePicker";
import { AdditionalSpacesPicker } from "@/components/AdditionalSpacesPicker";
import { MediaUploadField } from "@/components/MediaUploadField";
import { FileUploadField } from "@/components/FileUploadField";
import { uploadFile } from "@/lib/upload";
import type { LinkItem, ExistingMediaItem, NewFileItem, NewProjectFileItem } from "@/lib/types";
import { useMentionSearch } from "@/hooks/use-mention-search";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const readinessSliderValues = ["just_an_idea", "early_prototype", "mostly_working", "ready_to_use"] as const;
const readinessSliderLabels = ["Just an idea", "Early prototype", "Mostly working", "Ready to use"];

export default function EditProject({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const projectId = id as Id<"projects">;
  const project = useQuery(api.projects.getById, { projectId });
  const projectMedia = useQuery(api.projects.getProjectMedia, { projectId });
  const projectFiles = useQuery(api.projects.getProjectFiles, { projectId });
  const updateProject = useAction(api.projects.updateProject);
  const generateUploadUrl = useMutation(api.projects.generateUploadUrl);
  const deleteMediaFromProject = useMutation(api.projects.deleteMediaFromProject);
  const addMediaToProject = useMutation(api.projects.addMediaToProject);
  const addFileToProject = useMutation(api.projects.addFileToProject);
  const deleteFileFromProject = useMutation(api.projects.deleteFileFromProject);
  const reorderProjectMedia = useMutation(api.projects.reorderProjectMedia)
    .withOptimisticUpdate((localStore, args) => {
      const existing = localStore.getQuery(api.projects.getProjectMedia, { projectId: args.projectId });
      if (existing) {
        // Reorder in the local cache immediately based on the new order
        const reordered = args.orderedMediaIds
          .map(id => existing.find(m => m._id === id))
          .filter((m): m is NonNullable<typeof m> => m !== undefined);
        localStore.setQuery(api.projects.getProjectMedia, { projectId: args.projectId }, reordered);
      }
    });
  const focusAreas = useQuery(api.focusAreas.listActive);
  const currentUser = useQuery(api.users.current);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [links, setLinks] = useState<LinkItem[]>([{ url: "", label: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<NewFileItem[]>([]);
  const [newProjectFiles, setNewProjectFiles] = useState<NewProjectFileItem[]>([]);
  const [selectedFocusArea, setSelectedFocusArea] = useState<Id<"focusAreas"> | "personal" | null>(null);
  const [additionalSpaces, setAdditionalSpaces] = useState<Id<"focusAreas">[]>([]);
  const [selectedReadinessStatus, setSelectedReadinessStatus] = useState<"just_an_idea" | "early_prototype" | "mostly_working" | "ready_to_use">("just_an_idea");
  const mentionSearch = useMentionSearch();

  const handlePrimarySpaceChange = (selected: Id<"focusAreas"> | "personal" | null) => {
    setSelectedFocusArea(selected);
    if (selected && selected !== "personal") {
      setAdditionalSpaces((prev) => prev.filter((id) => id !== selected));
    }
  };

  const handleExistingMediaReorder = async (reorderedMedia: ExistingMediaItem[]) => {
    try {
      await reorderProjectMedia({
        projectId,
        orderedMediaIds: reorderedMedia.map((media) => media._id),
      });
    } catch (error) {
      console.error("Failed to reorder media:", error);
      toast.error("Failed to reorder media. Please try again.");
      // No manual rollback needed - Convex optimistic update handles this
    }
  };

  const handleExistingMediaDelete = async (mediaId: Id<"mediaFiles">) => {
    try {
      await deleteMediaFromProject({ projectId, mediaId });
    } catch (error) {
      console.error("Failed to delete media:", error);
      toast.error("Failed to delete media. Please try again.");
    }
  };

  const handleExistingFileDelete = async (fileId: Id<"projectFiles">) => {
    try {
      await deleteFileFromProject({ projectId, fileId });
    } catch (error) {
      console.error("Failed to delete file:", error);
      toast.error("Failed to delete file. Please try again.");
    }
  };

  // Populate form when project data loads
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.summary || "",
      });
      if (project.links && project.links.length > 0) {
        setLinks(project.links.map((l) => ({ url: l.url, label: l.label ?? "" })));
      } else {
        setLinks([{ url: "", label: "" }]);
      }
      setSelectedFocusArea(project.focusArea?._id ?? null);
      if (project.additionalFocusAreas) {
        setAdditionalSpaces(project.additionalFocusAreas.map((fa: { _id: Id<"focusAreas"> }) => fa._id));
      }
      const loadedStatus = project.readinessStatus === "in_progress" ? "early_prototype" : project.readinessStatus ?? "just_an_idea";
      setSelectedReadinessStatus(loadedStatus);
      setIsLoading(false);
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const trimmedName = formData.name.trim();

    if (!trimmedName) {
      toast.error("Please add a title.");
      setIsSubmitting(false);
      return;
    }

    try {
      const filteredLinks = links
        .filter((l) => l.url.trim())
        .map((l) => ({ url: l.url.trim(), ...(l.label.trim() ? { label: l.label.trim() } : {}) }));

      // Update project fields
      await updateProject({
        projectId,
        name: trimmedName,
        summary: isRichTextEmpty(formData.description) ? undefined : formData.description,
        links: filteredLinks.length > 0 ? filteredLinks : undefined,
        focusAreaId: selectedFocusArea === "personal" ? undefined : selectedFocusArea ?? undefined,
        additionalFocusAreaIds: additionalSpaces,
        readinessStatus: selectedReadinessStatus,
      });

      // Upload and add new media files if any are selected
      if (selectedFiles.length > 0) {
        await Promise.all(
          selectedFiles.map(async ({ file }) => {
            const { storageId, contentType } = await uploadFile(file, generateUploadUrl);

            await addMediaToProject({
              projectId,
              storageId,
              type: file.type.startsWith('video/') ? 'video' : 'image',
              contentType,
            });
          })
        );
      }

      // Upload new project files if any
      if (newProjectFiles.length > 0) {
        await Promise.all(
          newProjectFiles.map(async ({ file }) => {
            const { storageId, contentType } = await uploadFile(file, generateUploadUrl);

            await addFileToProject({
              projectId,
              storageId,
              filename: file.name,
              contentType,
              fileSize: file.size,
            });
          })
        );
      }

      router.push(`/project/${id}`);
    } catch (error) {
      console.error("Failed to update project:", error);
      toast.error("Failed to update project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-16 pt-4">
          <p className="text-zinc-500">Loading...</p>
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-16 pt-4">
          <p className="text-zinc-500">Project not found</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-16 pt-4">
        <Breadcrumb>
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
              <BreadcrumbPage>Edit</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="mb-2 space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight">Update your project details</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Space Selectors — grouped */}
          <div className="space-y-3 max-w-2xl mb-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-base font-semibold text-zinc-900">
                  Choose a space
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-zinc-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      Spaces help categorize your project and make it easier for teammates to discover relevant work.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <SpacePicker
                spaces={focusAreas}
                selectedSpace={selectedFocusArea}
                onSelectionChange={handlePrimarySpaceChange}
                currentUserName={currentUser?.name}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-zinc-600">
                  Additional spaces
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-zinc-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      Add additional spaces to reach other communities where your project is also relevant.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <AdditionalSpacesPicker
                spaces={focusAreas}
                selectedSpaces={additionalSpaces}
                onSelectionChange={setAdditionalSpaces}
                excludeSpaceId={selectedFocusArea === "personal" ? null : selectedFocusArea}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <section className="w-full space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-zinc-900">
                  Title
                </label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="AI Prompt Template: Clear Email Reply"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label htmlFor="description" className="text-sm font-medium text-zinc-900">
                    What did you build and why? <span className="text-xs text-zinc-500">(optional)</span>
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-zinc-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        A good description makes your project easier to find when teammates search for solutions. Describe the problem and how you solved it—this helps the right people discover your work.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <RichTextEditor
                  value={formData.description}
                  onChange={(value) => setFormData({ ...formData, description: value })}
                  placeholder="A copy-and-paste prompt I use with AI to turn a few bullet points into a clear, polite email response. It asks for the right details, includes next steps, and keeps the tone consistent."
                  disabled={isSubmitting}
                  onMentionSearch={mentionSearch}
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <MediaUploadField
                  existingMedia={projectMedia}
                  onExistingMediaReorder={handleExistingMediaReorder}
                  onExistingMediaDelete={handleExistingMediaDelete}
                  newFiles={selectedFiles}
                  onNewFilesChange={setSelectedFiles}
                  disabled={isSubmitting}
                />

                {(project.versionCount ?? 0) > 0 ? (
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-sm text-zinc-600">
                      Files are now managed through versions.{" "}
                      <Link href={`/project/${id}/versions`} className="text-zinc-900 font-medium hover:underline">
                        View versions
                      </Link>
                    </p>
                  </div>
                ) : (
                  <FileUploadField
                    existingFiles={projectFiles?.map((f) => ({
                      _id: f._id,
                      filename: f.filename,
                      fileSize: f.fileSize,
                    }))}
                    onExistingFileDelete={handleExistingFileDelete}
                    newFiles={newProjectFiles}
                    onNewFilesChange={setNewProjectFiles}
                    disabled={isSubmitting}
                  />
                )}
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button type="submit" className="whitespace-nowrap" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/project/${id}`)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </section>

            <section className="w-full lg:sticky lg:top-10 lg:self-start space-y-4">
              {(project.versionCount ?? 0) > 0 ? (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-sm text-zinc-600">
                    Links are now managed through versions.{" "}
                    <Link href={`/project/${id}/versions`} className="text-zinc-900 font-medium hover:underline">
                      View versions
                    </Link>
                  </p>
                </div>
              ) : (
                <LinksEditor links={links} onChange={setLinks} disabled={isSubmitting} />
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label htmlFor="readinessStatus" className="text-sm font-medium text-zinc-900">
                    How rough is it?
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-zinc-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="space-y-1.5 text-xs">
                        <p><strong>Just an idea:</strong> Haven&apos;t started building yet.</p>
                        <p><strong>Early prototype:</strong> First attempt. It&apos;s rough but shows the concept.</p>
                        <p><strong>Mostly working:</strong> Core functionality works, still has rough edges.</p>
                        <p><strong>Ready to use:</strong> Works reliably. Someone else could pick it up now.</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="space-y-3 pt-1">
                  <Slider
                    id="readinessStatus"
                    min={0}
                    max={3}
                    step={1}
                    value={[readinessSliderValues.indexOf(selectedReadinessStatus)]}
                    onValueChange={([val]) => setSelectedReadinessStatus(readinessSliderValues[val])}
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

            </section>
          </div>
        </form>
      </main>
    </div>
  );
}
