"use client";

import { useState, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";

interface SimilarProject {
  _id: Id<"projects">;
  name: string;
  summary: string;
  team: string;
  upvotes: number;
  creatorName: string;
  creatorAvatar: string;
  headline?: string;
}

interface SimilarProjectsPreviewProps {
  name: string;
  headline: string;
  description: string;
}

export function SimilarProjectsPreview({
  name,
  headline,
  description,
}: SimilarProjectsPreviewProps) {
  const [debouncedInputs, setDebouncedInputs] = useState({ name, headline, description });
  const [results, setResults] = useState<SimilarProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchSimilarProjects = useAction(api.projects.searchSimilarProjectsByText);

  // Debounce the inputs
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInputs({ name, headline, description });
    }, 500);

    return () => clearTimeout(timer);
  }, [name, headline, description]);

  // Perform search when debounced inputs change
  useEffect(() => {
    const performSearch = async () => {
      // Don't search if inputs are too short
      if (debouncedInputs.name.trim().length < 2 || debouncedInputs.description.trim().length < 200) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const searchResults = await searchSimilarProjects({
          name: debouncedInputs.name,
          headline: debouncedInputs.headline || undefined,
          summary: debouncedInputs.description,
        });
        setResults(searchResults);
      } catch (error) {
        console.error("Search failed:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedInputs, searchSimilarProjects]);

  const inputsTooShort = name.trim().length < 2 || description.trim().length < 200;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-zinc-900">Similar projects</h3>

      <div className="space-y-4">
        {inputsTooShort ? (
          <p className="text-sm text-zinc-500">
            Start typing to see similar projects.
          </p>
        ) : isLoading ? (
          <>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </>
        ) : results.length > 0 ? (
          <>
            {results.map((project) => (
              <Link
                key={project._id}
                href={`/project/${project._id}`}
                target="_blank"
                className="block space-y-2 transition-colors hover:text-zinc-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-zinc-900 truncate">
                        {project.name}
                      </h4>
                      <ArrowUpRight className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                    </div>
                    {project.headline && (
                      <p className="text-sm text-zinc-600 line-clamp-1">
                        {project.headline}
                      </p>
                    )}
                    <p className="text-sm text-zinc-500 line-clamp-2">
                      {project.summary}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span>{project.team}</span>
                      <span>•</span>
                      <span>{project.upvotes} upvotes</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </>
        ) : (
          <p className="text-sm text-zinc-500">
            No similar projects found.
          </p>
        )}
      </div>
    </div>
  );
}
