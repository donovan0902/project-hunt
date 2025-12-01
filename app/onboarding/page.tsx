'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useConvexAuth } from 'convex/react';
import { Id } from '@/convex/_generated/dataModel';

type OnboardingStep = 'team' | 'interests' | 'profile';

export default function OnboardingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const user = useQuery(api.users.current);
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('team');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    teamId: undefined as Id<"teams"> | undefined,
    focusAreaIds: [] as Id<"focusAreas">[],
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/sign-in');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (user?.onboardingCompleted) {
      router.push('/');
    }
  }, [user, router]);

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await completeOnboarding({
        teamId: formData.teamId,
        focusAreaIds: formData.focusAreaIds,
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
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-sm border border-zinc-200 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900">Welcome to Garden</h1>
          <p className="text-zinc-600 mt-2">Let&apos;s set up your profile</p>
        </div>

        <div className="flex items-center gap-2 mb-8">
          <StepIndicator step={1} label="Team" active={currentStep === 'team'} completed={currentStep !== 'team'} />
          <div className="flex-1 h-px bg-zinc-200" />
          <StepIndicator step={2} label="Interests" active={currentStep === 'interests'} completed={currentStep === 'profile'} />
          <div className="flex-1 h-px bg-zinc-200" />
          <StepIndicator step={3} label="Profile" active={currentStep === 'profile'} completed={false} />
        </div>

        {currentStep === 'team' && (
          <div>
            <h2 className="text-lg font-medium mb-4">Select Your Team</h2>
            <p className="text-zinc-600 mb-6">TODO: Team selection/creation form</p>
            <button
              onClick={() => setCurrentStep('interests')}
              className="px-4 py-2 bg-zinc-900 text-white rounded hover:bg-zinc-800"
            >
              Next
            </button>
          </div>
        )}

        {currentStep === 'interests' && (
          <div>
            <h2 className="text-lg font-medium mb-4">Choose Your Interests</h2>
            <p className="text-zinc-600 mb-6">TODO: Focus areas selection</p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentStep('team')}
                className="px-4 py-2 border border-zinc-300 rounded hover:bg-zinc-50"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep('profile')}
                className="px-4 py-2 bg-zinc-900 text-white rounded hover:bg-zinc-800"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {currentStep === 'profile' && (
          <div>
            <h2 className="text-lg font-medium mb-4">Complete Your Profile</h2>
            <p className="text-zinc-600 mb-6">TODO: Additional profile fields</p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentStep('interests')}
                className="px-4 py-2 border border-zinc-300 rounded hover:bg-zinc-50"
                disabled={isSubmitting}
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="px-4 py-2 bg-zinc-900 text-white rounded hover:bg-zinc-800 disabled:opacity-50"
              >
                {isSubmitting ? 'Completing...' : 'Complete Setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepIndicator({ step, label, active, completed }: {
  step: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
        ${active ? 'bg-zinc-900 text-white' : completed ? 'bg-zinc-200 text-zinc-600' : 'bg-zinc-100 text-zinc-400'}
      `}>
        {step}
      </div>
      <span className={`text-sm ${active ? 'text-zinc-900 font-medium' : 'text-zinc-500'}`}>
        {label}
      </span>
    </div>
  );
}
