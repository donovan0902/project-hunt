"use client";

import Link from "next/link";
import Image from "next/image";
import {
  useMutation,
  useQuery,
} from "convex/react";
import { signOut } from "aws-amplify/auth";
import { Bell, LogOut, User, PlusCircle } from "lucide-react";
import { useCurrentUser } from "@/app/useCurrentUser";
import { api } from "@/convex/_generated/api";
import { SearchBar } from "./SearchBar";
import { getRelativeTime } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


export function Header() {
  const { user: convexUser, isLoading: userLoading, isAuthenticated } = useCurrentUser();
  const notifications = useQuery(api.notifications.getNotifications, { limit: 8 }) ?? [];
  const unreadCount = useQuery(api.notifications.getUnreadNotificationCount) ?? 0;
  const markAllRead = useMutation(api.notifications.markAllRead);

  const handleNotificationsOpen = (open: boolean) => {
    if (!open || unreadCount === 0) {
      return;
    }
    void markAllRead({});
  };

  const renderNotificationText = (notification: (typeof notifications)[number]) => {
    const projectName = notification.projectName ?? "your tool";
    if (notification.type === "upvote") {
      const count = notification.count ?? 1;
      if (count > 1) {
        const others = count - 1;
        const suffix = others === 1 ? "other" : "others";
        return `${notification.actorName} and ${others} ${suffix} upvoted ${projectName}`;
      }
      return `${notification.actorName} upvoted ${projectName}`;
    }

    if (notification.type === "follow" || notification.type === "adoption") {
      return `${notification.actorName} started following ${projectName}`;
    }

    if (notification.type === "project_update") {
      return `${notification.actorName} updated ${projectName}`;
    }

    if (notification.type === "followed_project_comment") {
      const count = notification.count ?? 1;
      if (count > 1) {
        const others = count - 1;
        return `${notification.actorName} and ${others} ${others === 1 ? "other" : "others"} commented on ${projectName}`;
      }
      return `${notification.actorName} commented on ${projectName}`;
    }

    if (notification.type === "reply") {
      return `${notification.actorName} replied to your comment on ${projectName}`;
    }

    if (notification.type === "mention") {
      const contentName = notification.threadTitle ?? projectName;
      return `${notification.actorName} mentioned you in ${contentName}`;
    }

    return `${notification.actorName} commented on ${projectName}`;
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 w-full border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Left: Garden Logo/Name */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xl font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
            style={{ fontFamily: 'var(--font-chonburi)' }}
          >
            Garden
          </Link>
          <span className="hidden sm:block h-5 w-px bg-zinc-300" aria-hidden />
          <Image
            src="/TTGFullLogo.png"
            alt="Tech Tribes Global"
            width={160}
            height={32}
            priority
          />
        </div>

        {isAuthenticated && <SearchBar />}

        {/* Right: Navigation Menu & Auth Buttons */}
        <div className="flex items-center gap-3">
          <NavigationMenu className="hidden md:block">
            <NavigationMenuList>
              {isAuthenticated && (
                <NavigationMenuItem>
                  <Link
                    href="/submit"
                    className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
                    aria-label="Register a tool"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>Share</span>
                  </Link>
                </NavigationMenuItem>
              )}
              {isAuthenticated && (
                <NavigationMenuItem>
                  <Popover onOpenChange={handleNotificationsOpen}>
                    <PopoverTrigger asChild>
                      <button
                        className={`${navigationMenuTriggerStyle()} relative w-9 px-0`}
                        aria-label="Open notifications"
                      >
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && (
                          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-96 p-0">
                      <div className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900">
                        Notifications
                      </div>
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-zinc-500">
                          No notifications yet.
                        </div>
                      ) : (
                        <div className="max-h-96 divide-y divide-zinc-100 overflow-auto">
                          {notifications.map((notification) => {
                            const hasCommentAnchor = !!(notification.commentId ?? notification.threadCommentId);
                            const discussionTypes = ["comment", "reply", "followed_project_comment", "mention"];
                            const shouldAppendDiscussion = hasCommentAnchor && discussionTypes.includes(notification.type);
                            const href = notification.threadId
                              ? `/thread/${notification.threadId}${shouldAppendDiscussion ? "#discussion" : ""}`
                              : notification.projectId
                                ? `/project/${notification.projectId}${shouldAppendDiscussion ? "#discussion" : ""}`
                                : "/";
                            return (
                              <Link
                                key={notification._id}
                                href={href}
                                className={`flex items-start gap-3 px-4 py-3 text-sm transition hover:bg-zinc-50 ${
                                  notification.isRead
                                    ? "text-zinc-600"
                                    : "bg-zinc-50 text-zinc-900"
                                }`}
                              >
                                <Avatar className="h-8 w-8 bg-zinc-100">
                                  <AvatarImage
                                    src={notification.actorAvatar}
                                    alt={notification.actorName}
                                  />
                                  <AvatarFallback className="text-xs font-semibold text-zinc-600">
                                    {notification.actorName.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1 space-y-1">
                                  <p className="leading-snug">
                                    {renderNotificationText(notification)}
                                  </p>
                                  <p className="text-xs text-zinc-500">
                                    {getRelativeTime(notification.lastActivityAt)}
                                  </p>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </NavigationMenuItem>
              )}

              {isAuthenticated && (
                <NavigationMenuItem>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className={navigationMenuTriggerStyle()}>
                        {convexUser?.name?.split(" ")[0] ?? "Profile"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-[180px] p-1">
                      <ul className="grid">
                        {convexUser && (
                          <li>
                            <Link
                              href={`/profile/${convexUser._id}`}
                              className="flex flex-row w-full select-none items-center gap-2 rounded-md px-3 py-2 text-sm font-medium leading-none text-zinc-700 no-underline outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:bg-zinc-100 focus:text-zinc-900"
                            >
                              <User className="h-4 w-4" />
                              <span>Profile</span>
                            </Link>
                          </li>
                        )}
                        <li>
                          <button
                            onClick={() => void signOut()}
                            className="flex w-full select-none items-center gap-2 rounded-md px-3 py-2 font-sans text-sm font-medium normal-case tracking-normal leading-none text-zinc-700 outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:bg-zinc-100 focus:text-zinc-900"
                          >
                            <LogOut className="h-4 w-4" />
                            <span>Log Out</span>
                          </button>
                        </li>
                      </ul>
                    </PopoverContent>
                  </Popover>
                </NavigationMenuItem>
              )}
            </NavigationMenuList>
          </NavigationMenu>
          {userLoading && (
            <div className="h-9 w-9 animate-pulse rounded-full bg-zinc-200" />
          )}
        </div>
      </div>
    </header>
  );
}
