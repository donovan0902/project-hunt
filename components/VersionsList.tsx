"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { ProjectFileDownload } from "@/components/ProjectFileDownload";
import { RichTextContent } from "@/components/RichTextContent";
import Link from "next/link";
import { Plus, ChevronDown, ChevronRight, Tag, Trash2, Pencil, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function VersionCard({
  version,
  isOwner,
  projectId,
}: {
  version: {
    _id: Id<"projectVersions">;
    tag: string;
    title: string;
    body?: string;
    links?: { url: string; label?: string }[];
    creatorName: string;
    createdAt: number;
    fileCount: number;
  };
  isOwner: boolean;
  projectId: Id<"projects">;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteVersion = useMutation(api.projects.deleteVersion);

  const versionFiles = useQuery(
    api.projects.getVersionFiles,
    expanded ? { versionId: version._id } : "skip"
  );

  const handleDelete = async () => {
    try {
      await deleteVersion({ versionId: version._id });
      toast.success("Version deleted");
      setDeleteOpen(false);
    } catch {
      toast.error("Failed to delete version");
    }
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-zinc-50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
        )}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
          <Tag className="h-3 w-3" />
          {version.tag}
        </span>
        <span className="flex-1 text-sm font-medium text-zinc-900 truncate">
          {version.title}
        </span>
        <span className="shrink-0 text-xs text-zinc-400">
          {timeAgo(version.createdAt)}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-zinc-100 px-4 pb-4 pt-3 space-y-4">
              {version.body && (
                <div className="prose prose-sm prose-zinc max-w-none">
                  <RichTextContent html={version.body} />
                </div>
              )}

              {version.links && version.links.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Links
                  </p>
                  <ul className="space-y-1">
                    {version.links.map((link, i) => (
                      <li key={i}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-zinc-700 hover:text-zinc-900 hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          {link.label || link.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {versionFiles && versionFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Attachments
                  </p>
                  <ProjectFileDownload files={versionFiles} projectId={projectId} />
                </div>
              )}

              {isOwner && (
                <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
                  <Button variant="ghost" size="sm" className="text-xs" asChild>
                    <Link href={`/project/${projectId}/versions/${version._id}/edit`}>
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Link>
                  </Button>
                  {version.tag !== "v0" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete version?</DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{version.tag} — {version.title}&quot; and all its attached files. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function VersionsList({
  projectId,
  isOwner,
}: {
  projectId: Id<"projects">;
  isOwner: boolean;
}) {
  const versions = useQuery(api.projects.listVersionsByProject, { projectId });

  return (
    <div className="space-y-4">
      {isOwner && (
        <div className="flex justify-end">
          <Button asChild size="sm">
            <Link href={`/project/${projectId}/versions/new`}>
              <Plus className="h-4 w-4 mr-1" />
              Post a Release
            </Link>
          </Button>
        </div>
      )}

      {versions === undefined ? (
        <div className="py-8 text-center text-sm text-zinc-500">
          Loading versions...
        </div>
      ) : versions.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-zinc-500">
            No versions yet.
            {isOwner && " Post your first release to share what's new."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {versions.map((version) => (
            <VersionCard
              key={version._id}
              version={version}
              isOwner={isOwner}
              projectId={projectId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
