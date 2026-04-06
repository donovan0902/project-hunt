"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/app/useCurrentUser";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReadinessBadge } from "@/components/ReadinessBadge";
import { EmailPreferencesSection } from "@/components/EmailPreferencesSection";
import { ArrowBigUp, Eye, MessageSquare, Pencil } from "lucide-react";
import { ViewsIcon } from "@/components/ViewsIcon";
import { stripHtml } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";


type Profile = {
  _id: Id<"users">;
  name: string;
  avatarUrlId: string;
  email?: string | null;
  team: string;
  department: string | null;
  userIntent: "looking" | "sharing" | "both" | null;
  focusAreas: Array<{ _id: Id<"focusAreas">; name: string; group: string }>;
  projectCount: number;
  followingCount: number;
};

type Project = {
  _id: Id<"projects">;
  name: string;
  summary?: string;
  team: string;
  upvotes: number;
  viewCount: number;
  commentCount: number;
  followerCount: number;
  status: "pending" | "active";
  readinessStatus?: "in_progress" | "just_an_idea" | "early_prototype" | "mostly_working" | "ready_to_use";
};

type FollowedProject = {
  _id: Id<"projects">;
  name: string;
  summary?: string;
  readinessStatus?: "in_progress" | "just_an_idea" | "early_prototype" | "mostly_working" | "ready_to_use";
  team: string;
  upvotes: number;
  creatorId: Id<"users">;
  creatorName: string;
  creatorAvatar: string;
};

