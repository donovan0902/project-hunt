"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useAction, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/RichTextEditor";
import { isRichTextEmpty, stripHtml } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Info } from "lucide-react";
import { SimilarProjectsPreview } from "@/components/SimilarProjectsPreview";
import { SpacePicker } from "@/components/SpacePicker";
import { AdditionalSpacesPicker } from "@/components/AdditionalSpacesPicker";
import { MediaUploadField } from "@/components/MediaUploadField";
import { FileUploadField } from "@/components/FileUploadField";
import { uploadFile } from "@/lib/upload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { LinksEditor } from "@/components/LinksEditor";
import type { NewFileItem, NewProjectFileItem, LinkItem } from "@/lib/types";
import { useMentionSearch } from "@/hooks/use-mention-search";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

const readinessSliderValues = ["just_an_idea", "early_prototype", "mostly_working", "ready_to_use"] as const;
const readinessSliderLabels = ["Just an idea", "Early prototype", "Mostly working", "Ready to use"];

export default function SubmitProject() {
  const router = useRouter();
  const createProject = useAction(api.projects.create);
  const cancelProject = useAction(api.projects.cancelProject);
  const confirmProject = useMutation(api.projects.confirmProject);
  const generateUploadUrl = useMutation(api.projects.generateUploadUrl);
  const addMediaToProject = useMutation(api.projects.addMediaToProject);
  const addFileToProject = useMutation(api.projects.addFileToProject);
  const focusAreas = useQuery(api.focusAreas.listActive);
  const currentUser = useQuery(api.users.current);
  const [formData, setFormData] = useState({
    summary: "",
    workingTitle: "",
  });
  const [links, setLinks] = useState<LinkItem[]>([{ url: "", label: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<NewFileItem[]>([]);
  const [selectedProjectFiles, setSelectedProjectFiles] = useState<NewProjectFileItem[]>([]);
  const [selectedFocusArea, setSelectedFocusArea] = useState<Id<"focusAreas"> | "personal" | null>("personal");
  const [additionalSpaces, setAdditionalSpaces] = useState<Id<"focusAreas">[]>([]);
  const [selectedReadinessStatus, setSelectedReadinessStatus] = useState<"just_an_idea" | "early_prototype" | "mostly_working" | "ready_to_use">("just_an_idea");
  const mentionSearch = useMentionSearch();

  const handlePrimarySpaceChange = (selected: Id<"focusAreas"> | "personal" | null) => {
    setSelectedFocusArea(selected);
    // Remove the new primary from additional spaces if it was there
    if (selected && selected !== "personal") {
      setAdditionalSpaces((prev) => prev.filter((id) => id !== selected));
    }
  };

  const deriveName = () => {
    const title = formData.workingTitle.trim();
    if (title) return title;
    const summary = stripHtml(formData.summary);
    if (summary) return summary.length > 60 ? `${summary.slice(0, 60)}...` : summary;
    return "Shared solution";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const trimmedTitle = formData.workingTitle.trim();
    const summary = isRichTextEmpty(formData.summary) ? undefined : formData.summary;

    if (!trimmedTitle) {
      toast.error("Please add a title.");
      setIsSubmitting(false);
      return;
    }

    if (selectedFocusArea === null) {
      toast.error("Please choose a space for your project.");
      setIsSubmitting(false);
      return;
    }
    const name = deriveName();

    let createdProjectId: Id<"projects"> | null = null;

    try {
      // Create project first
      const filteredLinks = links
        .filter((l) => l.url.trim())
        .map((l) => ({ url: l.url.trim(), ...(l.label.trim() ? { label: l.label.trim() } : {}) }));

      const result = await createProject({
        name,
        summary,
        links: filteredLinks.length > 0 ? filteredLinks : undefined,
        focusAreaId: selectedFocusArea === "personal" ? undefined : selectedFocusArea ?? undefined,
        additionalFocusAreaIds: additionalSpaces.length > 0 ? additionalSpaces : undefined,
        readinessStatus: selectedReadinessStatus,
      });
      createdProjectId = result.projectId;

      // Upload and add media files if any are selected
      if (selectedFiles.length > 0) {
        await Promise.all(
          selectedFiles.map(async ({ file }) => {
            const { storageId, contentType } = await uploadFile(file, generateUploadUrl);

            await addMediaToProject({
              projectId: result.projectId,
              storageId,
              type: file.type.startsWith('video/') ? 'video' : 'image',
              contentType,
            });
          })
        );
      }

      // Upload project files if any are selected
      if (selectedProjectFiles.length > 0) {
        await Promise.all(
          selectedProjectFiles.map(async ({ file }) => {
            const { storageId, contentType } = await uploadFile(file, generateUploadUrl);

            await addFileToProject({
              projectId: result.projectId,
              storageId,
              filename: file.name,
              contentType,
              fileSize: file.size,
            });
          })
        );
      }

      // If no similar projects found, auto-confirm and go home
      if (result.similarProjects.length === 0) {
        await confirmProject({ projectId: result.projectId });
        router.push("/");
      } else {
        // Redirect to confirmation page to show similar projects
        router.push(`/submit/confirm?projectId=${result.projectId}`);
      }
    } catch (error) {
      if (createdProjectId) {
        try {
          await cancelProject({ projectId: createdProjectId });
        } catch (cancelError) {
          console.error("Failed to clean up pending project:", cancelError);
        }
      }
      console.error("Failed to create project:", error);
      toast.error("Failed to share. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const summaryForPreview = isRichTextEmpty(formData.summary) ? "" : formData.summary;

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
            <BreadcrumbItem>
              <BreadcrumbPage>Register a Tool</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="mb-2 flex items-center gap-3">
          <h2 className="text-3xl font-semibold tracking-tight">Register a tool in the catalog</h2>
          <Link href="/guidelines" className="text-sm text-zinc-500 underline underline-offset-4 hover:text-zinc-700">
            What can I post?
          </Link>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <section className="w-full">
              {/* Space Selectors — grouped */}
              <div className="space-y-3 mb-8">
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
                          Spaces organize the catalog by technology or topic, helping colleagues find tools relevant to their area.
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
                          Only your primary space appears on project cards. Add additional spaces to reach other communities where your project is also relevant.
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

              {/* Title and form tabs — grouped */}
              <div className="space-y-4">
                {/* Title - Required field */}
                <div className="space-y-2">
                  <Input
                    id="workingTitle"
                    className="h-11 border border-zinc-300 focus-visible:border-zinc-400"
                    value={formData.workingTitle}
                    onChange={(e) => setFormData({ ...formData, workingTitle: e.target.value })}
                    placeholder="Title"
                    aria-label="Title"
                    required
                  />
                </div>

                <Tabs defaultValue="details">
                <TabsList variant="line">
                  <TabsTrigger value="details" className="px-5">Details</TabsTrigger>
                  <TabsTrigger value="media" className="px-5">Files & media</TabsTrigger>
                  <TabsTrigger value="link" className="px-5">Link</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 pt-4">
                  <div className="space-y-2">

                    <RichTextEditor
                      value={formData.summary}
                      onChange={(value) => setFormData({ ...formData, summary: value })}
                      placeholder="What is it? (optional)"
                      aria-label="What is it? (optional)"
                      disabled={isSubmitting}
                      onMentionSearch={mentionSearch}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label htmlFor="readinessStatus" className="text-sm font-medium text-zinc-900">
                        Maturity level
                      </label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-zinc-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="space-y-1.5 text-xs">
                            <p><strong>Just an idea:</strong> Concept stage — not yet built.</p>
                            <p><strong>Early prototype:</strong> Initial build. Shows the concept but not production-ready.</p>
                            <p><strong>Mostly working:</strong> Core functionality is solid; some rough edges remain.</p>
                            <p><strong>Ready to use:</strong> Reliable enough for others to use without guidance.</p>
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
                </TabsContent>

                <TabsContent value="media" className="space-y-4 pt-4">
                  <MediaUploadField
                    newFiles={selectedFiles}
                    onNewFilesChange={setSelectedFiles}
                    disabled={isSubmitting}
                  />
                  <FileUploadField
                    newFiles={selectedProjectFiles}
                    onNewFilesChange={setSelectedProjectFiles}
                    disabled={isSubmitting}
                  />
                </TabsContent>

                <TabsContent value="link" className="space-y-4 pt-4">
                  <LinksEditor links={links} onChange={setLinks} disabled={isSubmitting} />
                </TabsContent>
              </Tabs>
              </div>

              <div className="flex items-center pt-4">
                <Button type="submit" className="whitespace-nowrap" disabled={isSubmitting}>
                  {isSubmitting ? "Sharing..." : "Share this"}
                </Button>
              </div>
            </section>

            <section className="w-full lg:sticky lg:top-10 lg:self-start">
              <SimilarProjectsPreview
                name={deriveName()}
                description={summaryForPreview}
              />
            </section>
          </div>

        </form>
      </main>
    </div>
  );
}
