import React from 'react';
import Flag from './art/Flag';
import { useLanguage } from '../context/LanguageContext';

const NAMES = { en: 'English', uz: 'Oʻzbekcha', ru: 'Русский' };

// Compact flag switcher for student screens (they never visit Settings)
const LanguagePicker = ({ className = '' }) => {
    const { lang, setLang, t } = useLanguage();
    return (
        <div className={`inline-flex items-center gap-1 p-1 rounded-full bg-white/[0.07] border border-white/10 ${className}`} role="group" aria-label={t('settings.tabs.language')}>
            {Object.entries(NAMES).map(([code, name]) => (
                <button
                    key={code}
                    type="button"
                    onClick={() => setLang(code)}
                    aria-pressed={lang === code}
                    title={name}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold transition-colors ${lang === code ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    <Flag code={code} className="w-5 h-3.5 rounded-[3px]" />
                    <span className="uppercase">{code}</span>
                </button>
            ))}
        </div>
    );
};

export default LanguagePicker;
