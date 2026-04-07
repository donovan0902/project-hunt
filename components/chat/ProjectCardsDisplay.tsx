"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { Play } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { stripHtml } from "@/lib/utils";

interface ProjectCardsDisplayProps {
  projectIds: string[];
  summary: string;
}

type ProjectCardProject = {
  _id: string;
  name: string;
  summary?: string;
  previewMedia?: Array<{
    _id: string;
    storageId: string;
    type: string;
    url: string | null;
  }>;
};

export function ProjectCardsDisplay({
  projectIds,
  summary,
}: ProjectCardsDisplayProps) {
  const projects = useQuery(api.projects.getProjectsByEntryIdsPublic, {
    entryIds: projectIds,
  }) as ProjectCardProject[] | undefined;

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
              <Card key={i} className="h-full overflow-hidden">
                <div className="flex h-full flex-col">
                  <div className="aspect-[16/9] w-full bg-muted">
                    <Skeleton className="h-full w-full" />
                  </div>
                  <CardHeader className="space-y-2 px-3 pb-3 pt-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </CardHeader>
                </div>
              </Card>
            ))}
          </>
        ) : projects.length > 0 ? (
          projects.map((project) => {
            const firstMedia = project.previewMedia?.[0];
            const isVideo = firstMedia?.type === "video";
            const hasValidUrl = firstMedia?.url != null;

            return (
              <Link
                key={project._id}
                href={`/project/${project._id}`}
                target="_blank"
              >
                <Card className="h-full cursor-pointer overflow-hidden transition-colors hover:bg-muted/50">
                  <div className="flex h-full flex-col">
                    <div className="group relative aspect-[16/9] w-full overflow-hidden bg-muted">
                      {firstMedia && hasValidUrl ? (
                        isVideo ? (
                          <>
                            <video
                              src={firstMedia.url!}
                              className="h-full w-full object-cover"
                              muted
                              playsInline
                              preload="metadata"
                              aria-label={`${project.name} preview video`}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/10">
                              <div className="rounded-full bg-black/50 p-1.5 backdrop-blur-sm">
                                <Play aria-hidden="true" className="h-4 w-4 fill-white text-white" />
                              </div>
                            </div>
                          </>
                        ) : (
                          <Image
                            src={firstMedia.url!}
                            alt={project.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, 33vw"
                            unoptimized
                          />
                        )
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                          No preview available
                        </div>
                      )}
                    </div>
                    <CardHeader className="space-y-1 px-3 pb-3 pt-2">
                      <CardTitle className="flex items-center gap-1 text-sm font-medium min-w-0 overflow-hidden">
                        <span className="truncate">{project.name}</span>
                        <ArrowUpRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                      </CardTitle>
                      {project.summary && (
                        <CardDescription className="text-xs line-clamp-2">
                          {stripHtml(project.summary)}
                        </CardDescription>
                      )}
                    </CardHeader>
                  </div>
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
