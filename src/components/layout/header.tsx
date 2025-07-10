
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Container } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useLanguage } from '@/hooks/use-language';
import { ThemeSwitcher } from '@/components/theme-switcher';


export function Header() {
  const { t } = useLanguage();
  const pathname = usePathname();
  
  // Hide header on admin pages
  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center">
        <Link href="/" className="mr-6 flex items-center gap-2">
          <Container className="h-6 w-6 text-primary" />
          <span className="font-bold sm:inline-block font-headline">
            {t('app_name')}
          </span>
        </Link>

        <div className="flex flex-1 items-center justify-end gap-2">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
