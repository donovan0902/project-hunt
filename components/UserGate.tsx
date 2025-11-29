'use client';
import { useStoreUserEffect } from '@/app/useStoreUserEffect';

export default function UserGate({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useStoreUserEffect();
  if (isLoading) return <>Loading...</>;
  if (!isAuthenticated) return <>Please sign in</>;
  return <>{children}</>;
}