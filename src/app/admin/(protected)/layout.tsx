'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Sidebar } from '@/components/admin/sidebar';

export default function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If not authenticated, redirect to the login page.
    // We also check this on the server in a real app using middleware.
    if (!isAuthenticated) {
      router.replace('/admin/login');
    }
  }, [isAuthenticated, router]);

  // Don't render anything until the auth check is complete.
  if (!isAuthenticated) {
    return null; 
  }

  return (
    <div className="flex min-h-screen bg-secondary">
      <Sidebar />
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
