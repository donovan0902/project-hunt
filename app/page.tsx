"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Project = {
  id: string;
  name: string;
  summary: string;
  team: string;
  lead: string;
  leadInitials: string;
  upvotes: number;
};

const PROJECTS: Project[] = [
  {
    id: "atlas",
    name: "Atlas Deploy Hub",
    summary: "Release orchestration so every org can cut a build without core ops handoffs.",
    team: "Platform Ops",
    lead: "Maya Patel",
    leadInitials: "MP",
    upvotes: 42,
  },
  {
    id: "pulse",
    name: "Pulse AI Coach",
    summary: "Slack assistant surfacing customer blockers straight to the squad channels.",
    team: "Intelligence Guild",
    lead: "Evan Lee",
    leadInitials: "EL",
    upvotes: 35,
  },
  {
    id: "northstar",
    name: "Northstar Live Boards",
    summary: "Always-on view of OKRs with telemetry so reviews stop depending on slide decks.",
    team: "Insights Studio",
    lead: "Riley Chen",
    leadInitials: "RC",
    upvotes: 21,
  },
  {
    id: "handoff",
    name: "Voyager Handoff Kit",
    summary: "Playbooks plus scorecards that make remote project transitions painless.",
    team: "Workplace Lab",
    lead: "June Park",
    leadInitials: "JP",
    upvotes: 12,
  },
];

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
  const [votes, setVotes] = useState<Record<string, number>>(() => {
    return PROJECTS.reduce((acc, project) => {
      acc[project.id] = project.upvotes;
      return acc;
    }, {} as Record<string, number>);
  });

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PROJECTS;
    return PROJECTS.filter((project) => {
      return (
        project.name.toLowerCase().includes(q) ||
        project.summary.toLowerCase().includes(q) ||
        project.team.toLowerCase().includes(q) ||
        project.lead.toLowerCase().includes(q)
      );
    });
  }, [query]);

  const handleUpvote = (projectId: string) => {
    setVotes((prev) => ({
      ...prev,
      [projectId]: (prev[projectId] ?? 0) + 1,
    }));
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-16 pt-10">
        <Header query={query} setQuery={setQuery} />
        <section className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Who is working on what</h2>
            </div>
            <div className="space-y-0">
              {filteredProjects.length ? (
                filteredProjects.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    votes={votes[project.id] ?? project.upvotes}
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
}: {
  query: string;
  setQuery: (value: string) => void;
}) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <div>
          <p className="text-xl font-semibold text-zinc-900">Project Hunt</p>
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
          <Button variant="outline" className="whitespace-nowrap">
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
  votes,
  onUpvote,
}: {
  project: Project;
  votes: number;
  onUpvote: (projectId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-zinc-200/80 pb-6 pt-6 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-zinc-900">{project.name}</h3>
          <p className="mt-1 text-sm text-zinc-500">{project.summary}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => onUpvote(project.id)}
          className="rounded-full border-zinc-200 px-4 py-2 text-sm font-semibold"
        >
          ↑ {votes}
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
      <p>Share a quick update so leadership sees it here.</p>
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
