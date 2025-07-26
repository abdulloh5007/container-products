
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
  const role = user?.currentSession?.role;
  const isSenior = role === 'senior';

  const allNavItems = [
    { href: '/admin/acceptance', label: t('admin_sidebar_acceptance'), icon: Truck, roles: ['senior', 'junior'] },
    { href: '/admin/stock', label: t('admin_sidebar_stock'), icon: Archive, roles: ['senior', 'junior', 'worker'] },
    { href: '/admin/rentals', label: t('admin_rentals_title'), icon: Warehouse, roles: ['senior'] },
    { href: '/admin/settings', label: t('admin_sidebar_settings'), icon: Settings, roles: ['senior', 'junior'] },
  ];
  
  const navItems = allNavItems.filter(item => role && item.roles.includes(role));

  if (navItems.length === 0) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card p-2 md:hidden">
      <div className={cn("grid gap-2",
        `grid-cols-${navItems.length}`
      )}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-lg p-2 transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-center text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
