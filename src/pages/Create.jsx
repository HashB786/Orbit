import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PenSquare, Plus, Pencil, Copy, Trash2, Search } from 'lucide-react';
import SetCard, { HostButton } from '../components/sets/SetCard';
import { EmptyState, ConfirmDialog, btn, inputClass } from '../components/ui';
import { toast } from '../components/ui/toast';
import { useMySets, deleteSet, duplicateSet } from '../platform/sets/store';
import { unpublishSet } from '../platform/sets/publicSets';
import { matchesSearch } from '../platform/sets/search';
import { useUser } from '../context/UserContext';

const Create = () => {
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
            toast(`Deleted "${set.title}"`);
        } catch {
            toast('Could not remove the public copy. Check your connection and try again.', 'error');
        }
    };

    const iconBtn = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors';

    return (
        <div className="space-y-6 md:pb-16">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold flex items-center gap-3">
                        <PenSquare className="text-primary-500 shrink-0" size={32} /> Create
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Your question sets. Private until you publish them.</p>
                </div>
                <Link to="/create/new" className={btn.primary}><Plus size={18} /> New set</Link>
            </header>

            {mySets.length > 3 && (
                <div className="relative">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search your sets…" className={`${inputClass} pl-10`} aria-label="Search your sets" />
                </div>
            )}

            {mySets.length === 0 ? (
                <EmptyState icon={PenSquare} title="No sets yet" action={<Link to="/create/new" className={btn.primary}><Plus size={18} /> Create your first set</Link>}>
                    Mix multiple choice, true/false, written answers, multi-select and put-in-order questions. Every game shows which ones it can play.
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
                                    <button className={iconBtn} onClick={() => navigate(`/create/${set.id}`)}><Pencil size={14} /> Edit</button>
                                    <button className={iconBtn} onClick={() => { duplicateSet(set, userData.name); toast('Copy created'); }}><Copy size={14} /> Copy</button>
                                    <button className={`${iconBtn} hover:!bg-red-50 hover:text-red-600 dark:hover:!bg-red-900/20`} onClick={() => setPendingDelete(set)} aria-label={`Delete ${set.title}`}><Trash2 size={14} /></button>
                                </>
                            )}
                        />
                    ))}
                    {!list.length && <p className="text-sm text-gray-500 col-span-full">No sets match "{query}".</p>}
                </div>
            )}

            <ConfirmDialog
                open={!!pendingDelete}
                title="Delete this set?"
                message={pendingDelete?.remoteId
                    ? `"${pendingDelete?.title}" will be deleted and removed from the public library.`
                    : `"${pendingDelete?.title}" will be deleted from this browser.`}
                confirmLabel="Delete"
                danger
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
};

export default Create;
