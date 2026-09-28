import React from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState, btn } from '../components/ui';
import { useT } from '../context/LanguageContext';

const NotFound = () => {
    const t = useT();
    return (
        <div className="py-10">
            <EmptyState icon={Compass} title={t('notFound.title')} action={<Link to="/" className={btn.primary}>{t('notFound.home')}</Link>}>
                {t('notFound.text')}
            </EmptyState>
        </div>
    );
};

export default NotFound;
