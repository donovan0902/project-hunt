"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Id } from "@/convex/_generated/dataModel";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { FocusAreaPicker } from "@/components/FocusAreaPicker";

function ExistingMediaThumbnail({
  media,
  onDelete,
}: {
  media: {
    _id: Id<"mediaFiles">;
    storageId: Id<"_storage">;
    type: string;
  };
  onDelete: () => void;
}) {
  const mediaUrl = useQuery(api.projects.getMediaUrl, { storageId: media.storageId });

  if (!mediaUrl) {
    return (
      <div className="aspect-square rounded-lg border border-zinc-200 bg-zinc-100 overflow-hidden flex items-center justify-center">
        <div className="text-xs text-zinc-400">Loading...</div>
      </div>
    );
  }

  const isVideo = media.type === 'video';

  return (
    <div className="relative group">
      <div className="aspect-square rounded-lg border border-zinc-200 bg-zinc-100 overflow-hidden">
        {isVideo ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-4xl">🎥</div>
          </div>
        ) : (
          <Image
            src={mediaUrl}
            alt="Project media"
            width={200}
            height={200}
            className="h-full w-full object-cover"
            unoptimized
          />
        )}
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors"
      >
        ×
      </button>
    </div>
  );
}

export default function EditProject({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const projectId = id as Id<"projects">;
  const project = useQuery(api.projects.getById, { projectId });
  const projectMedia = useQuery(api.projects.getProjectMedia, { projectId });
  const updateProject = useAction(api.projects.updateProject);
  const generateUploadUrl = useMutation(api.projects.generateUploadUrl);
  const deleteMediaFromProject = useMutation(api.projects.deleteMediaFromProject);
  const addMediaToProject = useMutation(api.projects.addMediaToProject);
  const focusAreasGrouped = useQuery(api.focusAreas.listActiveGrouped);

  const [formData, setFormData] = useState({
    name: "",
    headline: "",
    description: "",
    link: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<Id<"focusAreas">[]>([]);

  const { getRootProps, getInputProps, fileRejections, isDragActive } = useDropzone({
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'video/mp4': ['.mp4'],
      'video/webm': ['.webm'],
    },
    onDrop: (acceptedFiles) => {
      setSelectedFiles(prev => [...prev, ...acceptedFiles]);
    },
  });

  const removeNewFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingFile = async (mediaId: Id<"mediaFiles">) => {
    try {
      await deleteMediaFromProject({ projectId, mediaId });
    } catch (error) {
      console.error("Failed to delete media:", error);
      alert("Failed to delete media. Please try again.");
    }
  };

  // Populate form when project data loads
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        headline: project.headline || "",
        description: project.summary,
        link: project.link || "",
      });
      setSelectedFocusAreas(project.focusAreaIds || []);
      setIsLoading(false);
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Update project fields
      await updateProject({
        projectId,
        name: formData.name,
        summary: formData.description,
        headline: formData.headline || undefined,
        link: formData.link || undefined,
        focusAreaIds: selectedFocusAreas.length > 0 ? selectedFocusAreas : undefined,
      });

      // Upload and add new media files if any are selected
      if (selectedFiles.length > 0) {
        await Promise.all(
          selectedFiles.map(async (file) => {
            // Generate upload URL
            const uploadUrl = await generateUploadUrl();

            // Upload file to storage
            const uploadResult = await fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": file.type },
              body: file,
            });

            if (!uploadResult.ok) {
              throw new Error(`Failed to upload ${file.name}`);
            }

            const { storageId } = await uploadResult.json();

            // Add media to project with metadata
            await addMediaToProject({
              projectId,
              storageId,
              type: file.type.startsWith('video/') ? 'video' : 'image',
              contentType: file.type,
            });
          })
        );
      }

      router.push(`/project/${id}`);
    } catch (error) {
      console.error("Failed to update project:", error);
      alert("Failed to update project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-16 pt-10">
          <p className="text-zinc-500">Loading...</p>
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-16 pt-10">
          <p className="text-zinc-500">Project not found</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-16 pt-10">

        <section className="mx-auto w-full max-w-2xl">
          <div className="mb-6">
            <h2 className="text-3xl font-semibold tracking-tight">Edit project</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Update your project details
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-zinc-900">
                Project name
              </label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Atlas Deploy Hub"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="headline" className="text-sm font-medium text-zinc-900">
                Headline <span className="text-xs text-zinc-500">(optional)</span>
              </label>
              <Input
                id="headline"
                value={formData.headline}
                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                placeholder="Your project one-liner"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium text-zinc-900">
                Description
              </label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description of what you're building"
                className="min-h-24"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="link" className="text-sm font-medium text-zinc-900">
                Link <span className="text-xs text-zinc-500">(optional)</span>
              </label>
              <Input
                id="link"
                type="url"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="https://example.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-900">
                Focus Areas <span className="text-xs text-zinc-500">(optional)</span>
              </label>
              <FocusAreaPicker
                focusAreasGrouped={focusAreasGrouped}
                selectedFocusAreas={selectedFocusAreas}
                onSelectionChange={setSelectedFocusAreas}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-900">
                Media <span className="text-xs text-zinc-500">(optional)</span>
              </label>

              {/* Existing Media Files */}
              {projectMedia && projectMedia.length > 0 && (
                <div className="mb-4 space-y-2">
                  <div className="text-sm font-medium text-zinc-700">
                    Current media ({projectMedia.length})
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {projectMedia.map((media) => (
                      <ExistingMediaThumbnail
                        key={media._id}
                        media={media}
                        onDelete={() => removeExistingFile(media._id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Upload New Files */}
              <div
                {...getRootProps()}
                className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
                  isDragActive
                    ? 'border-zinc-900 bg-zinc-100'
                    : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400'
                }`}
              >
                <input {...getInputProps()} />
                <div className="space-y-2">
                  <Upload className="mx-auto h-10 w-10 text-zinc-400" />
                  <div className="text-sm text-zinc-600">
                    {isDragActive ? (
                      <span className="font-medium text-zinc-900">Drop files here</span>
                    ) : (
                      <>
                        <span className="font-medium text-zinc-900">Click to upload</span> or drag and drop
                      </>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500">
                    Images (PNG, JPG, GIF, WebP) or Videos (MP4, WebM)
                  </div>
                </div>
              </div>

              {fileRejections.length > 0 && (
                <div className="text-sm text-red-600 mt-2">
                  Invalid file type(s): {fileRejections.map(({ file }) => file.name).join(', ')}.
                  Please upload images or videos only.
                </div>
              )}

              {/* New Files to Upload */}
              {selectedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-sm font-medium text-zinc-700">
                    New files to add ({selectedFiles.length})
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg border border-zinc-200 bg-zinc-100 overflow-hidden">
                          {file.type.startsWith('image/') ? (
                            <Image
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              width={200}
                              height={200}
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <div className="text-4xl">🎥</div>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeNewFile(index)}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors"
                        >
                          ×
                        </button>
                        <div className="mt-1 text-xs text-zinc-500 truncate">
                          {file.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
          </form>
        </section>
      </main>
    </div>
  );
}
