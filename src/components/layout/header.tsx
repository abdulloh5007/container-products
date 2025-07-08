'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Container, Menu, X, UserCog } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet';
import { useLanguage } from '@/hooks/use-language';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


export function Header() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: t('nav_home') },
    { href: '/containers', label: t('nav_containers') },
    { href: '/products', label: t('nav_products') },
  ];

  const NavItems = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {navLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            'transition-colors hover:text-primary',
            pathname === link.href ? 'text-primary font-semibold' : 'text-foreground/80',
            isMobile ? 'text-lg py-2' : 'text-sm font-medium'
          )}
          onClick={() => isMobile && setMobileMenuOpen(false)}
        >
          {link.label}
        </Link>
      ))}
    </>
  );
  
  // Hide header on admin pages
  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center">
        <Link href="/" className="mr-6 flex items-center gap-2">
          <Container className="h-6 w-6 text-primary" />
          <span className="font-bold hidden sm:inline-block font-headline">
            {t('app_name')}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <NavItems />
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2">
          <LanguageSwitcher />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="ghost" size="icon">
                  <Link href="/admin">
                    <UserCog className="h-[1.2rem] w-[1.2rem]" />
                    <span className="sr-only">{t('nav_admin')}</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('nav_admin')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>


          <Sheet open={isMobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[80vw]">
              <SheetTitle className="sr-only">{t('mobile_menu_title')}</SheetTitle>
              <SheetDescription className="sr-only">{t('mobile_menu_desc')}</SheetDescription>
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center border-b pb-4">
                  <Link href="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                    <Container className="h-6 w-6 text-primary" />
                    <span className="font-bold font-headline">{t('app_name')}</span>
                  </Link>
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon">
                      <X className="h-6 w-6" />
                      <span className="sr-only">Close menu</span>
                    </Button>
                  </SheetClose>
                </div>
                <nav className="flex flex-col items-start gap-4 mt-8">
                  <NavItems isMobile />
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
