
'use client';

import { useState, useEffect } from 'react';

type View = 'table' | 'grid';

const getStorageKey = (pageKey: string) => `view-switcher-${pageKey}`;

export function useViewSwitcher(pageKey: string, defaultView: View = 'grid') {
  const [view, setView] = useState<View>(defaultView);

  useEffect(() => {
    try {
      const storedView = localStorage.getItem(getStorageKey(pageKey)) as View;
      if (storedView && (storedView === 'table' || storedView === 'grid')) {
        setView(storedView);
      }
    } catch (error) {
      console.error("Could not access localStorage for view switcher.", error);
    }
  }, [pageKey]);

  const handleSetView = (newView: View) => {
    try {
      localStorage.setItem(getStorageKey(pageKey), newView);
      setView(newView);
    } catch (error) {
       console.error("Could not access localStorage for view switcher.", error);
       setView(newView);
    }
  };

  return { view, setView: handleSetView };
}
