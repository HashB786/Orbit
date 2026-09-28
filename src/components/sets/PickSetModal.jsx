import React, { useEffect, useMemo, useState } from 'react';
import { Search, PenSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Modal, Segmented, inputClass, Spinner } from '../ui';
import SetCard from './SetCard';
import { useMySets } from '../../platform/sets/store';
import { FEATURED_SETS } from '../../platform/sets/featured';
import { usePublicSets, refreshPublicSets } from '../../platform/sets/publicSets';
import { matchesSearch } from '../../platform/sets/search';

// "Which set do you want to play?" dialog used by the Games page
const PickSetModal = ({ open, onClose, onPick, title = 'Choose a question set' }) => {
    const mySets = useMySets();
    const pub = usePublicSets();
    const [tab, setTab] = useState(mySets.length ? 'mine' : 'featured');
    const [query, setQuery] = useState('');

    useEffect(() => {
        if (open && tab === 'public' && !pub.attempted) refreshPublicSets();
    }, [open, tab, pub.attempted]);

    const list = useMemo(() => {
        const source = tab === 'mine' ? mySets : tab === 'featured' ? FEATURED_SETS : pub.sets;
        return source.filter(s => s.questions.length > 0 && matchesSearch(s, query));
    }, [tab, mySets, pub.sets, query]);

    return (
        <Modal open={open} onClose={onClose} title={title} size="lg">
            <Segmented
                value={tab}
                onChange={setTab}
                options={[{ value: 'mine', label: 'My sets' }, { value: 'featured', label: 'Featured' }, { value: 'public', label: 'Public' }]}
            />
            <div className="relative mt-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search sets…" className={`${inputClass} pl-9`} />
            </div>
            <div className="mt-3 space-y-2 min-h-[12rem]">
                {tab === 'public' && pub.loading && <div className="flex justify-center py-8"><Spinner /></div>}
                {list.map(set => (
                    <SetCard key={set.id} set={set} onClick={() => onPick(set)} badge={tab === 'featured' ? 'featured' : tab === 'public' ? 'public' : undefined} />
                ))}
                {!list.length && !(tab === 'public' && pub.loading) && (
                    <div className="text-center text-sm text-gray-500 py-10">
                        {tab === 'mine'
                            ? <>You haven't made any sets yet. <Link to="/create/new" className="text-primary-600 font-semibold inline-flex items-center gap-1"><PenSquare size={14} /> Create one</Link></>
                            : 'No sets found.'}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default PickSetModal;
