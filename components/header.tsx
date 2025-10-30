"use client";

import Link from "next/link";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

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
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              type="search"
              placeholder="Search projects..."
              className="w-full pl-9 bg-zinc-50 border-zinc-200 focus-visible:ring-zinc-400"
            />
          </div>
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
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            type="search"
            placeholder="Search projects..."
            className="w-full pl-9 bg-zinc-50 border-zinc-200 focus-visible:ring-zinc-400"
          />
        </div>
      </div>
    </header>
  );
}
