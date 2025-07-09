'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { Container, Package, LogOut, Box, Menu, Settings } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const { t } = useLanguage();
  const [isSheetOpen, setSheetOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  const navItems = [
    { href: '/admin/containers', label: t('admin_sidebar_containers'), icon: Box },
    { href: '/admin/products', label: t('admin_sidebar_products'), icon: Package },
  ];
  
  const closeSheet = () => setSheetOpen(false);

  return (
      <header className="sticky top-0 z-40 w-full border-b bg-card">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <Link href="/admin/containers" className="flex items-center gap-2 font-semibold">
            <Container className="h-6 w-6 text-primary" />
            <span className="hidden sm:inline-block">{t('admin_title')}</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <LanguageSwitcher />
            <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="flex w-[320px] flex-col p-4">
                 <SheetHeader className="border-b pb-4 mb-4">
                   <SheetTitle>
                     <Link href="/admin/containers" onClick={closeSheet} className="flex items-center gap-2 font-semibold">
                       <Container className="h-6 w-6 text-primary" />
                       <span>{t('admin_title')}</span>
                     </Link>
                   </SheetTitle>
                 </SheetHeader>
                <nav className="flex flex-row gap-4">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={closeSheet}
                            className={cn(
                                'flex h-24 flex-1 flex-col items-center justify-center gap-2 rounded-lg p-2 transition-all',
                                isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-card text-muted-foreground hover:bg-muted'
                            )}
                        >
                            <Icon className="h-8 w-8" />
                            <span className="text-center text-xs font-medium">{item.label}</span>
                        </Link>
                    );
                })}
                </nav>
                 <div className="mt-auto border-t pt-4">
                   <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => { router.push('/admin/settings'); closeSheet(); }}>
                     <Settings className="h-4 w-4" />
                     {t('admin_sidebar_settings')}
                   </Button>
                   <Button variant="ghost" className="w-full justify-start gap-3" onClick={handleLogout}>
                     <LogOut className="h-4 w-4" />
                     {t('admin_logout')}
                   </Button>
                 </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
  );
}
