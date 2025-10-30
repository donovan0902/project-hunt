"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { MessageCircle } from "lucide-react";


type Project = {
  _id: Id<"projects">;
  name: string;
  summary: string;
  team: string;
  upvotes: number;
  commentCount: number;
  hasUpvoted: boolean;
  creatorName: string;
  creatorAvatar: string;
};

const FORUMS = [
  {
    title: "AI epic fails",
    summary: "Share cautionary tales so we stop repeating the same experiments.",
    threads: 7,
    lastPost: "9:20 AM",
  },
  {
    title: "AI tips & tricks",
    summary: "Quick wins from crews that already automated the boring work.",
    threads: 12,
    lastPost: "Yesterday",
  },
  {
    title: "Launch blockers",
    summary: "Escalations that need cross-team eyes this week.",
    threads: 5,
    lastPost: "45 min ago",
  },
];


export default function Home() {
  const [query, setQuery] = useState("");
  const projects = useQuery(api.projects.list);
  const toggleUpvote = useMutation(api.projects.toggleUpvote);

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((project) => {
      return (
        project.name.toLowerCase().includes(q) ||
        project.summary.toLowerCase().includes(q) ||
        project.team.toLowerCase().includes(q) ||
        project.creatorName.toLowerCase().includes(q)
      );
    });
  }, [query, projects]);

  const handleUpvote = async (projectId: Id<"projects">) => {
    try {
      await toggleUpvote({ projectId });
    } catch (error) {
      console.error("Failed to toggle upvote:", error);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-16 pt-10">
        <section className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Who is working on what</h2>
            </div>
            <div className="space-y-0">
              {!projects ? (
                <div className="py-8 text-center text-sm text-zinc-500">
                  Loading projects...
                </div>
              ) : filteredProjects.length ? (
                filteredProjects.map((project) => (
                  <ProjectRow
                    key={project._id}
                    project={project}
                    onUpvote={handleUpvote}
                  />
                ))
              ) : (
                <EmptyState />
              )}
            </div>
          </div>

          <Forums />
        </section>
      </main>
    </div>
  );
}

function ProjectRow({
  project,
  onUpvote,
}: {
  project: Project;
  onUpvote: (projectId: Id<"projects">) => void;
}) {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();

  const handleProjectClick = () => {
    router.push(`/project/${project._id}`);
  };

  const handleUpvoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpvote(project._id);
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/project/${project._id}#discussion`);
  };

  return (
    <div
      className="grid gap-4 border-b border-zinc-200/80 pb-6 pt-6 last:border-b-0 cursor-pointer hover:bg-zinc-100 rounded-lg transition-colors px-4 -mx-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
      onClick={handleProjectClick}
    >
      <div className="min-w-0 space-y-4">
        <div className="min-w-0">
          <h3 className="text-xl font-semibold text-zinc-900">{project.name}</h3>
          <p className="mt-1 text-sm text-zinc-500 break-words">{project.summary}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
          <span className="flex items-center gap-2">
            <Avatar className="h-9 w-9 bg-zinc-100 text-sm font-semibold text-zinc-600">
              <AvatarImage src={project.creatorAvatar} alt={project.creatorName || "User"} />
              <AvatarFallback>{(project.creatorName || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span>
              By <span className="font-medium text-zinc-900">{project.creatorName || "Unknown User"}</span>
            </span>
          </span>
          <Separator orientation="vertical" className="hidden h-6 lg:block" />
          <span>
            Team <span className="font-medium text-zinc-900">{project.team}</span>
          </span>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={handleCommentClick}
          className="flex items-center gap-1 rounded-full border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900"
          aria-label={`View ${project.commentCount} comments`}
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          <span>{project.commentCount}</span>
        </Button>
        <div>
          {isAuthenticated ? (
            <Button
              variant={project.hasUpvoted ? "default" : "outline"}
              onClick={handleUpvoteClick}
              className="rounded-full px-4 py-2 text-sm font-semibold"
            >
              ↑ {project.upvotes}
            </Button>
          ) : (
            <SignInButton mode="modal">
              <Button
                variant="outline"
                onClick={(e) => e.stopPropagation()}
                className="rounded-full border-zinc-200 px-4 py-2 text-sm font-semibold"
              >
                ↑ {project.upvotes}
              </Button>
            </SignInButton>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl bg-zinc-100/60 p-6 text-center text-sm text-zinc-500">
      <p className="font-medium text-zinc-900">No projects match your search.</p>
    </div>
  );
}

function Forums() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-2xl font-semibold text-zinc-900">Discussion threads</h3>
      </div>
      <div className="flex flex-col divide-y divide-zinc-200 border-t border-zinc-200">
        {FORUMS.map((forum) => (
          <div key={forum.title} className="py-4">
            <p className="text-base font-semibold text-zinc-900">h/{forum.title}</p>
            <p className="text-sm text-zinc-500">{forum.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
