
'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { useInputScrollFix } from '@/hooks/use-input-scroll-fix';
import { MinimalBottomNavBar } from '@/components/admin/minimal-bottom-nav-bar';
import { useLanguage } from '@/hooks/use-language';
import { Walkthrough } from '@/components/admin/walkthrough';


function AdminSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-96 w-full" />
        </div>
      </main>
    </div>
  )
}

export default function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  
  const [isWalkthroughEnabled, setWalkthroughEnabled] = useState(false);
  
  useInputScrollFix();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/admin/login');
      return;
    }
    
    if (isAuthenticated && user) {
        const role = user.userRole;
        const managementMode = user.isManagementModeEnabled;

        const workerAllowedPaths = ['/admin/stock', '/admin/stock-history', '/admin/rentals'];
        if (role === 'worker' && !workerAllowedPaths.some(p => pathname.startsWith(p))) {
            router.replace('/admin/stock');
            return;
        }
        
        const juniorRestrictedPaths = ['/admin/products', '/admin/containers', '/admin/settings'];
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

    }
  }, [isAuthenticated, isLoading, router, user, pathname]);

  if (isLoading || !isAuthenticated) {
    return <AdminSkeleton />;
  }
  
  const onExitWalkthrough = () => {
    setWalkthroughEnabled(false);
  };
  
  const acceptanceSteps = [
    {
      element: '[data-intro="pending-requests"]',
      intro: t('admin_walkthrough_acceptance_step1')
    },
    {
      element: '[data-intro="dispatch-requests"]',
      intro: t('admin_walkthrough_acceptance_step2')
    }
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
        <main className="flex-1 p-4 sm:p-6 lg:p-8" style={{ paddingBottom: '100px' }}>{children}</main>
        <MinimalBottomNavBar />
        <Walkthrough
            isOpen={isWalkthroughEnabled}
            steps={acceptanceSteps}
            onClose={onExitWalkthrough}
        />
    </div>
  );
}
