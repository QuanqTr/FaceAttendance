import { useState, createContext, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Define context
type LanguageContextType = {
    currentLanguage: string;
    changeLanguage: (lang: string) => void;
    isRtl: boolean;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Get the initial language from storage or browser preference
function getInitialLanguage(): string {
    // First check localStorage
    const storedLang = localStorage.getItem('i18nextLng');
    if (storedLang && ['en', 'vi'].includes(storedLang)) {
        return storedLang;
    }

    // Then check browser preference
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'vi') {
        return 'vi';
    }

    // Default to English
    return 'en';
}

// Create Provider for context
export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const { i18n } = useTranslation();
    const [currentLanguage, setCurrentLanguage] = useState(getInitialLanguage());

    // Update the language on mount
    useEffect(() => {
        const initialLang = getInitialLanguage();
        if (initialLang !== i18n.language) {
            i18n.changeLanguage(initialLang);
        }
        setCurrentLanguage(initialLang);
    }, []);

    // Listen for changes to the language from other parts of the app
    useEffect(() => {
        const handleLanguageChange = () => {
            setCurrentLanguage(i18n.language);
        };

        i18n.on('languageChanged', handleLanguageChange);
        return () => {
            i18n.off('languageChanged', handleLanguageChange);
        };
    }, [i18n]);

    const changeLanguage = (language: string) => {
        i18n.changeLanguage(language);
        setCurrentLanguage(language);
        // Save language to localStorage to maintain state
        localStorage.setItem('i18nextLng', language);
        // Also save to document for potential CSS selectors
        document.documentElement.setAttribute('lang', language);
    };

    // RTL support (for future languages like Arabic)
    const isRtl = ['ar', 'he'].includes(currentLanguage);

    return (
        <LanguageContext.Provider value={{ currentLanguage, changeLanguage, isRtl }}>
            {children}
        </LanguageContext.Provider>
    );
}

// Hook to use within components
export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}