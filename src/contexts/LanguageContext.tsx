/**
 * @fileoverview Context provider for language selection and translations.
 */

import  { createContext, useContext, useState, ReactNode } from 'react';
import { translations, type SupportedLanguage } from '../config/translations';

/**
 * Interface for language context value.
 */
interface LanguageContextType {
  /** Current language selection */
  language: SupportedLanguage;
  /** Function to update language selection */
  setLanguage: (lang: SupportedLanguage) => void;
}

/**
 * Interface for language provider props.
 */
interface LanguageProviderProps {
  /** Child components that will have access to language context */
  children: ReactNode;
}

/**
 * Context for managing application language state.
 */
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * Provider component for language context.
 * @param {LanguageProviderProps} props - The provider props.
 * @return {JSX.Element} The provider component.
 */
export function LanguageProvider({ children }: LanguageProviderProps): JSX.Element {
  const [language, setLanguage] = useState<SupportedLanguage>('en');

  const value = {
    language,
    setLanguage,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to use language context.
 * @throws {Error} If used outside of LanguageProvider
 * @return {LanguageContextType} The language context value
 */
export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  
  return context;
}

/**
 * Hook to access current translations.
 * @return {typeof translations[SupportedLanguage]} Current language translations
 */
export function useTranslations() {
  const { language } = useLanguage();
  return translations[language];
}