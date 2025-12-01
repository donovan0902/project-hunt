'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useEffect } from 'react';

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useQuery(api.users.current);

  useEffect(() => {
    if (user === undefined) return; // Still loading

    // If user exists but hasn't completed onboarding, redirect
    if (user && !user.onboardingCompleted) {
      router.push('/onboarding');
    }
  }, [user, router]);

  // Show loading while fetching user data
  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  // Show redirecting state if onboarding incomplete
  if (user && !user.onboardingCompleted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-zinc-500">Redirecting to onboarding...</div>
      </div>
    );
  }

  return <>{children}</>;
}
