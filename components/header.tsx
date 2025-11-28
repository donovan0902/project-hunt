"use client";

import Link from "next/link";
// import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/SearchBar";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        {/* Left: Garden Logo/Name */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-xl font-semibold text-zinc-900 hover:text-zinc-700 transition-colors"
          >
            Garden
          </Link>
        </div>

        {/* Center: Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <SearchBar className="w-full" />
        </div>

        {/* Right: Auth Buttons */}
        <div className="flex items-center gap-3">
          <Unauthenticated>
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm">
                Sign Up
              </Button>
            </SignUpButton>
          </Unauthenticated>

          <Authenticated>
            <Link href="/my-projects">
              <Button size="sm" variant="ghost">
                My Projects
              </Button>
            </Link>
            <Link href="/submit">
              <Button size="sm" variant="default">
                Submit Project
              </Button>
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-9 w-9",
                },
              }}
            />
          </Authenticated>

          <AuthLoading>
            <div className="h-9 w-9 animate-pulse rounded-full bg-zinc-200" />
          </AuthLoading>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="md:hidden border-t border-zinc-200 px-4 py-3 bg-white">
        <SearchBar className="w-full" />
      </div>
    </header>
  );
}
