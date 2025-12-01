'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useConvexAuth } from 'convex/react';
import { Id } from '@/convex/_generated/dataModel';
import { FocusAreaPicker } from '@/components/FocusAreaPicker';
import { FocusAreaBadges } from '@/components/FocusAreaBadges';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type FocusArea = {
  _id: Id<'focusAreas'>;
  name: string;
  description?: string;
  group: string;
};

type FocusAreasGrouped = Record<string, FocusArea[]>;

export default function OnboardingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const user = useQuery(api.users.current);
  const focusAreasGrouped = useQuery(api.focusAreas.listActiveGrouped) as FocusAreasGrouped | undefined;
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusAreaIds, setFocusAreaIds] = useState<Id<'focusAreas'>[]>([]);

  const selectedFocusAreas = useMemo<FocusArea[]>(() => {
    if (!focusAreasGrouped) return [];
    return Object.values(focusAreasGrouped)
      .flat()
      .filter((area) => focusAreaIds.includes(area._id));
  }, [focusAreasGrouped, focusAreaIds]);

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

        <CardContent className="space-y-8">
          <FocusAreaPicker
            focusAreasGrouped={focusAreasGrouped}
            selectedFocusAreas={focusAreaIds}
            onSelectionChange={setFocusAreaIds}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-700">Your selections</h3>
              {selectedFocusAreas.length > 0 && (
                <span className="text-xs text-zinc-500">{selectedFocusAreas.length} selected</span>
              )}
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
              {selectedFocusAreas.length > 0 ? (
                <FocusAreaBadges focusAreas={selectedFocusAreas} className="flex-wrap gap-2" />
              ) : (
                <p className="text-sm text-zinc-500">
                  You haven&apos;t selected any focus areas yet.
                </p>
              )}
            </div>
          </div>

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

