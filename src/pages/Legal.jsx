import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ScrollText, ShieldCheck } from 'lucide-react';
import { PageHeader, btn, cx } from '../components/ui';
import { useLanguage } from '../context/LanguageContext';
import { CONTACT_EMAIL, LEGAL_UPDATED } from '../config/site';
import { localeOf } from '../i18n';

// Terms of Use and Privacy Policy (doc = 'terms' | 'privacy')
const Legal = ({ doc }) => {
    const { t, raw, lang } = useLanguage();
    const navigate = useNavigate();
    const content = raw(`legal.${doc}`) || {};
    const date = new Date(`${LEGAL_UPDATED}T00:00:00`).toLocaleDateString(localeOf(lang), { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <article className="max-w-3xl mx-auto space-y-6 md:pb-16">
            <button onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))} className={cx(btn.ghost, '-ml-3')}>
                <ArrowLeft size={18} /> {t('legal.back')}
            </button>
            <PageHeader icon={doc === 'terms' ? ScrollText : ShieldCheck} tone={doc === 'terms' ? 'sky' : 'violet'} title={content.title} subtitle={t('legal.updated', { date })} />
            <div className="orbit-card p-5 sm:p-8 space-y-6">
                <p className="text-gray-700 dark:text-gray-200 text-lg">{content.intro}</p>
                {(content.sections || []).map(section => (
                    <section key={section.h}>
                        <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">{section.h}</h2>
                        <div className="mt-2 space-y-2 text-gray-600 dark:text-gray-300 leading-relaxed">
                            {section.p.map((para, i) => <p key={i}>{para}</p>)}
                        </div>
                    </section>
                ))}
                <p className="pt-4 border-t border-gray-200/80 dark:border-white/10 text-sm text-gray-500 dark:text-gray-400">
                    {CONTACT_EMAIL ? t('legal.contactWith', { email: CONTACT_EMAIL }) : t('legal.contactSchool')}
                </p>
            </div>
        </article>
    );
};

export default Legal;
