"use client";

import DOMPurify from "dompurify";

interface RichTextContentProps {
  html: string;
  className?: string;
}

export function RichTextContent({ html, className = "" }: RichTextContentProps) {
  // Replace non-breaking spaces with regular spaces to allow proper text wrapping
  // Quill sometimes outputs &nbsp; between words (especially on paste), which prevents line breaks
  const normalizedHtml = html.replace(/&nbsp;/g, " ");

  const clean = DOMPurify.sanitize(normalizedHtml, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s",
      "h1", "h2", "h3",
      "ul", "ol", "li",
      "blockquote", "pre", "code",
      "a", "span",
      "img",
    ],
    ALLOWED_ATTR: [
      "href", "rel", "target", "class", "data-language", "src", "alt", "width", "height",
      "data-id", "data-value", "data-denotation-char",
    ],
  });

  // Post-process: convert mention spans to profile links via DOM (order-independent, no XSS risk)
  const doc = new DOMParser().parseFromString(clean, "text/html");
  doc.querySelectorAll<HTMLElement>('span.mention[data-id][data-value]').forEach((span) => {
    const id = span.getAttribute("data-id") ?? "";
    const value = span.getAttribute("data-value") ?? "";
    const link = doc.createElement("a");
    link.className = "mention";
    link.href = `/profile/${encodeURIComponent(id)}`;
    link.setAttribute("data-id", id);
    link.textContent = `@${value}`;
    span.replaceWith(link);
  });

  return (
    <div
      className={`rich-text-content ${className}`}
      dangerouslySetInnerHTML={{ __html: doc.body.innerHTML }}
    />
  );
}

