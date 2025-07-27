'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/hooks/use-language';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';


export function LanguageSwitcher({ hasArrow }: { hasArrow?: boolean }) {
  const { language, setLanguage, t } = useLanguage();
  const langText = language === 'ru' ? 'Русский' : 'Oʻzbekcha';

  if (hasArrow) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 px-2">
            <span className="text-sm font-medium text-muted-foreground">{langText}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Switch language</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setLanguage('ru')}>
            Русский
            {language === 'ru' && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLanguage('uz')}>
            Oʻzbekcha
            {language === 'uz' && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Globe className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLanguage('ru')}>
          Русский
          {language === 'ru' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage('uz')}>
          Oʻzbekcha
          {language === 'uz' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
