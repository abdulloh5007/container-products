
'use client';

import { useState, useEffect, useCallback } from 'react';

export type ViewMode = 'table' | 'card';

const getInitialView = (storageKey: string): ViewMode => {
    if (typeof window === 'undefined') {
        return 'table';
    }
    const storedView = localStorage.getItem(storageKey) as ViewMode;
    if (storedView === 'table' || storedView === 'card') {
        return storedView;
    }
    // Default to card view on small screens
    return window.innerWidth < 768 ? 'card' : 'table';
};

export const useViewSwitcher = (key: string) => {
    const storageKey = `view-mode-${key}`;
    const [view, setView] = useState<ViewMode>(() => getInitialView(storageKey));

    useEffect(() => {
        // This effect runs only on the client to ensure localStorage and window are available
        const initialView = getInitialView(storageKey);
        setView(initialView);
    }, [storageKey]);

    const handleSetView = useCallback((newView: ViewMode) => {
        setView(newView);
        localStorage.setItem(storageKey, newView);
    }, [storageKey]);

    return { view, setView: handleSetView };
};
