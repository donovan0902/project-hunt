"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function CreateTeam() {
  const router = useRouter();
  const createTeam = useAction(api.teams.createTeam);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createTeam({
        name: formData.name,
        description: formData.description || undefined,
      });

      router.push("/");
    } catch (error) {
      console.error("Failed to create team:", error);
      alert("Failed to create team. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-16 pt-10">
        <div className="mb-2">
          <h2 className="text-3xl font-semibold tracking-tight">Create a team</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Teams help organize projects and collaboration
          </p>
        </div>

        <section className="mx-auto w-full max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-zinc-900">
                Team name
              </label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Platform Engineering"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium text-zinc-900">
                Description <span className="text-xs text-zinc-500">(optional)</span>
              </label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What does your team work on?"
                className="min-h-24"
              />
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button type="submit" className="whitespace-nowrap" disabled={isSubmitting}>
                {isSubmitting ? "Creating Team..." : "Create Team"}
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
