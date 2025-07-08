'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { Container, Package, LayoutDashboard, LogOut, Box } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const { t } = useLanguage();

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  const navItems = [
    { href: '/admin/containers', label: t('admin_sidebar_containers'), icon: Box },
    { href: '/admin/products', label: t('admin_sidebar_products'), icon: Package },
  ];

  return (
    <aside className="w-64 flex-shrink-0 border-r bg-card p-4 flex flex-col">
      <div className="flex items-center gap-2 p-4 border-b">
        <Container className="h-8 w-8 text-primary" />
        <h1 className="text-xl font-bold">{t('admin_title')}</h1>
      </div>
      <nav className="flex-grow mt-6 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-secondary',
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
      <div className="mt-auto">
        <Button variant="ghost" className="w-full justify-start gap-3" onClick={handleLogout}>
          <LogOut className="h-5 w-5" />
          {t('admin_logout')}
        </Button>
      </div>
    </aside>
  );
}
