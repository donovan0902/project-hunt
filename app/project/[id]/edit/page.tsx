"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Id } from "@/convex/_generated/dataModel";

export default function EditProject({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const projectId = id as Id<"projects">;
  const project = useQuery(api.projects.getById, { projectId });
  const updateProject = useMutation(api.projects.updateProject);

  const [formData, setFormData] = useState({
    name: "",
    headline: "",
    description: "",
    team: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Populate form when project data loads
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        headline: project.headline || "",
        description: project.summary,
        team: project.team,
      });
      setIsLoading(false);
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await updateProject({
        projectId,
        name: formData.name,
        summary: formData.description,
        team: formData.team,
        headline: formData.headline || undefined,
      });

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
        <div className="mb-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/project/${id}`)}
          >
            ← Back to Project
          </Button>
        </div>

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
              <label htmlFor="team" className="text-sm font-medium text-zinc-900">
                Team
              </label>
              <Input
                id="team"
                value={formData.team}
                onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                placeholder="Platform Ops"
                required
              />
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
