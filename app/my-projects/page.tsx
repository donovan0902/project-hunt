"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

type Project = {
  _id: Id<"projects">;
  name: string;
  summary: string;
  team: string;
  upvotes: number;
  status: "pending" | "active";
  creatorName: string;
  creatorAvatar: string;
};

export default function MyProjectsPage() {
  const router = useRouter();
  const projects = useQuery(api.projects.getUserProjects);

  const activeProjects = projects?.filter((p) => p.status === "active") || [];
  const pendingProjects = projects?.filter((p) => p.status === "pending") || [];

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 pb-16 pt-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">My Projects</h1>
          </div>
          <Button onClick={() => router.push("/submit")}>
            Submit New Project
          </Button>
        </div>

        {!projects ? (
          <div className="py-12 text-center text-sm text-zinc-500">
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-3xl bg-zinc-100/60 p-12 text-center">
            <p className="text-lg font-medium text-zinc-900">No projects yet</p>
            <p className="mt-2 text-sm text-zinc-500">
              Get started by submitting your first project
            </p>
            <Button
              onClick={() => router.push("/submit")}
              className="mt-6"
            >
              Submit Project
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Pending Projects */}
            {pendingProjects.length > 0 && (
              <section>
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-zinc-900">
                    Pending Review
                  </h2>
                </div>
                <div className="space-y-3">
                  {pendingProjects.map((project) => (
                    <ProjectCard key={project._id} project={project} />
                  ))}
                </div>
              </section>
            )}

            {/* Active Projects */}
            {activeProjects.length > 0 && (
              <section>
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-zinc-900">
                    Published Projects
                  </h2>
                </div>
                <div className="space-y-3">
                  {activeProjects.map((project) => (
                    <ProjectCard key={project._id} project={project} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();

  const handleClick = () => {
    if (project.status === "active") {
      router.push(`/project/${project._id}`);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/project/${project._id}/edit`);
  };

  return (
    <div
      className={`rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-900/5 ${
        project.status === "active"
          ? "cursor-pointer hover:shadow-md transition-shadow"
          : ""
      }`}
      onClick={handleClick}
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-zinc-900">
                {project.name}
              </h3>
              {project.status === "pending" && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  Pending
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-zinc-500">{project.summary}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-600">
              <span>↑</span>
              <span>{project.upvotes}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
            >
              Edit
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
          <span className="flex items-center gap-2">
            <Avatar className="h-8 w-8 bg-zinc-100 text-xs font-semibold text-zinc-600">
              <AvatarImage src={project.creatorAvatar} alt={project.creatorName || "User"} />
              <AvatarFallback>{(project.creatorName || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span>
              By <span className="font-medium text-zinc-900">{project.creatorName || "Unknown User"}</span>
            </span>
          </span>
          <Separator orientation="vertical" className="h-5" />
          <span>
            Team <span className="font-medium text-zinc-900">{project.team}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
