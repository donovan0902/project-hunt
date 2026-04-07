import type { Id } from "@/convex/_generated/dataModel";

/**
 * Upload a file to Convex storage via a generated upload URL.
 *
 * Falls back to "application/octet-stream" when the browser doesn't
 * provide a MIME type (common for .sql, .sh, .log, .yaml, etc.).
 */
export async function uploadFile(
  file: File,
  generateUploadUrl: () => Promise<string>,
): Promise<{ storageId: Id<"_storage">; contentType: string }> {
  const contentType = file.type || "application/octet-stream";

  const uploadUrl = await generateUploadUrl();
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload "${file.name}".`);
  }

  const { storageId } = await response.json();
  if (!storageId) {
    throw new Error(
      `Failed to upload "${file.name}". This file type may not be supported.`,
    );
  }

  return { storageId, contentType };
}
