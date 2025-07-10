
'use client';

import { List, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ViewMode } from '@/hooks/use-view-switcher';

interface ViewSwitcherProps {
  view: ViewMode;
  setView: (view: ViewMode) => void;
}

export function ViewSwitcher({ view, setView }: ViewSwitcherProps) {
  const baseButtonClass = "h-9 w-9 p-0 transition-all duration-300 ease-in-out";
  const activeClass = "bg-primary text-primary-foreground hover:bg-primary/90";
  const inactiveClass = "bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground";
  
  return (
    <div className="flex items-center rounded-lg bg-muted p-1 space-x-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setView('table')}
        className={cn(
          baseButtonClass,
          view === 'table' ? activeClass : inactiveClass
        )}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setView('card')}
        className={cn(
          baseButtonClass,
          view === 'card' ? activeClass : inactiveClass
        )}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
    </div>
  );
}
