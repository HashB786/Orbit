import React, { useEffect, useMemo, useState } from 'react';
import { Compass, Search, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import SetCard, { HostButton, subjectName } from '../components/sets/SetCard';
import { EmptyState, Spinner, TypeBadge, PageHeader, btn, inputClass, cx } from '../components/ui';
import { FEATURED_SETS } from '../platform/sets/featured';
import { usePublicSets, refreshPublicSets } from '../platform/sets/publicSets';
import { matchesSearch, SUBJECTS, GRADES, gradeName } from '../platform/sets/search';
import { TYPE_IDS } from '../platform/questions/types';
import { useT } from '../context/LanguageContext';

const Discover = () => {
    const t = useT();
    const pub = usePublicSets();
    const [query, setQuery] = useState('');
    const [subject, setSubject] = useState('');
    const [grade, setGrade] = useState('');
    const [type, setType] = useState('');
    const [sort, setSort] = useState('new');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        // Load once automatically; after a failure the user retries with the refresh button
        if (!pub.attempted) refreshPublicSets();
    }, [pub.attempted]);

    const filter = (list) => list.filter(s =>
        s.questions.length > 0 &&
        matchesSearch(s, query) &&
        (!subject || s.subject === subject) &&
        (!grade || s.grade === grade) &&
        (!type || s.questions.some(q => q.type === type))
    );

    // Built-in picks plus community sets the admin featured
    const featured = useMemo(() => filter([...FEATURED_SETS, ...pub.sets.filter(s => s.featured)]), [pub.sets, query, subject, grade, type]); // eslint-disable-line react-hooks/exhaustive-deps
    const community = useMemo(() => {
        const list = filter(pub.sets.filter(s => !s.featured));
        return sort === 'popular'
            ? [...list].sort((a, b) => (b.plays || 0) - (a.plays || 0))
            : [...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }, [pub.sets, query, subject, grade, type, sort]); // eslint-disable-line react-hooks/exhaustive-deps

    const activeFilters = (subject ? 1 : 0) + (grade ? 1 : 0) + (type ? 1 : 0);

    return (
        <div className="space-y-6 md:pb-16">
            <PageHeader icon={Compass} tone="violet" title={t('nav.discover')} subtitle={t('discover.subtitle')} />

            <div className="flex gap-2">
                <div className="relative flex-1 min-w-0">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder={t('discover.searchPlaceholder')}
                        className={`${inputClass} pl-10 py-3`}
                        aria-label={t('discover.searchLabel')}
                    />
                    {query && (
                        <button onClick={() => setQuery('')} aria-label={t('discover.clearSearch')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-700">
                            <X size={16} />
                        </button>
                    )}
                </div>
                <button onClick={() => setShowFilters(v => !v)} className={cx(btn.secondary, 'shrink-0', showFilters && 'ring-2 ring-primary-500')} aria-expanded={showFilters}>
                    <SlidersHorizontal size={18} />
                    <span className="hidden sm:inline">{t('discover.filters')}</span>
                    {activeFilters > 0 && <span className="px-1.5 rounded-full bg-primary-500 text-white text-xs">{activeFilters}</span>}
                </button>
            </div>

            {showFilters && (
                <div className="orbit-card p-4 space-y-4">
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{t('discover.subject')}</h3>
                        <div className="flex flex-wrap gap-2">
                            {['', ...SUBJECTS].map(s => (
                                <button key={s || 'all'} onClick={() => setSubject(s)}
                                    className={cx('px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors', subject === s
                                        ? 'bg-primary-600 border-primary-600 text-white'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-400')}>
                                    {s ? subjectName(t, s) : t('common.all')}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{t('discover.grade')}</h3>
                        <div className="flex flex-wrap gap-2">
                            {['', ...GRADES].map(g => (
                                <button key={g || 'all'} onClick={() => setGrade(g)}
                                    className={cx('px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors', grade === g
                                        ? 'bg-primary-600 border-primary-600 text-white'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-400')}>
                                    {g ? gradeName(t, g) : t('common.all')}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{t('discover.hasType')}</h3>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => setType('')} className={cx('px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors', !type ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300')}>{t('discover.any')}</button>
                            {TYPE_IDS.map(id => (
                                <button key={id} onClick={() => setType(id)} className={cx('rounded-full border-2 transition-colors', type === id ? 'border-primary-500' : 'border-transparent')}>
                                    <TypeBadge type={id} short={false} className="py-1 px-2.5 text-xs" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {featured.length > 0 && (
                <section>
                    <h2 className="font-display text-xl font-bold mb-3 text-gray-900 dark:text-white">{t('discover.featured')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {featured.map(set => <SetCard key={set.id} set={set} to={`/set/${set.id}`} badge="featured" actions={<HostButton setId={set.id} />} />)}
                    </div>
                </section>
            )}

            <section>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">{t('discover.community')}</h2>
                    <div className="flex items-center gap-2">
                        <select value={sort} onChange={e => setSort(e.target.value)} aria-label={t('discover.sort')} className="bg-white dark:bg-[#070c21] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-semibold outline-none">
                            <option value="new">{t('discover.newest')}</option>
                            <option value="popular">{t('discover.popular')}</option>
                        </select>
                        <button onClick={refreshPublicSets} className={btn.icon} aria-label={t('common.refresh')} disabled={pub.loading}>
                            <RotateCcw size={16} className={pub.loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {pub.error && <p className="text-sm text-red-500 mb-3">{t(`discover.errors.${pub.error}`)}</p>}
                {pub.loading && !pub.loaded ? (
                    <div className="flex justify-center py-12"><Spinner /></div>
                ) : community.length ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {community.map(set => <SetCard key={set.id} set={set} to={`/set/${set.id}`} badge="public" actions={<HostButton setId={set.id} />} />)}
                    </div>
                ) : (
                    <EmptyState icon={Compass} tone="violet" title={query || activeFilters ? t('discover.noMatch') : t('discover.noneYet')}>
                        {query || activeFilters ? t('discover.noMatchText') : t('discover.noneYetText')}
                    </EmptyState>
                )}
            </section>
        </div>
    );
};

export default Discover;
