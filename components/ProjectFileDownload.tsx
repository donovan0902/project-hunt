"use client";

import { useState } from "react";
import { File as FileIcon, Loader2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface ProjectFileDownloadProps {
  files: Array<{
    _id: string;
    filename: string;
    fileSize: number;
    url: string | null;
  }>;
  projectId: Id<"projects">;
  clickCounts?: Record<string, number>;
}

export function ProjectFileDownload({ files, projectId, clickCounts }: ProjectFileDownloadProps) {
  const downloadableFiles = files.filter((f) => f.url);
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
  const trackLinkClick = useMutation(api.projects.trackLinkClick);

  if (downloadableFiles.length === 0) {
    return null;
  }

  const handleDownload = async (file: { _id: string; filename: string; url: string }, index: number) => {
    void trackLinkClick({ projectId, resourceId: file._id, resourceType: "file" });
    setDownloadingIndex(index);
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fall back to direct navigation if blob download fails
      window.open(file.url, "_blank");
    } finally {
      setDownloadingIndex(null);
    }
  };

  return (
    <div className="space-y-2">
      {downloadableFiles.map((file, i) => {
        const count = clickCounts?.[file._id] ?? 0;
        return (
          <button
            key={i}
            type="button"
            onClick={() => handleDownload({ _id: file._id, filename: file.filename, url: file.url! }, i)}
            disabled={downloadingIndex === i}
            className="group flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-700 disabled:opacity-50 w-full"
            aria-label={`Download ${file.filename}`}
          >
            {downloadingIndex === i ? (
              <Loader2 className="h-4 w-4 text-zinc-400 animate-spin shrink-0" aria-hidden="true" />
            ) : (
              <FileIcon className="h-4 w-4 text-zinc-400 shrink-0" aria-hidden="true" />
            )}
            <span className="flex-1 min-w-0 truncate text-left group-hover:underline">{file.filename}</span>
            {count > 0 && (
              <span className="text-zinc-500 shrink-0 ml-auto pl-2 no-underline">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
