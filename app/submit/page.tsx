"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function SubmitProject() {
  const router = useRouter();
  const createProject = useAction(api.projects.create);
  const confirmProject = useMutation(api.projects.confirmProject);
  const [formData, setFormData] = useState({
    name: "",
    headline: "",
    description: "",
    team: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const result = await createProject({
        name: formData.name,
        summary: formData.description,
        team: formData.team,
        headline: formData.headline || undefined,
      });
      
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
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-16 pt-10">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xl font-semibold text-zinc-900">Garden</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="whitespace-nowrap"
            >
              Back to Projects
            </Button>
            <Avatar className="h-10 w-10 border border-zinc-900/10 bg-zinc-900 text-white">
              <AvatarFallback className="bg-transparent text-sm font-medium text-white">
                DL
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        <section className="mx-auto w-full max-w-2xl">
          <div className="mb-6">
            <h2 className="text-3xl font-semibold tracking-tight">Share a project</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Let everyone know what you&apos;re working on
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
                {isSubmitting ? "Submitting..." : "Submit Project"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/")}
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

