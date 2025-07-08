'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Sidebar } from '@/components/admin/sidebar';

export default function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until loading is finished before checking auth
    if (!isLoading && !isAuthenticated) {
      router.replace('/admin/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // While loading auth state, show nothing or a loader
  if (isLoading) {
    return null; // or a loading spinner component
  }

  // If not authenticated after loading, the redirect is in flight, so render nothing.
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
