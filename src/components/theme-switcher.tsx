'use client';

import * as React from 'react';
import { Moon, Sun, Check, ChevronDown } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/hooks/use-language';

export function ThemeSwitcher({ hasArrow }: { hasArrow?: boolean }) {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();

  const themeText = t(
    theme === 'light' ? 'theme_light' : theme === 'dark' ? 'theme_dark' : 'theme_system'
  );

  if (hasArrow) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
           <Button variant="ghost" className="flex items-center gap-2 px-2">
            <span className="text-sm font-medium text-muted-foreground">{themeText}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">{t('toggle_theme')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme('light')}>
            {t('theme_light')}
            {theme === 'light' && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')}>
            {t('theme_dark')}
            {theme === 'dark' && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')}>
            {t('theme_system')}
            {theme === 'system' && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{t('toggle_theme')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          {t('theme_light')}
          {theme === 'light' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          {t('theme_dark')}
          {theme === 'dark' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          {t('theme_system')}
          {theme === 'system' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
