'use client';

import { OnboardingGuard } from './OnboardingGuard';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OnboardingGuard>{children}</OnboardingGuard>;
}
