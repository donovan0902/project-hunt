"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CreateFocusAreaDialog } from "./CreateFocusAreaDialog";
import { SpaceIcon } from "./SpaceIcon";
import { Plus, PlusCircle, MessageSquarePlus, Info, Home, BookOpen, UserCheck } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroupAction,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar";

function SidebarSpaces() {
  const focusAreas = useQuery(api.focusAreas.listActiveWithFollowStatus);

  const loading = focusAreas === undefined;

  const sorted = focusAreas
    ? [...focusAreas].sort((a, b) =>
        a.isFollowing === b.isFollowing ? 0 : a.isFollowing ? -1 : 1
      )
    : [];

  return (
    <SidebarGroup className="p-0">
      <div className="flex items-center justify-between px-2 py-1.5">
        <SidebarGroupLabel className="px-0">Spaces</SidebarGroupLabel>
        <CreateFocusAreaDialog>
          <SidebarGroupAction className="static h-6 w-6 translate-y-0">
            <Plus className="h-4 w-4" />
          </SidebarGroupAction>
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
          ) : sorted.length > 0 ? (
            sorted.map((area) => (
              <SidebarMenuItem key={area._id}>
                <SidebarMenuButton asChild>
                  <Link href={`/space/${area._id}`} title={`g/${area.name}`}>
                    <SpaceIcon icon={area.icon} name={area.name} size="sm" />
                    <span className="text-zinc-500 font-mono text-xs line-clamp-2 overflow-hidden">
                      g/{area.name}
                    </span>
                    {area.isFollowing && (
                      <UserCheck className="ml-auto h-4 w-4 text-zinc-400 shrink-0" />
                    )}
                  </Link>
                </SidebarMenuButton>
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
