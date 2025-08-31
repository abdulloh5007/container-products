
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/use-language';
import { Truck, Archive, Settings, Warehouse } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export function MinimalBottomNavBar() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.userRole;

  const allNavItems = [
    { href: '/admin/acceptance', label: t('admin_sidebar_acceptance'), icon: Truck, roles: ['senior', 'junior'] },
    { href: '/admin/stock', label: t('admin_sidebar_stock'), icon: Archive, roles: ['senior', 'junior', 'worker'] },
    { href: '/admin/rentals', label: t('admin_rentals_title'), icon: Warehouse, roles: ['senior', 'junior', 'worker'] },
    { href: '/admin/settings', label: t('admin_sidebar_settings'), icon: Settings, roles: ['senior'] },
  ];
  
  const navItems = allNavItems.filter(item => role && item.roles.includes(role));

  if (navItems.length === 0) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/80 backdrop-blur-md p-2 shadow-2xl md:hidden">
      <div className="grid grid-flow-col auto-cols-fr gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-lg p-2 transition-all duration-300',
                isActive
                  ? 'bg-primary text-primary-foreground scale-105 shadow-md'
                  : 'text-muted-foreground hover:bg-muted/50 hover:scale-105'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-center text-[10px] font-medium leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
