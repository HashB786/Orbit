import React, { useEffect, useMemo, useState } from 'react';
import { Compass, Search, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import SetCard, { HostButton } from '../components/sets/SetCard';
import { EmptyState, Spinner, TypeBadge, btn, inputClass, cx } from '../components/ui';
import { FEATURED_SETS } from '../platform/sets/featured';
import { usePublicSets, refreshPublicSets } from '../platform/sets/publicSets';
import { matchesSearch, SUBJECTS } from '../platform/sets/search';
import { TYPE_IDS } from '../platform/questions/types';

const Discover = () => {
    const pub = usePublicSets();
    const [query, setQuery] = useState('');
    const [subject, setSubject] = useState('');
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
        (!type || s.questions.some(q => q.type === type))
    );

    const featured = useMemo(() => filter(FEATURED_SETS), [query, subject, type]); // eslint-disable-line react-hooks/exhaustive-deps
    const community = useMemo(() => {
        const list = filter(pub.sets);
        return sort === 'popular'
            ? [...list].sort((a, b) => (b.plays || 0) - (a.plays || 0))
            : [...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }, [pub.sets, query, subject, type, sort]); // eslint-disable-line react-hooks/exhaustive-deps

    const activeFilters = (subject ? 1 : 0) + (type ? 1 : 0);

    return (
        <div className="space-y-6 md:pb-16">
            <header>
                <h1 className="text-3xl md:text-4xl font-extrabold flex items-center gap-3">
                    <Compass className="text-primary-500 shrink-0" size={32} /> Discover
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Find a set, preview it, and host it in seconds.</p>
            </header>

            <div className="flex gap-2">
                <div className="relative flex-1 min-w-0">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search by topic, title or author…"
                        className={`${inputClass} pl-10 py-3`}
                        aria-label="Search sets"
                    />
                    {query && (
                        <button onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-700">
                            <X size={16} />
                        </button>
                    )}
                </div>
                <button onClick={() => setShowFilters(v => !v)} className={cx(btn.secondary, 'shrink-0', showFilters && 'ring-2 ring-primary-500')} aria-expanded={showFilters}>
                    <SlidersHorizontal size={18} />
                    <span className="hidden sm:inline">Filters</span>
                    {activeFilters > 0 && <span className="px-1.5 rounded-full bg-primary-500 text-white text-xs">{activeFilters}</span>}
                </button>
            </div>

            {showFilters && (
                <div className="bg-white dark:bg-dark-surface border border-gray-100 dark:border-gray-800 rounded-2xl p-4 space-y-4">
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Subject</h3>
                        <div className="flex flex-wrap gap-2">
                            {['', ...SUBJECTS].map(s => (
                                <button key={s || 'all'} onClick={() => setSubject(s)}
                                    className={cx('px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors', subject === s
                                        ? 'bg-primary-600 border-primary-600 text-white'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-400')}>
                                    {s || 'All'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Has question type</h3>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => setType('')} className={cx('px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors', !type ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300')}>Any</button>
                            {TYPE_IDS.map(t => (
                                <button key={t} onClick={() => setType(t)} className={cx('rounded-full border-2 transition-colors', type === t ? 'border-primary-500' : 'border-transparent')}>
                                    <TypeBadge type={t} short={false} className="py-1 px-2.5 text-xs" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {featured.length > 0 && (
                <section>
                    <h2 className="text-lg font-bold mb-3">Featured by Orbit</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {featured.map(set => <SetCard key={set.id} set={set} to={`/set/${set.id}`} badge="featured" actions={<HostButton setId={set.id} />} />)}
                    </div>
                </section>
            )}

            <section>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h2 className="text-lg font-bold">Community sets</h2>
                    <div className="flex items-center gap-2">
                        <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort" className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm font-semibold outline-none">
                            <option value="new">Newest</option>
                            <option value="popular">Most played</option>
                        </select>
                        <button onClick={refreshPublicSets} className={btn.icon} aria-label="Refresh" disabled={pub.loading}>
                            <RotateCcw size={16} className={pub.loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {pub.error && <p className="text-sm text-red-500 mb-3">{pub.error}</p>}
                {pub.loading && !pub.loaded ? (
                    <div className="flex justify-center py-12"><Spinner /></div>
                ) : community.length ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {community.map(set => <SetCard key={set.id} set={set} to={`/set/${set.id}`} badge="public" actions={<HostButton setId={set.id} />} />)}
                    </div>
                ) : (
                    <EmptyState icon={Compass} title={query || activeFilters ? 'No sets match your search' : 'No community sets yet'}>
                        {query || activeFilters ? 'Try other words or clear the filters.' : 'Publish one of your sets from the Create tab and it will show up here.'}
                    </EmptyState>
                )}
            </section>
        </div>
    );
};

export default Discover;
