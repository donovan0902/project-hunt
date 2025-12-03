"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, LayoutGroup } from "motion/react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { MessageCircle } from "lucide-react";
import { FocusAreaBadges } from "@/components/FocusAreaBadges";
import { ReadinessBadge } from "@/components/ReadinessBadge";

type FocusArea = {
  _id: Id<"focusAreas">;
  name: string;
  group: string;
};

type Project = {
  _id: Id<"projects">;
  name: string;
  summary: string;
  headline?: string;
  team?: string;
  upvotes: number;
  commentCount: number;
  hasUpvoted: boolean;
  creatorName: string;
  creatorAvatar: string;
  focusAreas: FocusArea[];
  readinessStatus?: "in_progress" | "ready_to_use";
};

type NewestProject = {
  _id: Id<"projects">;
  name: string;
  headline?: string;
  team: string;
  upvotes: number;
  creatorName: string;
  creatorAvatar: string;
  _creationTime: number;
};

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffInSeconds = Math.floor((now - timestamp) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 604800)}w ago`;
}

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
        (project.headline && project.headline.toLowerCase().includes(q)) ||
        (project.team && project.team.toLowerCase().includes(q)) ||
        project.creatorName.toLowerCase().includes(q) ||
        project.focusAreas.some((area) =>
          area.name.toLowerCase().includes(q) ||
          area.group.toLowerCase().includes(q)
        )
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
              <h2 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
                What people at Honda are building
                <Badge className="text-xs font-medium">For you</Badge>
              </h2>
              <p className="mt-2 text-lg text-zinc-600">This week&apos;s most popular projects, based on your interests</p>
            </div>
            <ShareProjectCallout />
            <LayoutGroup>
              <div className="space-y-0">
                {!projects ? (
                  <div className="py-8 text-center text-sm text-zinc-500">
                    Loading projects...
                  </div>
                ) : filteredProjects.length ? (
                  filteredProjects.map((project) => (
                    <motion.div
                      key={project._id}
                      layout
                      layoutId={project._id}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    >
                      <ProjectRow
                        project={project}
                        onUpvote={handleUpvote}
                      />
                    </motion.div>
                  ))
                ) : (
                  <EmptyState />
                )}
              </div>
            </LayoutGroup>
          </div>

          <NewestProjects />
        </section>
      </main>
    </div>
  );
}

function ShareProjectCallout() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white/90 px-4 py-3 shadow-sm">
      <div className="space-y-1">
        <p className="text-sm text-zinc-600">
          Have something cool to share? Post a project so others can follow along.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Authenticated>
          <Link href="/submit">
            <Button size="sm" className="whitespace-nowrap">
              Submit a project
            </Button>
          </Link>
        </Authenticated>
        <Unauthenticated>
            <Button size="sm" className="whitespace-nowrap" asChild>
              <Link href="/sign-in">
                Submit a project
              </Link>
            </Button>
        </Unauthenticated>
        <AuthLoading>
          <Button size="sm" className="whitespace-nowrap" disabled>
            Submit a project
          </Button>
        </AuthLoading>
      </div>
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
      className="grid gap-3 pb-4 pt-4 cursor-pointer hover:bg-zinc-100 rounded-lg transition-colors px-4 -mx-4 sm:grid-cols-[minmax(0,1fr)_auto]"
      onClick={handleProjectClick}
    >
      <div className="min-w-0 space-y-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xl font-semibold text-zinc-900">{project.name}</h3>
            <ReadinessBadge status={project.readinessStatus} />
          </div>
          {project.headline && (
            <p className="mt-1 text-sm text-zinc-500 break-words">
              {project.headline}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={handleCommentClick}
          className="flex min-h-[3.25rem] min-w-[4rem] flex-col items-center justify-center gap-1 rounded-2xl border-zinc-200 px-3 py-3 text-sm font-semibold leading-tight hover:!bg-background hover:!text-foreground hover:ring-2 hover:ring-accent hover:ring-offset-2 transition-all"
          aria-label={`View ${project.commentCount} comments`}
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm font-semibold">{project.commentCount}</span>
        </Button>
        <div>
          {isAuthenticated ? (
            <motion.div whileTap={{ scale: 1.15, rotate: -3 }} transition={{ type: "spring", stiffness: 800, damping: 20 }}>
              <Button
                variant={project.hasUpvoted ? "default" : "outline"}
                onClick={handleUpvoteClick}
                className={`flex min-h-[3.25rem] min-w-[4rem] flex-col items-center justify-center gap-1 rounded-2xl px-3 py-3 text-sm font-semibold leading-tight hover:ring-2 hover:ring-accent hover:ring-offset-2 transition-all ${project.hasUpvoted ? "hover:!bg-primary hover:!text-primary-foreground" : "hover:!bg-background hover:!text-foreground"}`}
              >
                <span aria-hidden="true" className="text-inherit">↑</span>
                <span className="text-sm font-semibold text-inherit">{project.upvotes}</span>
              </Button>
            </motion.div>
          ) : (
            <motion.div whileTap={{ scale: 1.15, rotate: -3 }} transition={{ type: "spring", stiffness: 800, damping: 20 }}>
                <Button
                  variant="outline"
                  onClick={(e) => e.stopPropagation()}
                  className="flex min-h-[3.25rem] min-w-[4rem] flex-col items-center justify-center gap-1 rounded-2xl border-zinc-200 px-3 py-3 text-sm font-semibold leading-tight hover:!bg-background hover:!text-foreground hover:ring-2 hover:ring-accent hover:ring-offset-2 transition-all"
                >
                  <Link href="/sign-in">
                    <span aria-hidden="true" className="text-inherit">↑</span>
                    <span className="text-sm font-semibold text-inherit">{project.upvotes}</span>
                  </Link>
                </Button>
            </motion.div>
          )}
        </div>
      </div>
      <div className="sm:col-span-2 flex flex-wrap items-center gap-3 text-sm text-zinc-500 sm:flex-nowrap">
        <span className="flex items-center gap-2 whitespace-nowrap">
          <Avatar className="h-9 w-9 bg-zinc-100 text-sm font-semibold text-zinc-600">
            <AvatarImage src={project.creatorAvatar} alt={project.creatorName || "User"} />
            <AvatarFallback>{(project.creatorName || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span>
            By <span className="font-medium text-zinc-900">{project.creatorName || "Unknown User"}</span>
          </span>
        </span>
        {project.team && (
          <>
            <span className="text-zinc-300">•</span>
            <span className="whitespace-nowrap">
              Team <span className="font-medium text-zinc-900">{project.team}</span>
            </span>
          </>
        )}
        {project.focusAreas.length > 0 && (
          <>
            <span className="text-zinc-300">•</span>
            <FocusAreaBadges
              focusAreas={project.focusAreas}
              className="min-w-0 flex-1 text-xs"
            />
          </>
        )}
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

function NewestProjectCard({ project }: { project: NewestProject }) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/project/${project._id}`);
  };

  return (
    <div
      className="cursor-pointer space-y-2 rounded-lg p-3 transition-colors hover:bg-zinc-100"
      onClick={handleClick}
    >
      {/* Project Name */}
      <div className="flex items-center gap-2">
        <h4 className="font-semibold text-zinc-900 text-sm leading-tight line-clamp-2 flex-1">
          {project.name}
        </h4>
        <span className="text-xs text-zinc-500 whitespace-nowrap">
          {getRelativeTime(project._creationTime)}
        </span>
      </div>

      {/* Headline (if available) */}
      {project.headline && (
        <p className="text-xs text-zinc-600 line-clamp-2">
          {project.headline}
        </p>
      )}

      {/* Metadata: Team, Upvotes */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        {project.team && (
          <>
            <span className="font-medium text-zinc-700">{project.team}</span>
            <span>•</span>
          </>
        )}
        <span className="flex items-center gap-1">
          <span>↑</span>
          <span>{project.upvotes}</span>
        </span>
      </div>
    </div>
  );
}

function NewestProjects() {
  const newestProjects = useQuery(api.projects.getNewestProjects, { limit: 5 });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h3 className="text-2xl font-semibold text-zinc-900">Newest projects</h3>
      </div>

      {!newestProjects ? (
        // Loading state
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-4 bg-zinc-200 rounded w-3/4"></div>
              <div className="h-3 bg-zinc-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : newestProjects.length === 0 ? (
        // Empty state
        <p className="text-sm text-zinc-500">No projects yet.</p>
      ) : (
        // Projects list
        <div className="flex flex-col gap-3">
          {newestProjects.map((project) => (
            <NewestProjectCard key={project._id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
