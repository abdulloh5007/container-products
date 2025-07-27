
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { Container, Package, LogOut, Box, Menu, Settings, Archive, Truck, History, ListCollapse, Warehouse, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { t } = useLanguage();
  const [isSheetOpen, setSheetOpen] = useState(false);
  const isSenior = user?.currentSession.role === 'senior';
  const role = user?.currentSession.role;
  const pendingRequests = user?.sessions.filter(s => s.role === 'pending').length || 0;

  const handleLogout = async () => {
    await logout();
  };
  
  const handleRefresh = () => {
    window.location.reload();
  };
  
  const closeSheet = () => setSheetOpen(false);

  const managementNavItems = [
      { href: '/admin/containers', label: t('admin_sidebar_containers'), icon: Box },
      { href: '/admin/products', label: t('admin_sidebar_products'), icon: Package },
  ]
  
  const historyNavItem = { href: '/admin/history', label: t('admin_sidebar_history'), icon: History };
  const stockHistoryNavItem = { href: '/admin/stock-history', label: t('admin_sidebar_stock_history'), icon: ListCollapse };
  const rentalsNavItem = { href: '/admin/rentals', label: t('admin_rentals_title'), icon: Warehouse, roles: ['senior'] };
  
  const mainNavItems = [
      { href: '/admin/acceptance', label: t('admin_sidebar_acceptance'), icon: Truck, roles: ['senior', 'junior'], className: 'hidden md:flex' },
      { href: '/admin/stock', label: t('admin_sidebar_stock'), icon: Archive, roles: ['senior', 'junior', 'worker'], className: 'hidden md:flex' },
  ];

  const handleSheetLinkClick = (href: string) => {
    router.push(href);
    closeSheet();
  };
  
  const renderNavGrid = () => {
      let navItems = [...mainNavItems];

      if (user?.isManagementModeEnabled && isSenior) {
        navItems.push(...managementNavItems.map(item => ({ ...item, roles: ['senior'] })));
      }
      
      navItems.push({ ...historyNavItem, roles: ['senior', 'junior'] });
      
      if (isSenior) {
        navItems.push({ ...stockHistoryNavItem, roles: ['senior'] });
      }

      navItems.push(rentalsNavItem);

      const visibleItems = navItems.filter(item => role && item.roles.includes(role));

      return visibleItems.map((item, index) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        const isLastItemOnOddRow = visibleItems.length % 2 !== 0 && index === visibleItems.length - 1;
        
        return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeSheet}
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-lg p-3 text-sm font-medium transition-colors',
                isLastItemOnOddRow ? 'col-span-2' : 'aspect-square',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
                item.className
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-center">{item.label}</span>
            </Link>
        );
      });
  }


  const isSettingsActive = pathname.startsWith('/admin/settings');

  return (
      <header className="sticky top-0 z-40 w-full border-b bg-card">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/admin/acceptance" className="flex items-center gap-2 font-semibold">
              <Container className="h-6 w-6 text-primary" />
              <span className="hidden sm:inline-block">{t('admin_title')}</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleRefresh}>
                <RefreshCw className="h-5 w-5" />
                <span className="sr-only">{t('admin_refresh_button')}</span>
            </Button>
            <ThemeSwitcher />
            <LanguageSwitcher />
            <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="flex w-full max-w-xs flex-col p-4">
                 <SheetHeader className="border-b pb-4 mb-4">
                   <SheetTitle>
                     <Link href="/admin/acceptance" onClick={closeSheet} className="flex items-center gap-2 font-semibold">
                       <Container className="h-6 w-6 text-primary" />
                       <span>{t('admin_title')}</span>
                     </Link>
                   </SheetTitle>
                 </SheetHeader>
                <div className="grid grid-cols-2 gap-2 mb-4">
                   {renderNavGrid()}
                </div>
                 <div className="mt-auto border-t pt-4 space-y-2">
                   {isSenior && (
                     <Button 
                       variant="ghost" 
                       className={cn(
                         "w-full justify-start gap-3 text-base relative",
                         isSettingsActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                       )}
                       onClick={() => handleSheetLinkClick('/admin/settings')}
                     >
                       <Settings className="h-5 w-5" />
                       {t('admin_sidebar_settings')}
                        {pendingRequests > 0 && (
                          <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 rounded-full" />
                        )}
                     </Button>
                   )}
                   <Button variant="ghost" className="w-full justify-start gap-3 text-base text-destructive hover:text-destructive" onClick={handleLogout}>
                     <LogOut className="h-5 w-5" />
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
