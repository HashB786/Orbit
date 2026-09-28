import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Pencil, Copy, Trash2, Eye, EyeOff, Target, Link as LinkIcon, Globe, Lock, Sparkles } from 'lucide-react';
import QuestionPreview from '../components/sets/QuestionPreview';
import { subjectEmoji } from '../components/sets/SetCard';
import { useSet } from '../components/sets/useSet';
import { PageSpinner, EmptyState, ConfirmDialog, TypeBadge, btn, cx } from '../components/ui';
import { toast } from '../components/ui/toast';
import { duplicateSet, deleteSet } from '../platform/sets/store';
import { unpublishSet } from '../platform/sets/publicSets';
import { FEATURED_IDS } from '../platform/sets/featured';
import { TYPE_IDS, isValidQuestion } from '../platform/questions/types';
import { useUser } from '../context/UserContext';

const SetView = () => {
    const { setId } = useParams();
    const navigate = useNavigate();
    const { userData } = useUser();
    const { set, loading, error, isMine } = useSet(setId);
    const [showAnswers, setShowAnswers] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    if (loading) return <PageSpinner />;
    if (!set) {
        return (
            <EmptyState icon={Target} title={error === 'network' ? "Couldn't load this set" : 'Set not found'} action={<Link to="/discover" className={btn.primary}>Browse sets</Link>}>
                {error === 'network' ? 'Check your internet connection and try again.' : 'It may have been deleted or unpublished.'}
            </EmptyState>
        );
    }

    const types = TYPE_IDS.filter(t => set.questions.some(q => q.type === t));
    const playable = set.questions.filter(isValidQuestion).length;
    const featured = FEATURED_IDS.has(set.id);

    const copyAndEdit = () => {
        const copy = duplicateSet(set, userData.name);
        toast('Copied to your sets');
        navigate(`/create/${copy.id}`);
    };

    const share = async () => {
        const url = `${window.location.origin}/set/${set.remoteId ? `p_${set.remoteId}` : set.id}`;
        try {
            await navigator.clipboard.writeText(url);
            toast('Link copied');
        } catch {
            toast(url, 'info');
        }
    };

    const remove = async () => {
        setConfirmDelete(false);
        try {
            if (set.remoteId) await unpublishSet(set.remoteId);
            deleteSet(set.id);
            toast('Set deleted');
            navigate('/create');
        } catch {
            toast('Could not remove the public copy. Try again.', 'error');
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 md:pb-16">
            {/* Opened from a shared link there is no history to go back to */}
            <button onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/discover'))} className={cx(btn.ghost, '-ml-3')}><ArrowLeft size={18} /> Back</button>

            <header className="orbit-card p-5 sm:p-6 flex flex-col sm:flex-row gap-5 sm:items-center">
                <span className="relative w-20 h-20 shrink-0 flex items-center justify-center text-4xl" aria-hidden>
                    <span className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-200 to-violet-300 dark:from-primary-500/30 dark:to-violet-600/35 shadow-[0_0_30px_-8px_rgb(var(--color-primary-400))]" />
                    <span className="absolute -inset-x-3 top-1/2 h-5 -translate-y-1/2 rounded-[50%] border-2 border-primary-300/60 dark:border-primary-300/30 -rotate-[24deg]" />
                    <span className="relative">{subjectEmoji(set.subject)}</span>
                </span>
                <div className="min-w-0">
                    <h1 className="orbit-title text-2xl md:text-4xl break-words pb-0.5">{set.title}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        {featured && <span className="inline-flex items-center gap-1 text-amber-600 font-semibold"><Sparkles size={14} /> Featured</span>}
                        {isMine && (set.visibility === 'public'
                            ? <span className="inline-flex items-center gap-1 text-sky-600 font-semibold"><Globe size={14} /> Public</span>
                            : <span className="inline-flex items-center gap-1"><Lock size={13} /> Private</span>)}
                        <span>{set.questions.length} questions</span>
                        {set.subject && <span>· {set.subject}</span>}
                        {set.author && <span>· by {set.author}</span>}
                    </p>
                    {set.description && <p className="text-gray-600 dark:text-gray-300 mt-2">{set.description}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-3">{types.map(t => <TypeBadge key={t} type={t} short={false} />)}</div>
                </div>
            </header>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                <Link to={`/host/${set.id}`} className={cx(btn.primary, 'col-span-2 sm:col-span-1', playable === 0 && 'pointer-events-none opacity-50')} aria-disabled={playable === 0}>
                    <Play size={18} className="fill-current" /> Host a game
                </Link>
                <Link to={`/practice/${set.id}`} className={cx(btn.secondary, playable === 0 && 'pointer-events-none opacity-50')}>
                    <Target size={18} /> Practice
                </Link>
                {isMine
                    ? <Link to={`/create/${set.id}`} className={btn.secondary}><Pencil size={18} /> Edit</Link>
                    : <button onClick={copyAndEdit} className={btn.secondary}><Copy size={18} /> Copy &amp; edit</button>}
                {(isMine ? set.remoteId : !featured) && <button onClick={share} className={btn.secondary}><LinkIcon size={18} /> Share</button>}
                {isMine && <button onClick={() => setConfirmDelete(true)} className={cx(btn.secondary, 'hover:!text-red-600')}><Trash2 size={18} /> Delete</button>}
            </div>

            <section>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-display text-xl font-bold">Questions</h2>
                    <button onClick={() => setShowAnswers(v => !v)} className={btn.ghost}>
                        {showAnswers ? <EyeOff size={16} /> : <Eye size={16} />} {showAnswers ? 'Hide answers' : 'Show answers'}
                    </button>
                </div>
                <ol className="space-y-2">
                    {set.questions.map((q, i) => <QuestionPreview key={q.id} q={q} index={i} showAnswers={showAnswers} />)}
                </ol>
            </section>

            <ConfirmDialog
                open={confirmDelete}
                title="Delete this set?"
                message={set.remoteId ? 'It will also be removed from the public library.' : 'This cannot be undone.'}
                confirmLabel="Delete"
                danger
                onConfirm={remove}
                onCancel={() => setConfirmDelete(false)}
            />
        </div>
    );
};

export default SetView;
