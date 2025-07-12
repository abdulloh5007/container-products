
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/use-language';
import { Truck, Archive } from 'lucide-react';

export function BottomNavBar() {
  const { t } = useLanguage();
  const pathname = usePathname();

  const navItems = [
    { href: '/admin/acceptance', label: t('admin_sidebar_acceptance'), icon: Truck },
    { href: '/admin/stock', label: t('admin_sidebar_stock'), icon: Archive },
  ];
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card p-2 md:hidden">
      <div className="grid grid-cols-2 gap-2">
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
