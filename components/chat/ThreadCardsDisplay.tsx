"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { ArrowBigUp, MessageCircle, ArrowUpRight } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { stripHtml, getRelativeTime } from "@/lib/utils";

interface ThreadCardsDisplayProps {
  threadIds: string[];
  summary: string;
}

type ThreadCardThread = {
  _id: string;
  title: string;
  body?: string;
  upvoteCount: number;
  commentCount: number;
  creatorName: string;
  createdAt: number;
  spaceName: string | null;
  spaceIcon: string | null;
  spaceId: string | null;
};

export function ThreadCardsDisplay({
  threadIds,
  summary,
}: ThreadCardsDisplayProps) {
  const threads = useQuery(api.threads.getThreadsByEntryIdsPublic, {
    entryIds: threadIds,
  }) as ThreadCardThread[] | undefined;

  const isLoading = threads === undefined;

  return (
    <div className="space-y-3 py-2">
      {summary && (
        <p className="text-sm text-muted-foreground">{summary}</p>
      )}

      <div className="grid grid-cols-1 gap-2">
        {isLoading ? (
          <>
            {[...Array(Math.min(threadIds.length, 4))].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="space-y-2 px-3 pb-3 pt-2">
                  <Skeleton className="h-3 w-1/4" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/3" />
                </CardHeader>
              </Card>
            ))}
          </>
        ) : threads.length > 0 ? (
          threads.map((thread) => (
            <Link
              key={thread._id}
              href={`/thread/${thread._id}`}
              target="_blank"
            >
              <Card className="cursor-pointer overflow-hidden transition-colors hover:bg-muted/50">
                <CardHeader className="space-y-1 px-3 pb-3 pt-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {thread.spaceName && (
                      <span>g/{thread.spaceName}</span>
                    )}
                    <span>{getRelativeTime(thread.createdAt)}</span>
                  </div>
                  <CardTitle className="flex items-center gap-1 text-sm font-medium min-w-0 overflow-hidden">
                    <span className="truncate">{thread.title}</span>
                    <ArrowUpRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                  </CardTitle>
                  {thread.body && (
                    <CardDescription className="text-xs line-clamp-2">
                      {stripHtml(thread.body)}
                    </CardDescription>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ArrowBigUp className="h-3 w-3" />
                      {thread.upvoteCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {thread.commentCount}
                    </span>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No threads found.
          </p>
        )}
      </div>
    </div>
  );
}
