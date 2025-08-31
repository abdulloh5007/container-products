
'use client';

import { Button } from '@/components/ui/button';
import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


type View = 'table' | 'grid';

interface ViewSwitcherProps {
  view: View;
  setView: (view: View) => void;
}

export function ViewSwitcher({ view, setView }: ViewSwitcherProps) {

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center rounded-md bg-muted p-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={view === 'grid' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setView('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Grid View</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={view === 'table' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setView('table')}
            >
              <List className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
           <TooltipContent>
            <p>Table View</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
