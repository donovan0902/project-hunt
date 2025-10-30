"use client";

import { use } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { SignInButton } from "@clerk/nextjs";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { isAuthenticated } = useConvexAuth();
  const projectId = id as Id<"projects">;
  const project = useQuery(api.projects.getById, { projectId });
  const upvoteProject = useMutation(api.projects.upvote);

  const handleUpvote = async () => {
    try {
      await upvoteProject({ projectId });
    } catch (error) {
      console.error("Failed to upvote:", error);
    }
  };

  if (project === undefined) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="text-center text-zinc-500">Loading project...</div>
        </div>
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="text-center">
            <p className="text-xl font-semibold text-zinc-900">Project not found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/")}
            >
              Back to home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push("/")}
          >
            ← Back
          </Button>
          <Avatar className="h-10 w-10 border border-zinc-900/10 bg-zinc-900 text-white">
            <AvatarFallback className="bg-transparent text-sm font-medium text-white">
              DL
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="space-y-8">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-zinc-900">{project.name}</h1>
            </div>
            {isAuthenticated ? (
              <Button
                variant="outline"
                onClick={handleUpvote}
                className="rounded-full border-zinc-200 px-6 py-3 text-base font-semibold"
              >
                ↑ {project.upvotes}
              </Button>
            ) : (
              <SignInButton mode="modal">
                <Button
                  variant="outline"
                  className="rounded-full border-zinc-200 px-6 py-3 text-base font-semibold"
                >
                  ↑ {project.upvotes}
                </Button>
              </SignInButton>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-base">
            <span className="flex items-center gap-2">
              <Avatar className="h-10 w-10 bg-zinc-100 text-sm font-semibold text-zinc-600">
                <AvatarFallback>{project.leadInitials}</AvatarFallback>
              </Avatar>
              <span className="text-zinc-500">
                Lead <span className="font-medium text-zinc-900">{project.lead}</span>
              </span>
            </span>
            <Separator orientation="vertical" className="h-6" />
            <span className="text-zinc-500">
              Team <span className="font-medium text-zinc-900">{project.team}</span>
            </span>
          </div>

          <Separator />

          <div>
            <h2 className="mb-3 text-xl font-semibold text-zinc-900">About this project</h2>
            <p className="text-base leading-relaxed text-zinc-600">{project.summary}</p>
          </div>
        </div>
      </main>
    </div>
  );
}

