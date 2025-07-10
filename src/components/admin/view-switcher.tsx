
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
  return (
    <div className="flex items-center">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setView('table')}
        className={cn(view === 'table' && 'bg-accent text-accent-foreground')}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setView('card')}
        className={cn(view === 'card' && 'bg-accent text-accent-foreground')}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
    </div>
  );
}
