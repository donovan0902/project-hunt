"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CreateFocusAreaDialog } from "./CreateFocusAreaDialog";
import { SpaceIcon } from "./SpaceIcon";
import { Plus, PlusCircle, MessageSquarePlus, Info, Home, BookOpen, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenuAction,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar";

function SidebarSpaces() {
  const focusAreas = useQuery(api.focusAreas.listActiveForSidebar);
  const toggleSidebarStar = useMutation(api.focusAreas.toggleSidebarStar);

  const loading = focusAreas === undefined;

  const handleToggleStar = async (focusAreaId: Id<"focusAreas">) => {
    try {
      await toggleSidebarStar({ focusAreaId });
    } catch (error) {
      console.error("Failed to update starred space:", error);
      toast.error("Failed to update starred space. Please try again.");
    }
  };

  return (
    <SidebarGroup className="p-0">
      <div className="flex items-center justify-between px-2 py-1.5">
        <SidebarGroupLabel className="px-0">Spaces</SidebarGroupLabel>
        <CreateFocusAreaDialog>
          <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <Plus className="h-4 w-4" />
          </Button>
        </CreateFocusAreaDialog>
      </div>
      <SidebarGroupContent>
        <SidebarMenu>
          {loading ? (
            <>
              <SidebarMenuSkeleton />
              <SidebarMenuSkeleton />
              <SidebarMenuSkeleton />
            </>
          ) : focusAreas && focusAreas.length > 0 ? (
            focusAreas.map((area) => (
              <SidebarMenuItem key={area._id}>
                <SidebarMenuButton asChild>
                  <Link href={`/space/${area._id}`}>
                    <SpaceIcon icon={area.icon} name={area.name} size="sm" />
                    <span className="text-zinc-500 font-mono text-xs">
                      g/{area.name}
                    </span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuAction
                  aria-label={area.isStarred ? `Unstar ${area.name}` : `Star ${area.name}`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void handleToggleStar(area._id);
                  }}
                >
                  <Star
                    className={area.isStarred ? "fill-current text-amber-500" : "text-zinc-400"}
                  />
                </SidebarMenuAction>
              </SidebarMenuItem>
            ))
          ) : (
            <li className="px-2 py-3 text-xs text-zinc-400">
              No spaces yet.
            </li>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="p-4">
        <SidebarMenu className="gap-0">
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href="/">
                <Home className="h-4 w-4" />
                <span>Home</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href="/submit">
                <PlusCircle className="h-4 w-4" />
                <span>Share a Tool</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href="/create-thread">
                <MessageSquarePlus className="h-4 w-4" />
                <span>Start a Discussion</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-4">
        <SidebarSpaces />
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/about">
                <Info className="h-4 w-4" />
                <span>About Garden</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/guidelines">
                <BookOpen className="h-4 w-4" />
                <span>Content Guidelines</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
