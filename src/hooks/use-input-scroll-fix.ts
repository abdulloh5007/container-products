
'use client';

import { useEffect } from 'react';

const isIOS = () => {
    return typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const useInputScrollFix = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // A short delay is often necessary for the keyboard to appear
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };
    
    // For iOS, 'focusin' is more reliable as it bubbles up.
    const eventType = isIOS() ? 'focusin' : 'focus';

    window.addEventListener(eventType, handleFocus, true);

    return () => {
      window.removeEventListener(eventType, handleFocus, true);
    };
  }, []);
};
