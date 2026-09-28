import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PenSquare, Plus, Pencil, Copy, Trash2, Search, Sparkles } from 'lucide-react';
import SetCard, { HostButton } from '../components/sets/SetCard';
import { EmptyState, ConfirmDialog, PageHeader, btn, inputClass } from '../components/ui';
import { toast } from '../components/ui/toast';
import { useMySets, deleteSet, duplicateSet } from '../platform/sets/store';
import { unpublishSet } from '../platform/sets/publicSets';
import { matchesSearch } from '../platform/sets/search';
import { useUser } from '../context/UserContext';
import { useT } from '../context/LanguageContext';

const Create = () => {
    const t = useT();
    const mySets = useMySets();
    const navigate = useNavigate();
    const { userData } = useUser();
    const [query, setQuery] = useState('');
    const [pendingDelete, setPendingDelete] = useState(null);

    const list = mySets.filter(s => matchesSearch(s, query));

    const confirmDelete = async () => {
        const set = pendingDelete;
        setPendingDelete(null);
        try {
            if (set.remoteId) await unpublishSet(set.remoteId);
            deleteSet(set.id);
            toast(t('create.deleted', { title: set.title }));
        } catch {
            toast(t('create.unpublishFailed'), 'error');
        }
    };

    const iconBtn = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors';

    return (
        <div className="space-y-6 md:pb-16">
            <PageHeader
                icon={PenSquare}
                tone="sky"
                title={t('nav.create')}
                subtitle={t('create.subtitle')}
                actions={(
                    <>
                        <Link to="/create/new?import=1" className={btn.secondary}><Sparkles size={18} className="text-violet-400" /> {t('create.import')}</Link>
                        <Link to="/create/new" className={btn.primary}><Plus size={18} /> {t('create.newSet')}</Link>
                    </>
                )}
            />

            {mySets.length > 3 && (
                <div className="relative">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('create.searchPlaceholder')} className={`${inputClass} pl-10`} aria-label={t('create.searchLabel')} />
                </div>
            )}

            {mySets.length === 0 ? (
                <EmptyState
                    icon={PenSquare}
                    tone="sky"
                    title={t('create.emptyTitle')}
                    action={(
                        <div className="flex flex-wrap justify-center gap-2">
                            <Link to="/create/new" className={btn.primary}><Plus size={18} /> {t('create.first')}</Link>
                            <Link to="/create/new?import=1" className={btn.secondary}><Sparkles size={18} className="text-violet-400" /> {t('create.import')}</Link>
                        </div>
                    )}
                >
                    {t('create.emptyText')}
                </EmptyState>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {list.map(set => (
                        <SetCard
                            key={set.id}
                            set={set}
                            to={`/set/${set.id}`}
                            badge={set.visibility === 'public' ? 'public' : 'private'}
                            actions={(
                                <>
                                    <HostButton setId={set.id} />
                                    <button className={iconBtn} onClick={() => navigate(`/create/${set.id}`)}><Pencil size={14} /> {t('common.edit')}</button>
                                    <button className={iconBtn} onClick={() => { duplicateSet(set, userData.name, t('common.copyOf')); toast(t('create.copied')); }}><Copy size={14} /> {t('common.copy')}</button>
                                    <button className={`${iconBtn} hover:!bg-red-50 hover:text-red-600 dark:hover:!bg-red-900/20`} onClick={() => setPendingDelete(set)} aria-label={t('create.deleteLabel', { title: set.title })}><Trash2 size={14} /></button>
                                </>
                            )}
                        />
                    ))}
                    {!list.length && <p className="text-sm text-gray-500 col-span-full">{t('create.noMatch', { query })}</p>}
                </div>
            )}

            <ConfirmDialog
                open={!!pendingDelete}
                title={t('create.deleteTitle')}
                message={t(pendingDelete?.remoteId ? 'create.deletePublic' : 'create.deletePrivate', { title: pendingDelete?.title })}
                confirmLabel={t('common.delete')}
                danger
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
};

export default Create;
