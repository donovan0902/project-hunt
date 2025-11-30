"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UserPlus, Loader2, Check, Plus, X } from "lucide-react";

export function InviteUserButton() {
  const [emails, setEmails] = useState<string[]>([""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const addEmailField = () => {
    setEmails([...emails, ""]);
  };

  const removeEmailField = (index: number) => {
    if (emails.length > 1) {
      setEmails(emails.filter((_, i) => i !== index));
    }
  };

  const updateEmail = (index: number, value: string) => {
    const updated = [...emails];
    updated[index] = value;
    setEmails(updated);
  };

  const validEmails = emails.filter((e) => e.trim() !== "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validEmails.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      // Send all invitations
      const results = await Promise.allSettled(
        validEmails.map((email) =>
          fetch("/api/invite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          }).then(async (res) => {
            if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error || `Failed to invite ${email}`);
            }
            return res.json();
          })
        )
      );

      const failures = results
        .map((r, i) => (r.status === "rejected" ? validEmails[i] : null))
        .filter(Boolean);
      if (failures.length > 0) {
        throw new Error(`Failed to send invitations to: ${failures.join(", ")}`);
      }

      setIsSuccess(true);
      setEmails([""]);

      // Reset success state and close popover after delay
      setTimeout(() => {
        setIsSuccess(false);
        setIsOpen(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Invite</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="space-y-1">
            <h4 className="font-medium text-sm">Invite people to Garden</h4>
            <p className="text-xs text-muted-foreground">
              Send invitations to join the platform.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {emails.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="colleague@example.com"
                    value={email}
                    onChange={(e) => updateEmail(index, e.target.value)}
                    disabled={isLoading || isSuccess}
                    className="flex-1 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  {emails.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeEmailField(index)}
                      disabled={isLoading || isSuccess}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addEmailField}
              disabled={isLoading || isSuccess}
              className="w-full text-muted-foreground"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add another
            </Button>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button
              type="submit"
              size="sm"
              className="w-full"
              disabled={isLoading || isSuccess || validEmails.length === 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : isSuccess ? (
                <>
                  <Check className="h-4 w-4" />
                  {validEmails.length > 1 ? "Invitations Sent!" : "Invitation Sent!"}
                </>
              ) : (
                `Send ${validEmails.length > 1 ? `${validEmails.length} Invitations` : "Invitation"}`
              )}
            </Button>
          </form>
        </div>
      </PopoverContent>
    </Popover>
  );
}
