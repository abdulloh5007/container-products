'use client';

import { useLanguage } from '@/hooks/use-language';
import Link from 'next/link';
import { Container, Phone } from 'lucide-react';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="w-full bg-card border-t">
      <div className="container mx-auto py-8 px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Container className="h-6 w-6 text-primary" />
            <span className="font-bold font-headline">{t('app_name')}</span>
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
             <p className="text-sm text-muted-foreground">
               &copy; {new Date().getFullYear()} {t('footer_rights')}
             </p>
            <a href="tel:+998901234567" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
                <Phone className="h-4 w-4" />
                +998 90 123 45 67
            </a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="#" className="text-sm text-muted-foreground hover:text-primary">
              {t('footer_privacy')}
            </Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-primary">
              {t('footer_terms')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
