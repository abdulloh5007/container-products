
'use client';

import { createContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { translations, Language, TranslationKeys } from '@/lib/translations';

type TFunction = (key: TranslationKeys, replacements?: Record<string, string>) => string;

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: TFunction;
};

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Start with the default language to avoid hydration mismatch.
  const [language, setLanguageState] = useState<Language>('ru');

  // On component mount (client-side only), check localStorage.
  useEffect(() => {
    const storedLang = localStorage.getItem('language');
    if (storedLang === 'ru' || storedLang === 'uz') {
      setLanguageState(storedLang);
    }
  }, []);

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    localStorage.setItem('language', newLanguage);
  };

  const t = useMemo(() => (key: TranslationKeys, replacements?: Record<string, string>): string => {
    let translation = translations[language][key] || translations['ru'][key] || key;
    if (replacements) {
        Object.keys(replacements).forEach(rKey => {
            translation = translation.replace(`{${rKey}}`, replacements[rKey]);
        })
    }
    return translation;
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
