import { useState, createContext, useContext } from 'react';
import { useTranslation } from 'react-i18next';

// Định nghĩa context
type LanguageContextType = {
    currentLanguage: string;
    changeLanguage: (lang: string) => void;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Tạo Provider cho context
export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const { i18n } = useTranslation();
    const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en');

    const changeLanguage = (language: string) => {
        i18n.changeLanguage(language);
        setCurrentLanguage(language);
        // Lưu ngôn ngữ vào localStorage để duy trì trạng thái
        localStorage.setItem('i18nextLng', language);
    };

    return (
        <LanguageContext.Provider value={{ currentLanguage, changeLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
}

// Hook để sử dụng trong các component
export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}