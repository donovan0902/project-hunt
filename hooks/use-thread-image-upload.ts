"use client";

import { useRef, useCallback } from "react";
import { useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { uploadFile } from "@/lib/upload";
import { extractImageSrcsFromHtml } from "@/lib/utils";

/**
 * Hook that manages inline image uploads for thread rich text editors.
 * Tracks a URL → storageId mapping so we can resolve which storage IDs
 * are referenced in the final HTML body.
 */
export function useThreadImageUpload() {
  const generateUploadUrl = useMutation(api.projects.generateUploadUrl);
  const convex = useConvex();
  // Maps image URLs to their Convex storage IDs
  const imageMapRef = useRef(new Map<string, Id<"_storage">>());

  /**
   * Upload handler to pass to RichTextEditor's `onImageUpload` prop.
   * Uploads the file and returns the public URL to embed in the editor.
   */
  const handleImageUpload = useCallback(
    async (file: File): Promise<string> => {
      const { storageId } = await uploadFile(file, generateUploadUrl);
      const url = await convex.query(api.projects.getMediaUrl, { storageId });
      if (!url) throw new Error("Failed to get image URL");
      imageMapRef.current.set(url, storageId);
      return url;
    },
    [generateUploadUrl, convex]
  );

  /**
   * Given the current HTML body, returns the list of storage IDs
   * for images still referenced in the content.
   */
  const getStorageIdsFromHtml = useCallback(
    (html: string): Id<"_storage">[] => {
      const srcs = extractImageSrcsFromHtml(html);
      const ids: Id<"_storage">[] = [];
      for (const src of srcs) {
        const id = imageMapRef.current.get(src);
        if (id) ids.push(id);
      }
      return ids;
    },
    []
  );

  /**
   * Pre-populate the URL → storageId map with existing images
   * (used when entering edit mode on an existing thread).
   */
  const populateExistingImages = useCallback(
    (entries: { storageId: Id<"_storage">; url: string }[]) => {
      for (const { storageId, url } of entries) {
        imageMapRef.current.set(url, storageId);
      }
    },
    []
  );

  /**
   * Reset the image map (e.g., after form submission).
   */
  const resetImageMap = useCallback(() => {
    imageMapRef.current.clear();
  }, []);

  return {
    handleImageUpload,
    getStorageIdsFromHtml,
    populateExistingImages,
    resetImageMap,
  };
}
