"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { SimilarProjectsPreview } from "@/components/SimilarProjectsPreview";
import { FocusAreaPicker } from "@/components/FocusAreaPicker";

export default function SubmitProject() {
  const router = useRouter();
  const createProject = useAction(api.projects.create);
  const confirmProject = useMutation(api.projects.confirmProject);
  const generateUploadUrl = useMutation(api.projects.generateUploadUrl);
  const addMediaToProject = useMutation(api.projects.addMediaToProject);
  const focusAreasGrouped = useQuery(api.focusAreas.listActiveGrouped);
  const [formData, setFormData] = useState({
    name: "",
    headline: "",
    description: "",
    link: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    

    try {
      // Create project first
      const result = await createProject({
        name: formData.name,
        summary: formData.description,
        headline: formData.headline || undefined,
        link: formData.link || undefined,
        focusAreaIds: selectedFocusAreas.length > 0 ? selectedFocusAreas : undefined,
      });

      // Upload and add media files if any are selected
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
              projectId: result.projectId,
              storageId,
              type: file.type.startsWith('video/') ? 'video' : 'image',
              contentType: file.type,
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
      console.error("Failed to create project:", error);
      alert("Failed to submit project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-16 pt-10">
        <div className="mb-2">
          <h2 className="text-3xl font-semibold tracking-tight">Share a project</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Let everyone know what you&apos;re working on
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="w-full">

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
                placeholder="Description of what you're building. Who is it for? What is it? What problems does it solve?"
                className="min-h-24"
                minLength={200}
                required
              />
              <p className="text-xs text-zinc-500">
                {formData.description.length}/200 characters minimum
              </p>
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
                      <span className="text-zinc-500">
                        Include media that helps viewers understand what your project is, what it does, and how it works.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {fileRejections.length > 0 && (
                <div className="text-sm text-red-600 mt-2">
                  Invalid file type(s): {fileRejections.map(({ file }) => file.name).join(', ')}.
                  Please upload images or videos only.
                </div>
              )}

              {selectedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-sm font-medium text-zinc-900">
                    Selected files ({selectedFiles.length})
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
                          onClick={() => removeFile(index)}
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

            <div className="flex items-center pt-4">
              <Button type="submit" className="whitespace-nowrap" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Project"}
              </Button>
            </div>
          </form>
          </section>

          <section className="w-full lg:sticky lg:top-10 lg:self-start">
            <SimilarProjectsPreview
              name={formData.name}
              headline={formData.headline}
              description={formData.description}
            />
          </section>
        </div>
      </main>
    </div>
  );
}

