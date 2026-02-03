"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SmilePlus } from "lucide-react";
import EmojiPicker, { EmojiStyle, type EmojiClickData } from "emoji-picker-react";

function EmojiPickerPopover({
  selectedEmoji,
  onSelect,
}: {
  selectedEmoji: string;
  onSelect: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-12 w-12 p-0"
        >
          {selectedEmoji ? (
            <span className="text-2xl">{selectedEmoji}</span>
          ) : (
            <SmilePlus className="h-5 w-5 text-zinc-400" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 border-0"
        side="right"
        align="start"
      >
        <EmojiPicker
          onEmojiClick={(emojiData: EmojiClickData) => {
            onSelect(emojiData.emoji);
            setOpen(false);
          }}
          emojiStyle={EmojiStyle.NATIVE}
          skinTonesDisabled
          searchPlaceholder="Search emoji..."
          width={350}
          height={400}
        />
      </PopoverContent>
    </Popover>
  );
}

export function CreateFocusAreaDialog({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createFocusArea = useMutation(api.focusAreas.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createFocusArea({
        name: name.trim(),
        description: description.trim() || undefined,
        icon: icon || undefined,
      });
      setName("");
      setDescription("");
      setIcon("");
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>What kind of tools belong here?</DialogTitle>
          <DialogDescription>
            Create a new category to help others discover tools
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="fa-name" className="text-sm font-medium text-zinc-700">
              Name
            </label>
            <div className="flex items-center gap-3">
              <EmojiPickerPopover
                selectedEmoji={icon}
                onSelect={setIcon}
              />
              <Input
                id="fa-name"
                placeholder="e.g. Developer Productivity"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="flex-1"
              />
            </div>
            {icon && (
              <button
                type="button"
                onClick={() => setIcon("")}
                className="text-xs text-zinc-400 hover:text-zinc-600"
              >
                Remove icon
              </button>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="fa-desc" className="text-sm font-medium text-zinc-700">
              Description
            </label>
            <Textarea
              id="fa-desc"
              placeholder="What kind of tools belong here?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={!name.trim() || isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
