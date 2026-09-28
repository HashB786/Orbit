import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SpaceScreen from '../components/SpaceScreen';
import JoinCodeForm from '../components/JoinCodeForm';
import HeroArt from '../components/art/HeroArt';
import LanguagePicker from '../components/LanguagePicker';
import { useT } from '../context/LanguageContext';
import Slots from '../i18n/Slots';

// Minimal page for students: type the code, that's it
const Join = () => {
    const t = useT();
    return (
        <SpaceScreen center>
            <div className="w-full max-w-md text-center">
                <LanguagePicker className="mb-2" />
                <HeroArt className="w-56 sm:w-64 h-auto mx-auto -mt-2 -mb-2" />
                <h1 className="font-display font-bold text-4xl sm:text-5xl tracking-tight">
                    <Slots text={t('home.title')} slots={{ accent: <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-300 via-sky-300 to-violet-300">{t('home.titleAccent')}</span> }} />
                </h1>
                <p className="text-gray-400 mt-2 mb-6">{t('join.text')}</p>
                <JoinCodeForm autoFocus />
                <p className="text-xs text-gray-500 mt-4">{t('join.noAccount')}</p>
                <Link to="/" className="inline-flex items-center gap-1.5 mt-8 text-sm font-semibold text-gray-400 hover:text-white">
                    <ArrowLeft size={16} /> {t('join.home')}
                </Link>
            </div>
        </SpaceScreen>
    );
};

export default Join;
