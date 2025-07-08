'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { Container, Package, LogOut, Box, Menu } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// This component is now the header for the admin section.
// The navigation is in a Sheet (drawer) triggered by a hamburger button.
// The component is still named `Sidebar` to avoid breaking the import in the layout.
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
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/admin/containers" className="flex items-center gap-2 font-semibold">
            <Container className="h-6 w-6 text-primary" />
            <span>{t('admin_title')}</span>
          </Link>
          
          <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col p-4">
               <SheetHeader className="border-b pb-4 mb-4">
                 <SheetTitle>
                   <Link href="/admin/containers" onClick={closeSheet} className="flex items-center gap-2 font-semibold">
                     <Container className="h-6 w-6 text-primary" />
                     <span>{t('admin_title')}</span>
                   </Link>
                 </SheetTitle>
               </SheetHeader>
               <nav className="flex-grow grid gap-2">
                 {navItems.map((item) => {
                   const Icon = item.icon;
                   return (
                     <Link
                       key={item.href}
                       href={item.href}
                       onClick={closeSheet}
                       className={cn(
                         'flex items-center gap-4 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-secondary',
                         (pathname.startsWith(item.href) && item.href !== '/admin') || pathname === item.href
                           ? 'bg-secondary text-primary'
                           : ''
                       )}
                     >
                       <Icon className="h-5 w-5" />
                       {item.label}
                     </Link>
                   );
                 })}
               </nav>
               <div className="mt-auto border-t pt-4">
                 <Button variant="ghost" className="w-full justify-start gap-4" onClick={handleLogout}>
                   <LogOut className="h-5 w-5" />
                   {t('admin_logout')}
                 </Button>
               </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
  );
}
