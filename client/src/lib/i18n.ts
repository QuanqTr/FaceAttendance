import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import các file ngôn ngữ
import enTranslation from '../locales/en/translation.json';
import viTranslation from '../locales/vi/translation.json';

// Cấu hình i18next
i18n
    // Sử dụng language detector để tự động phát hiện ngôn ngữ
    .use(LanguageDetector)
    // Khởi tạo react-i18next
    .use(initReactI18next)
    // Cấu hình i18next
    .init({
        // Tài nguyên dịch thuật
        resources: {
            en: {
                translation: enTranslation
            },
            vi: {
                translation: viTranslation
            }
        },
        // Ngôn ngữ mặc định
        fallbackLng: 'en',
        // Cho phép các khóa lồng nhau
        keySeparator: '.',
        interpolation: {
            // Không escape các giá trị dịch - không cần thiết cho React vì nó đã tự động escape
            escapeValue: false
        },
        // Phát hiện và ghi nhớ ngôn ngữ
        detection: {
            // Thứ tự phát hiện: localStorage, cookie, navigator
            order: ['localStorage', 'cookie', 'navigator'],
            // Lưu ngôn ngữ đã chọn trong localStorage
            caches: ['localStorage', 'cookie'],
            // Tên của item trong localStorage
            lookupLocalStorage: 'i18nextLng'
        }
    });

export default i18n;
