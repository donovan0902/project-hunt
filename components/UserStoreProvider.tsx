'use client';
import { useStoreUserEffect } from '@/app/useStoreUserEffect';

export function UserStoreProvider({ children }: { children: React.ReactNode }) {
  useStoreUserEffect(); // Run side effect to store users in Convex
  return <>{children}</>; // Don't block rendering
}
