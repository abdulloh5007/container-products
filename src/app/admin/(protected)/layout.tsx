
'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Sidebar } from '@/components/admin/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { BottomNavBar } from '@/components/admin/bottom-nav-bar';
import { useInputScrollFix } from '@/hooks/use-input-scroll-fix';
import { MinimalBottomNavBar } from '@/components/admin/minimal-bottom-nav-bar';
import 'intro.js/introjs.css';
import { Steps } from 'intro.js-react';
import { useLanguage } from '@/hooks/use-language';


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

const WALKTHROUGH_STORAGE_KEY = 'admin-walkthrough-seen';

export default function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading, viewMode } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  
  const [isWalkthroughEnabled, setWalkthroughEnabled] = useState(false);
  
  useInputScrollFix();

  useEffect(() => {
    // Wait until loading is finished before checking auth
    if (!isLoading && !isAuthenticated) {
      router.replace('/admin/login');
      return;
    }
    
    if (!isLoading && isAuthenticated) {
        const role = user?.currentSession?.role;
        
        if (role === 'pending') {
            router.replace('/admin/login');
            return;
        }

        if (role === 'worker' && pathname !== '/admin/stock') {
            router.replace('/admin/stock');
            return;
        }
        
        // Walkthrough logic
        if (role === 'senior' && pathname === '/admin/acceptance') {
            const hasSeenWalkthrough = localStorage.getItem(WALKTHROUGH_STORAGE_KEY);
            if (!hasSeenWalkthrough) {
                setWalkthroughEnabled(true);
            }
        } else {
            setWalkthroughEnabled(false);
        }
    }
  }, [isAuthenticated, isLoading, router, user, pathname]);

  // While loading auth state, show a full-page loader or skeleton
  if (isLoading) {
    return <AdminSkeleton />;
  }

  // If not authenticated after loading, the redirect is in flight, so render nothing.
  if (!isAuthenticated) {
    return null;
  }
  
  const onExit = () => {
    setWalkthroughEnabled(false);
    localStorage.setItem(WALKTHROUGH_STORAGE_KEY, 'true');
  };
  
  const steps = [
    {
      element: '[data-intro="pending-requests"]',
      intro: 'Здесь появляются новые запросы на доступ. Теперь вы можете одобрять или отклонять их прямо с главного экрана.',
    },
    {
      element: '[data-intro="view-switcher"]',
      intro: 'Используйте этот переключатель для изменения вида страниц между таблицей и карточками для более удобного просмотра.',
    },
  ];

  return (
    <>
    <Steps
        enabled={isWalkthroughEnabled}
        steps={steps}
        initialStep={0}
        onExit={onExit}
        options={{
          nextLabel: 'Далее',
          prevLabel: 'Назад',
          doneLabel: 'Готово',
          tooltipClass: 'custom-tooltip-class',
        }}
      />
    <div className="flex min-h-screen flex-col bg-background">
        {viewMode === 'classic' && <Sidebar />}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">{children}</main>
        {viewMode === 'classic' ? <BottomNavBar /> : <MinimalBottomNavBar />}
    </div>
    </>
  );
}
