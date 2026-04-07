"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import "react-quill-new/dist/quill.snow.css";
import type { MentionSearchFn } from "./QuillMentionModule";

const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import("react-quill-new");
    const { Quill } = await import("react-quill-new");
    const { default: QuillResizeImage } = await import("quill-resize-image");
    const { registerMentionBlot, MentionModule } = await import("./QuillMentionModule");
    if (!Quill.imports["modules/resize"]) {
      Quill.register("modules/resize", QuillResizeImage);
    }
    registerMentionBlot(Quill);
    if (!Quill.imports["modules/mention"]) {
      Quill.register("modules/mention", MentionModule);
    }
    return RQ;
  },
  {
    ssr: false,
    loading: () => (
      <div className="min-h-28 rounded-md border border-zinc-200 bg-white" />
    ),
  }
);

const BASE_TOOLBAR = [
  ["bold", "italic", "underline", "strike"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["blockquote", "code-block"],
  ["link"],
];

const IMAGE_TOOLBAR = [
  ["bold", "italic", "underline", "strike"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["blockquote", "code-block"],
  ["link", "image"],
];

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Hides the toolbar and renders a compact editor suitable for comments. */
  minimal?: boolean;
  /** When provided, enables the image button in the toolbar. */
  onImageUpload?: (file: File) => Promise<string>;
  /** When provided, enables @mention autocomplete in the editor. */
  onMentionSearch?: MentionSearchFn;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  disabled,
  minimal,
  onImageUpload,
  onMentionSearch,
}: RichTextEditorProps) {
  const onImageUploadRef = useRef(onImageUpload);
  onImageUploadRef.current = onImageUpload;
  const onMentionSearchRef = useRef(onMentionSearch);
  onMentionSearchRef.current = onMentionSearch;
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Intercept paste/drop of images to prevent Quill from embedding base64 data URLs,
  // which can exceed Convex's 1 MiB document size limit.
  useEffect(() => {
    if (!wrapperRef.current) return;

    const blockImageTransfer = (e: ClipboardEvent | DragEvent) => {
      const files =
        "clipboardData" in e
          ? e.clipboardData?.files
          : e.dataTransfer?.files;
      if (!files) return;
      const hasImage = Array.from(files).some((f) =>
        f.type.startsWith("image/")
      );
      if (hasImage) {
        e.preventDefault();
        e.stopPropagation();
        toast.info(
          onImageUploadRef.current
            ? "Use the image button in the toolbar to add images."
            : "To add images, use the Screenshots and Clips field in the Files and Media tab."
        );
      }
    };

    const el = wrapperRef.current;
    el.addEventListener("paste", blockImageTransfer as EventListener, true);
    el.addEventListener("drop", blockImageTransfer as EventListener, true);

    return () => {
      el.removeEventListener("paste", blockImageTransfer as EventListener, true);
      el.removeEventListener("drop", blockImageTransfer as EventListener, true);
    };
  }, []);

  // Safety net: strip any base64 images that slip past the paste/drop blocker.
  const handleChange = useCallback(
    (html: string) => {
      if (html.includes("src=\"data:")) {
        onChange(html.replace(/<img[^>]+src="data:[^"]*"[^>]*>/g, ""));
        return;
      }
      onChange(html);
    },
    [onChange]
  );

  const modules = useMemo(() => {
    const base: Record<string, unknown> = {};

    // Mention module
    if (onMentionSearch) {
      base.mention = {
        source: async (query: string) => {
          if (!onMentionSearchRef.current) return [];
          return onMentionSearchRef.current(query);
        },
      };
    }

    if (minimal) {
      base.toolbar = false;
    } else if (onImageUpload) {
      base.resize = {};
      base.toolbar = {
        container: IMAGE_TOOLBAR,
        handlers: {
          image: function (this: { quill: { getSelection: (focus: boolean) => { index: number } | null; getLength: () => number; insertEmbed: (index: number, type: string, value: string) => void; setSelection: (index: number, length: number) => void } }) {
            const quill = this.quill;
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ACCEPTED_IMAGE_TYPES.join(",");
            input.onchange = async () => {
              const file = input.files?.[0];
              if (!file) return;
              if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
                toast.error("Please select a PNG, JPEG, GIF, or WebP image.");
                return;
              }
              try {
                const url = await onImageUploadRef.current!(file);
                const range = quill.getSelection(true);
                const index = range ? range.index : quill.getLength() - 1;
                quill.insertEmbed(index, "image", url);
                quill.setSelection(index + 1, 0);
              } catch {
                toast.error("Failed to upload image. Please try again.");
              }
            };
            input.click();
          },
        },
      };
    } else {
      base.toolbar = BASE_TOOLBAR;
    }

    return base;
  }, [minimal, onImageUpload, onMentionSearch]);

  return (
    <div ref={wrapperRef} className={`rich-text-editor${minimal ? " minimal" : ""}`}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={handleChange}
        modules={modules}
        placeholder={placeholder}
        readOnly={disabled}
      />
    </div>
  );
}
