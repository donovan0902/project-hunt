"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { useCurrentUser } from "@/app/useCurrentUser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { VersionsList } from "@/components/VersionsList";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

export default function VersionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const projectId = id as Id<"projects">;
  const { user } = useCurrentUser();
  const project = useQuery(api.projects.getById, { projectId });

  const isOwner = !!(user && project && project.userId === user._id);

  if (project === undefined) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="text-center text-zinc-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="text-center text-zinc-500">Project not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto max-w-3xl px-6 pt-4 pb-10">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {project.focusArea && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={`/space/${project.focusArea._id}`}>
                      g/{project.focusArea.name}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            )}
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/project/${id}`} className="max-w-[180px] truncate" title={project.name}>{project.name}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Releases</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Releases</h1>

        <VersionsList projectId={projectId} isOwner={isOwner} />
      </main>
    </div>
  );
}
