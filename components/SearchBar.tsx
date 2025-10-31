"use client";

import { useState, useEffect, useRef } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";

interface SearchResult {
  _id: Id<"projects">;
  name: string;
  headline?: string;
}

interface SearchBarProps {
  className?: string;
}

export function SearchBar({ className }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const searchProjects = useAction(api.projects.searchProjects);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Perform search when debounced query changes
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedQuery.trim().length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      setIsOpen(true); // Open dropdown immediately when loading starts
      try {
        const searchResults = await searchProjects({ query: debouncedQuery });
        setResults(searchResults);
      } catch (error) {
        console.error("Search failed:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery, searchProjects]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleResultClick = () => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
  };

  return (
    <div ref={searchRef} className={`relative ${className || ""}`}>
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          type="search"
          placeholder="Find tools and projects..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 bg-zinc-50 border-zinc-200 focus-visible:ring-zinc-400"
        />
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-white border border-zinc-200 rounded-md shadow-lg max-h-96 overflow-y-auto z-50">
          {isLoading ? (
            <div className="py-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="px-4 py-3">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result) => (
                <Link
                  key={result._id}
                  href={`/projects/${result._id}`}
                  onClick={handleResultClick}
                  className="block px-4 py-3 hover:bg-zinc-50 transition-colors"
                >
                  <div className="font-medium text-zinc-900">{result.name}</div>
                  {result.headline && (
                    <div className="text-sm text-zinc-600 mt-1 line-clamp-1">
                      {result.headline}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">
              No projects found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
