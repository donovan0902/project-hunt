"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Project = {
  _id: Id<"projects">;
  name: string;
  summary: string;
  team: string;
  lead: string;
  leadInitials: string;
  upvotes: number;
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
  const router = useRouter();
  const [query, setQuery] = useState("");
  const projects = useQuery(api.projects.list);
  const upvoteProject = useMutation(api.projects.upvote);

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((project) => {
      return (
        project.name.toLowerCase().includes(q) ||
        project.summary.toLowerCase().includes(q) ||
        project.team.toLowerCase().includes(q) ||
        project.lead.toLowerCase().includes(q)
      );
    });
  }, [query, projects]);

  const handleUpvote = async (projectId: Id<"projects">) => {
    try {
      await upvoteProject({ projectId });
    } catch (error) {
      console.error("Failed to upvote:", error);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-16 pt-10">
        <Header query={query} setQuery={setQuery} router={router} />
        <section className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
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

function Header({
  query,
  setQuery,
  router,
}: {
  query: string;
  setQuery: (value: string) => void;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <div>
          <p className="text-xl font-semibold text-zinc-900">Garden</p>
        </div>
      </div>
      <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search projects, teams, or leads"
          className="md:w-72"
        />
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="whitespace-nowrap"
            onClick={() => router.push("/submit")}
          >
            Share Project
          </Button>
          <Avatar className="h-10 w-10 border border-zinc-900/10 bg-zinc-900 text-white">
            <AvatarFallback className="bg-transparent text-sm font-medium text-white">
              DL
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
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

  const handleProjectClick = () => {
    router.push(`/project/${project._id}`);
  };

  const handleUpvoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpvote(project._id);
  };

  return (
    <div 
      className="flex flex-col gap-4 border-b border-zinc-200/80 pb-6 pt-6 first:pt-0 last:border-b-0 last:pb-0 cursor-pointer hover:bg-zinc-100 rounded-lg transition-colors px-4 -mx-4"
      onClick={handleProjectClick}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-zinc-900">{project.name}</h3>
          <p className="mt-1 text-sm text-zinc-500">{project.summary}</p>
        </div>
        <Button
          variant="outline"
          onClick={handleUpvoteClick}
          className="rounded-full border-zinc-200 px-4 py-2 text-sm font-semibold"
        >
          ↑ {project.upvotes}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
        <span className="flex items-center gap-2">
          <Avatar className="h-9 w-9 bg-zinc-100 text-sm font-semibold text-zinc-600">
            <AvatarFallback>{project.leadInitials}</AvatarFallback>
          </Avatar>
          <span>
            Lead <span className="font-medium text-zinc-900">{project.lead}</span>
          </span>
        </span>
        <Separator orientation="vertical" className="hidden h-6 lg:block" />
        <span>
          Team <span className="font-medium text-zinc-900">{project.team}</span>
        </span>
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
