import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Strips HTML tags from a string, returning plain text.
 * Inserts spaces between block-level elements and decodes HTML entities
 * so rich text like `<h1>Title</h1><p>bold&nbsp;text</p>` becomes
 * "Title bold text".
 */
export function stripHtml(html: string): string {
  return html
    // Insert a space before block-level closing/opening tags so words don't merge
    .replace(/<\/(p|h[1-6]|li|div|blockquote|pre|ol|ul)>/gi, " ")
    .replace(/<(p|h[1-6]|li|div|blockquote|pre|ol|ul|br)[^>]*\/?>/gi, " ")
    // Remove all remaining tags
    .replace(/<[^>]*>/g, "")
    // Decode common HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Collapse whitespace and trim
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks if a rich text HTML string has meaningful content
 * (not just empty tags like "<p><br></p>").
 */
export function isRichTextEmpty(html: string): boolean {
  return stripHtml(html).length === 0;
}

/**
 * Extracts all image `src` attribute values from an HTML string.
 * Used to identify which Convex storage URLs are referenced in rich text content.
 */
export function extractImageSrcsFromHtml(html: string): string[] {
  const srcs: string[] = [];
  const regex = /<img[^>]+src="([^"]+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    srcs.push(match[1]);
  }
  return srcs;
}

/**
 * Returns a human-readable relative time string for a given timestamp.
 * e.g. "just now", "5m ago", "3h ago", "2d ago", or a locale date string.
 */
export function getRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (days < 30) return `${weeks}w ago`;
  return new Date(timestamp).toLocaleDateString();
}

/** Escapes special HTML characters to prevent injection when building HTML strings. */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
