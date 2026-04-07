"use client";

import { useCallback } from "react";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { MentionUser } from "@/components/QuillMentionModule";

/**
 * Returns a stable callback for searching users for @mention autocomplete.
 * Used by RichTextEditor's onMentionSearch prop.
 */
export function useMentionSearch() {
  const convex = useConvex();

  return useCallback(
    async (query: string): Promise<MentionUser[]> => {
      if (!query.trim()) return [];
      const results = await convex.query(api.mentions.searchUsers, {
        query,
        limit: 6,
      });
      return results.map((u) => ({
        id: u._id,
        value: u.name,
        avatarUrlId: u.avatarUrlId,
      }));
    },
    [convex]
  );
}
