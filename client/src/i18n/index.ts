import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';
import ar from './locales/ar.json';
import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import ru from './locales/ru.json';
import uz from './locales/uz.json';
import { config } from '../config';

export const BUILT_IN_LANGS = ['en', 'ru', 'de', 'es', 'fr', 'uz', 'ar'] as const;

export const CUSTOM_LANGS: string[] = config.CUSTOM_LANGS
  ? config.CUSTOM_LANGS.split(',').map((language) => language.trim()).filter(Boolean)
  : [];

const bundledResources = {
  ar: { translation: ar },
  de: { translation: de },
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  ru: { translation: ru },
  uz: { translation: uz },
};

const activeLangs = config.SINGLE_LANGUAGE === 'true'
  ? [config.DEFAULT_LANGUAGE || 'en']
  : [...BUILT_IN_LANGS, ...CUSTOM_LANGS];
const savedLanguage = localStorage.getItem('shm_language');
const initialLanguage = config.SINGLE_LANGUAGE === 'true'
  ? (config.DEFAULT_LANGUAGE || 'en')
  : (savedLanguage || config.DEFAULT_LANGUAGE || 'en');

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Built-in languages are bundled so the login page cannot show i18n keys
    // when a locale request is slow, cached incorrectly, or unavailable.
    resources: bundledResources,
    partialBundledLanguages: true,
    backend: {
      // Custom languages remain deployable as /app/locales/<code>.json at runtime.
      loadPath: `${import.meta.env.BASE_URL}locales/{{lng}}.json`,
    },
    lng: initialLanguage,
    fallbackLng: config.DEFAULT_LANGUAGE || 'en',
    supportedLngs: activeLangs,
    load: 'languageOnly',

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'shm_language',
    },

    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
    react: {
      useSuspense: true,
    },
  });

export default i18n;
