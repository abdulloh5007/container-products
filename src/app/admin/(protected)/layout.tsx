
'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Sidebar } from '@/components/admin/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { BottomNavBar } from '@/components/admin/bottom-nav-bar';
import { useInputScrollFix } from '@/hooks/use-input-scroll-fix';
import { MinimalBottomNavBar } from '@/components/admin/minimal-bottom-nav-bar';
import { useLanguage } from '@/hooks/use-language';
import { Walkthrough } from '@/components/admin/walkthrough';


function AdminSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 w-full border-b bg-card">
         <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-6 w-32 hidden sm:inline-block" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-10 w-10" />
            </div>
         </div>
      </header>
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-96 w-full" />
        </div>
      </main>
    </div>
  )
}

const WALKTHROUGH_ACCEPTANCE_KEY = 'walkthrough-acceptance-seen';

export default function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading, viewMode, loginState } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  
  const [isWalkthroughEnabled, setWalkthroughEnabled] = useState(false);
  
  useInputScrollFix();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated && loginState !== 'pending') {
      router.replace('/admin/login');
      return;
    }
    
    if (isAuthenticated && user?.currentSession) {
        const role = user.currentSession.role;
        const managementMode = user.isManagementModeEnabled;

        // Redirect pending users to worker login page
        if (role === 'pending') {
            router.replace('/admin/login');
            return;
        }

        const workerAllowedPaths = ['/admin/stock', '/admin/stock-history'];
        if (role === 'worker' && !workerAllowedPaths.includes(pathname)) {
            router.replace('/admin/stock');
            return;
        }
        
        const juniorRestrictedPaths = ['/admin/products', '/admin/containers', '/admin/settings', '/admin/settings/devices', '/admin/settings/profile', '/admin/rentals'];
        if (role === 'junior' && juniorRestrictedPaths.some(p => pathname.startsWith(p))) {
            router.replace('/admin/acceptance');
            return;
        }

        // Senior only pages restriction if management mode is off
        const seniorManagementPaths = ['/admin/products', '/admin/containers'];
        if (role === 'senior' && !managementMode && seniorManagementPaths.some(p => pathname.startsWith(p))) {
            router.replace('/admin/acceptance');
            return;
        }

        // Walkthrough logic for acceptance page
        if (role === 'senior' && pathname === '/admin/acceptance') {
            const hasSeenWalkthrough = localStorage.getItem(WALKTHROUGH_ACCEPTANCE_KEY);
            // Only show if there are pending requests to point to
            if (!hasSeenWalkthrough && user?.sessions.some(s => s.role === 'pending')) {
                // Short delay to ensure the element is rendered
                setTimeout(() => setWalkthroughEnabled(true), 500);
            }
        } else {
            setWalkthroughEnabled(false);
        }
    }
  }, [isAuthenticated, isLoading, router, user, pathname, loginState]);

  if (isLoading || (!isAuthenticated && loginState !== 'pending')) {
    return <AdminSkeleton />;
  }

  if (!isAuthenticated && loginState !== 'pending') {
    return null;
  }

  if (loginState === 'pending') {
      return null;
  }
  
  const onExitWalkthrough = () => {
    setWalkthroughEnabled(false);
    localStorage.setItem(WALKTHROUGH_ACCEPTANCE_KEY, 'true');
  };
  
  const acceptanceSteps = [
    {
      element: '[data-intro="pending-requests"]',
      intro: t('admin_walkthrough_pending_requests'),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
        {viewMode === 'classic' ? <Sidebar /> : null}
        <main className="flex-1 p-4 sm:p-6 lg:p-8" style={{ paddingBottom: '100px' }}>{children}</main>
        {viewMode === 'classic' ? <BottomNavBar /> : <MinimalBottomNavBar />}
        <Walkthrough
            isOpen={isWalkthroughEnabled}
            steps={acceptanceSteps}
            onClose={onExitWalkthrough}
        />
    </div>
  );
}
