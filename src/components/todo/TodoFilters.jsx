import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';
import { Filter, SortAsc, SortDesc, CheckCircle2, SlidersHorizontal, ArrowDownWideNarrow, ArrowUpNarrowWide, Clock, AlertCircle } from 'lucide-react';

const TodoFilters = ({
    activeFilters,
    setActiveFilters,
    sortMode,
    setSortMode,
    categories
}) => {
    const { t } = useLanguage();
    const [isExpanded, setIsExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const toggleFilter = (type, value) => {
        const current = activeFilters[type];
        const updated = current.includes(value)
            ? current.filter(item => item !== value)
            : [...current, value];

        setActiveFilters({ ...activeFilters, [type]: updated });
    };

    // Tri-state deadline toggle: off -> has_deadline -> no_deadline -> off
    const toggleDeadlineState = () => {
        const current = activeFilters.deadlineState || 'off';
        const next = current === 'off' ? 'has_deadline' : current === 'has_deadline' ? 'no_deadline' : 'off';
        setActiveFilters({ ...activeFilters, deadlineState: next });
    };

    const priorities = [
        { id: 'high', label: 'Urgent', color: 'text-red-600 bg-red-100 border-red-200' }, // Adjusted colors for better visibility
        { id: 'medium', label: 'Medium', color: 'text-amber-600 bg-amber-100 border-amber-200' },
        { id: 'low', label: 'Low', color: 'text-blue-600 bg-blue-100 border-blue-200' }
    ];

    // Filter categories based on search
    const filteredCategories = Object.values(categories).filter(cat =>
        cat.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeCount =
        activeFilters.priorities.length +
        activeFilters.categories.length +
        (activeFilters.deadlineState !== 'off' ? 1 : 0);

    return (
        <div className="space-y-2">
            {/* Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-dark-surface p-3 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">

                {/* Sorting */}
                <div className="flex items-center gap-2 p-1 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <button
                        onClick={() => setSortMode('custom')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${sortMode === 'custom' ? 'bg-white dark:bg-dark-card shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <ArrowUpNarrowWide size={16} /> {t('custom')}
                    </button>
                    <button
                        onClick={() => setSortMode('auto')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${sortMode === 'auto' ? 'bg-white dark:bg-dark-card shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <ArrowDownWideNarrow size={16} /> {t('sorted')}
                    </button>
                </div>

                {/* Filter Toggle */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border ${isExpanded || activeCount > 0 ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                    <SlidersHorizontal size={16} />
                    {t('filters')} {activeCount > 0 && <span className="bg-primary-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{activeCount}</span>}
                </button>
            </div>

            {/* Expanded Panel */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-white dark:bg-dark-surface p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-lg space-y-6">

                            {/* Priority */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('priority')}</h4>
                                <div className="flex flex-wrap gap-2">
                                    {priorities.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => toggleFilter('priorities', p.id)}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${activeFilters.priorities.includes(p.id) ? p.color + ' ring-2 ring-offset-1 ring-primary-200' : 'bg-gray-50 border-gray-200 text-gray-500 opacity-60 hover:opacity-100'}`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Deadline Tri-State */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('deadline')}</h4>
                                <button
                                    onClick={toggleDeadlineState}
                                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all flex items-center gap-2 ${activeFilters.deadlineState === 'has_deadline' ? 'bg-orange-50 border-orange-200 text-orange-700 ring-2 ring-orange-100' :
                                        activeFilters.deadlineState === 'no_deadline' ? 'bg-gray-100 border-gray-300 text-gray-600' :
                                            'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                        }`}
                                >
                                    {activeFilters.deadlineState === 'has_deadline' && <Clock size={16} />}
                                    {activeFilters.deadlineState === 'no_deadline' && <AlertCircle size={16} className="opacity-50" />}

                                    {activeFilters.deadlineState === 'has_deadline' ? 'Has Deadline' :
                                        activeFilters.deadlineState === 'no_deadline' ? 'No Deadline' : 'Any Time'}
                                </button>
                            </div>

                            {/* Categories with Search */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('categories')}</h4>
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 outline-none focus:border-primary-500 w-24"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                                    {filteredCategories.length > 0 ? filteredCategories.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => toggleFilter('categories', cat.id)}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1 ${activeFilters.categories.includes(cat.id) ? 'bg-teal-50 border-teal-200 text-teal-600 ring-2 ring-offset-1 ring-teal-100' : 'bg-gray-50 border-gray-200 text-gray-500 opacity-60 hover:opacity-100'}`}
                                        >
                                            <span className="text-[10px]">{cat.icon}</span> {cat.label}
                                        </button>
                                    )) : (
                                        <p className="text-xs text-gray-400 italic">No categories found</p>
                                    )}
                                </div>
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
export default TodoFilters;
