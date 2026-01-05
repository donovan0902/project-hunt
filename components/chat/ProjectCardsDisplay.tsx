"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Play } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectCardsDisplayProps {
  projectIds: string[];
  summary: string;
}

export function ProjectCardsDisplay({
  projectIds,
  summary,
}: ProjectCardsDisplayProps) {
  const projects = useQuery(api.projects.getProjectsByEntryIdsPublic, {
    entryIds: projectIds,
  });

  const isLoading = projects === undefined;

  return (
    <div className="space-y-3 py-2">
      {summary && (
        <p className="text-sm text-muted-foreground">{summary}</p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {isLoading ? (
          <>
            {[...Array(Math.min(projectIds.length, 4))].map((_, i) => (
              <Card key={i} className="py-3">
                <CardHeader className="px-3 py-0">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                    <Skeleton className="h-16 w-24 rounded-md" />
                  </div>
                </CardHeader>
              </Card>
            ))}
          </>
        ) : projects.length > 0 ? (
          projects.map((project) => {
            const firstMedia = project.previewMedia?.[0];
            const thumbnailUrl = firstMedia?.url;
            const isVideo = firstMedia?.type === "video";

            return (
              <Link
                key={project._id}
                href={`/project/${project._id}`}
                target="_blank"
              >
                <Card className="py-3 hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardHeader className="px-3 py-0">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-medium flex items-center gap-1">
                          <span className="truncate">{project.name}</span>
                          <ArrowUpRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                        </CardTitle>
                        {project.summary && (
                          <CardDescription className="text-xs line-clamp-2">
                            {project.summary}
                          </CardDescription>
                        )}
                      </div>

                      {thumbnailUrl && (
                        <div className="flex-shrink-0 relative w-24 h-16 self-start group overflow-hidden rounded-md bg-muted border border-border/60">
                          {isVideo ? (
                            <video
                              src={thumbnailUrl}
                              className="h-full w-full object-cover"
                              muted
                              playsInline
                            />
                          ) : (
                            <Image
                              src={thumbnailUrl}
                              alt={project.name}
                              fill
                              sizes="96px"
                              className="object-cover"
                            />
                          )}
                          {isVideo && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                              <div className="rounded-full bg-black/50 p-1.5 backdrop-blur-sm">
                                <Play className="h-3 w-3 fill-white text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground col-span-2">
            No projects found.
          </p>
        )}
      </div>
    </div>
  );
}
