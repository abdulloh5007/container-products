'use client';

import { createContext, useState, ReactNode, useMemo } from 'react';
import { translations, Language, TranslationKeys } from '@/lib/translations';

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKeys) => string;
};

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('ru');

  const t = useMemo(() => (key: TranslationKeys): string => {
    return translations[language][key] || translations['ru'][key] || key;
  }, [language]);

  const value = {
    language,
    setLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
