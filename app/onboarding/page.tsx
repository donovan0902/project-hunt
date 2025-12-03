'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useConvexAuth } from 'convex/react';
import { Id } from '@/convex/_generated/dataModel';
import { FocusAreaPicker } from '@/components/FocusAreaPicker';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoading: authLoading } = useConvexAuth();
  const user = useQuery(api.users.current);
  const focusAreasGrouped = useQuery(api.focusAreas.listActiveGrouped);
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusAreaIds, setFocusAreaIds] = useState<Id<'focusAreas'>[]>([]);

  useEffect(() => {
    if (user?.onboardingCompleted) {
      router.push('/');
    }
  }, [user, router]);

  const canProceed = focusAreaIds.length > 0;

  const handleComplete = async () => {
    if (!canProceed) return;

    setIsSubmitting(true);
    try {
      await completeOnboarding({
        focusAreaIds,
      });
      router.push('/');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      setIsSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-3xl border border-zinc-200">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="text-2xl text-zinc-900">Choose your focus areas</CardTitle>
          <CardDescription className="mt-2 text-base">
            To personalize your garden, pick at least one domain that best represents the problems you&apos;re interested in.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <FocusAreaPicker
            focusAreasGrouped={focusAreasGrouped}
            selectedFocusAreas={focusAreaIds}
            onSelectionChange={setFocusAreaIds}
          />

          {!canProceed && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Select at least one focus area to continue.
            </div>
          )}
        </CardContent>

        <CardFooter className="justify-end border-t border-zinc-100">
          <Button onClick={handleComplete} disabled={isSubmitting || !canProceed}>
            {isSubmitting ? 'Completing...' : 'Complete setup'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

