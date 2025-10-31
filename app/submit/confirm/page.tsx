"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

type Project = {
  _id: Id<"projects">;
  name: string;
  summary: string;
  headline?: string;
  team: string;
  upvotes: number;
  status?: "pending" | "active";
  creatorName: string;
  creatorAvatar: string;
};

function ConfirmSubmissionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") as Id<"projects"> | null;
  const [isProcessing, setIsProcessing] = useState(false);
  const [similarProjects, setSimilarProjects] = useState<Project[]>([]);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(true);

  const project = useQuery(
    api.projects.getById,
    projectId ? { projectId } : "skip"
  );
  const confirmProject = useMutation(api.projects.confirmProject);
  const cancelProject = useAction(api.projects.cancelProject);
  const getSimilarProjects = useAction(api.projects.getSimilarProjects);

  // Fetch similar projects when component mounts
  useEffect(() => {
    if (projectId) {
      getSimilarProjects({ projectId })
        .then((projects) => {
          setSimilarProjects(projects);
          setIsLoadingSimilar(false);
        })
        .catch((error) => {
          console.error("Failed to fetch similar projects:", error);
          setIsLoadingSimilar(false);
        });
    }
  }, [projectId, getSimilarProjects]);

  const handleConfirm = async () => {
    if (!projectId) return;
    setIsProcessing(true);

    try {
      await confirmProject({ projectId });
      router.push("/");
    } catch (error) {
      console.error("Failed to confirm project:", error);
      alert("Failed to confirm project. Please try again.");
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!projectId) return;
    setIsProcessing(true);

    try {
      await cancelProject({ projectId });
      router.push("/");
    } catch (error) {
      console.error("Failed to cancel project:", error);
      alert("Failed to cancel project. Please try again.");
      setIsProcessing(false);
    }
  };

  if (!projectId) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-16 pt-10">
          <p className="text-center text-zinc-500">Invalid project ID</p>
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-16 pt-10">
          <p className="text-center text-zinc-500">Loading...</p>
        </main>
      </div>
    );
  }

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
            <Avatar className="h-10 w-10 border border-zinc-900/10 bg-zinc-900 text-white">
              <AvatarFallback className="bg-transparent text-sm font-medium text-white">
                DL
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        <section className="mx-auto w-full max-w-3xl space-y-8">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">
              Review your submission
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              We found similar projects that might interest you
            </p>
          </div>

          {/* User's submitted project */}
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-900/5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Your Project
            </p>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-zinc-900">
                  {project.name}
                </h3>
                {project.headline && (
                  <p className="mt-1 text-sm text-zinc-500">
                    {project.headline}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
                <span className="flex items-center gap-2">
                  <Avatar className="h-9 w-9 bg-zinc-100 text-sm font-semibold text-zinc-600">
                    <AvatarImage src={project.creatorAvatar} alt={project.creatorName || "User"} />
                    <AvatarFallback>{(project.creatorName || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span>
                    By{" "}
                    <span className="font-medium text-zinc-900">
                      {project.creatorName || "Unknown User"}
                    </span>
                  </span>
                </span>
                <Separator
                  orientation="vertical"
                  className="hidden h-6 lg:block"
                />
                <span>
                  Team{" "}
                  <span className="font-medium text-zinc-900">
                    {project.team}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Similar projects section */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">
                  Similar projects found
                </h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Consider reaching out to collaborate instead of starting from
                  scratch
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {isLoadingSimilar ? (
                <div className="rounded-2xl bg-zinc-100/60 p-4 text-center text-sm text-zinc-500">
                  Loading similar projects...
                </div>
              ) : similarProjects.length > 0 ? (
                similarProjects.map((similar) => (
                  <SimilarProjectCard key={similar._id} project={similar} />
                ))
              ) : (
                <div className="rounded-2xl bg-zinc-100/60 p-4 text-center text-sm text-zinc-500">
                  No similar projects found
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="flex-1 whitespace-nowrap"
            >
              {isProcessing ? "Processing..." : "Confirm & Post Project"}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isProcessing}
              className="flex-1 whitespace-nowrap"
            >
              Cancel Submission
            </Button>
          </div>

          <p className="text-center text-xs text-zinc-400">
            Canceling will remove your project from our system
          </p>
        </section>
      </main>
    </div>
  );
}

export default function ConfirmSubmission() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50">
          <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-16 pt-10">
            <p className="text-center text-zinc-500">Loading...</p>
          </main>
        </div>
      }
    >
      <ConfirmSubmissionContent />
    </Suspense>
  );
}

function SimilarProjectCard({ project }: { project: Project }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-900/5">
      <div className="space-y-3">
        <div>
          <h4 className="text-base font-semibold text-zinc-900">
            {project.name}
          </h4>
          {project.headline && (
            <p className="mt-1 text-sm text-zinc-600">
              {project.headline}
            </p>
          )}
          <p className="mt-1 text-sm text-zinc-500">
            {project.summary}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-2">
            <Avatar className="h-7 w-7 bg-zinc-100 text-xs font-semibold text-zinc-600">
              <AvatarImage src={project.creatorAvatar} alt={project.creatorName || "User"} />
              <AvatarFallback>{(project.creatorName || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span>
              By{" "}
              <span className="font-medium text-zinc-900">{project.creatorName || "Unknown User"}</span>
            </span>
          </span>
          <Separator
            orientation="vertical"
            className="hidden h-4 lg:block"
          />
          <span>
            Team{" "}
            <span className="font-medium text-zinc-900">{project.team}</span>
          </span>
          <Separator
            orientation="vertical"
            className="hidden h-4 lg:block"
          />
          <span className="flex items-center gap-1">
            <span>↑</span>
            <span className="font-medium text-zinc-900">
              {project.upvotes}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