export default function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { isLoading, isAuthenticated, user: currentUser } = useCurrentUser();
  const userId = id as Id<"users">;
  const isOwner = currentUser?._id === userId;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isLoading, isAuthenticated, router]);

  const profile = useQuery(
    api.users.getProfile,
    isAuthenticated ? { userId } : "skip"
  ) as Profile | null | undefined;

  const projects = useQuery(
    api.projects.getByUserId,
    isAuthenticated
      ? {
          userId,
          includePending: isOwner,
        }
      : "skip"
  ) as Project[] | undefined;

  const followedProjects = useQuery(
    api.projects.getFollowedByUser,
    isAuthenticated ? { userId } : "skip"
  ) as FollowedProject[] | undefined;

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <main className="mx-auto w-full max-w-6xl px-6 py-16">
          <p className="text-center text-zinc-500">Loading profile...</p>
        </main>
      </div>
    );
  }

  if (profile === undefined) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <main className="mx-auto w-full max-w-6xl px-6 py-16">
          <p className="text-center text-zinc-500">Loading profile...</p>
        </main>
      </div>
    );
  }

  if (profile === null) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <main className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="text-center">
            <p className="text-xl font-semibold text-zinc-900">
              Profile not found
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/")}
            >
              Back to home
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const email = profile.email?.trim() || "";
  const teamsChatLink = email
    ? `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(
        email
      )}`
    : "";

  return (
    <div className="min-h-screen bg-zinc-50">
        <main className="mx-auto w-full max-w-6xl space-y-8 px-6 pb-16 pt-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>u/{profile.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div
          className={
            isOwner
              ? "space-y-8 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8 lg:space-y-0"
              : "space-y-8"
          }
        >
          <div className="min-w-0 space-y-8">
            <div className="flex flex-col items-center gap-6 text-center md:items-start md:text-left">
              <div className="flex flex-col items-center gap-4 md:flex-row md:items-center">
                <Avatar className="h-16 w-16 border border-white shadow-sm">
                  <AvatarImage src={profile.avatarUrlId} alt={profile.name} />
                  <AvatarFallback>
                    {(profile.name || "U").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                    <h1 className="text-3xl font-semibold text-zinc-900">
                      {profile.name}
                    </h1>
                    {!isOwner && email && (
                      <>
                        {teamsChatLink && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            asChild
                          >
                            <a
                              href={teamsChatLink}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Chat with ${profile.name} in Teams`}
                            >
                              <i className="bi bi-microsoft-teams text-xl text-zinc-600" aria-hidden="true" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          asChild
                        >
                          <a
                            href={`mailto:${email}`}
                            aria-label={`Send email to ${profile.name}`}
                          >
                            <i className="bi bi-envelope text-xl text-zinc-600" aria-hidden="true" />
                          </a>
                        </Button>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-zinc-600 md:justify-start">
                    {profile.department && (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-zinc-500">{profile.department}</span>
                      </span>
                    )}
                    {profile.team && (
                      <Badge variant="outline" className="border-zinc-300">
                        Team {profile.team}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Tabs defaultValue="projects" className="min-w-0 space-y-6">
              <div className="relative flex items-center">
                <div className="absolute left-0">
                  {isOwner && (
                    <Button variant="outline" asChild>
                      <Link href="/submit" prefetch={false}>
                        Share a tool
                      </Link>
                    </Button>
                  )}
                </div>
                <div className="flex flex-1 justify-center">
                  <TabsList className="bg-white/90 shadow-sm ring-1 ring-zinc-200">
                    <TabsTrigger value="projects" className="gap-2">
                      Built
                      <Badge variant="secondary" className="bg-zinc-100">
                        {profile.projectCount}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="following" className="gap-2">
                      Watching
                      <Badge variant="secondary" className="bg-zinc-100">
                        {profile.followingCount}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>

              <TabsContent value="projects" className="space-y-4">
                {projects === undefined ? (
                  <EmptyState message="Loading tools..." />
                ) : projects.length === 0 ? (
                  <EmptyState
                    message={
                      isOwner
                        ? "Your garden is empty. What are you working on?"
                        : "Nothing shared yet."
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {projects.map((project) => (
                      <ProjectCard
                        key={project._id}
                        project={project}
                        canEdit={isOwner}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="following" className="space-y-4">
                {followedProjects === undefined ? (
                  <EmptyState message="Loading watched tools..." />
                ) : followedProjects.length === 0 ? (
                  <EmptyState message="Not watching anything yet." />
                ) : (
                  <div className="space-y-3">
                    {followedProjects.map((project) => (
                      <FollowedCard key={project._id} project={project} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {isOwner && (
            <aside className="lg:sticky lg:top-6">
              <EmailPreferencesSection />
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="border-dashed border-zinc-200 bg-white/70">
      <CardContent className="py-8 text-center text-sm text-zinc-500">
        {message}
      </CardContent>
    </Card>
  );
}

function ProjectCard({
  project,
  canEdit,
}: {
  project: Project;
  canEdit: boolean;
}) {
  const router = useRouter();

  return (
    <div className="rounded-lg border-b border-zinc-200/80 px-3 py-5 transition hover:bg-zinc-50/80">
      <div className="flex items-start gap-3">
        {canEdit && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mt-0"
            onClick={() => router.push(`/project/${project._id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit project</span>
          </Button>
        )}
        <Link href={`/project/${project._id}`} className="block flex-1">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-zinc-900">
                    {project.name}
                  </h3>
                  {project.status === "pending" && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                      Pending
                    </Badge>
                  )}
                  <ReadinessBadge status={project.readinessStatus} />
                </div>
                {project.summary && (
                  <p className="text-sm text-zinc-600">
                    {stripHtml(project.summary)}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-zinc-600">
                <ArrowBigUp className="h-4 w-4" fill="none" aria-hidden="true" />
                <span>{project.upvotes}</span>
                <span className="text-zinc-300">•</span>
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                <span>{project.commentCount}</span>
                <span className="text-zinc-300">•</span>
                <Eye className="h-4 w-4" aria-hidden="true" />
                <span>{project.followerCount}</span>
                <span className="text-zinc-300">•</span>
                <ViewsIcon className="h-4 w-4" aria-hidden="true" />
                <span>{project.viewCount}</span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

function FollowedCard({ project }: { project: FollowedProject }) {
  const router = useRouter();

  return (
    <Link
      href={`/project/${project._id}`}
      className="block group"
    >
      <Card className="border-zinc-200/80 bg-white/90 transition group-hover:bg-zinc-50/80">
        <CardContent className="px-6 py-5">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-zinc-900">
                    {project.name}
                  </h3>
                  <ReadinessBadge status={project.readinessStatus} />
                </div>
                {project.summary && (
                  <p className="text-sm text-zinc-600">
                    {stripHtml(project.summary)}
                  </p>
                )}
              </div>
            </div>
            <Separator className="bg-zinc-200" />
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-500">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  event.preventDefault();
                  router.push(`/profile/${project.creatorId}`);
                }}
                className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
              >
                <Avatar className="h-8 w-8 bg-zinc-100 text-xs font-semibold text-zinc-600">
                  <AvatarImage src={project.creatorAvatar} alt={project.creatorName} />
                  <AvatarFallback>
                    {(project.creatorName || "U").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>
                  By{" "}
                  <span className="text-zinc-900 hover:underline">
                    {project.creatorName}
                  </span>
                </span>
              </button>
              {project.team && (
                <Badge variant="outline" className="border-zinc-300">
                  Team {project.team}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
