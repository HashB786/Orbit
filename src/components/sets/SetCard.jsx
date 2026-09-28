import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, Lock, Play, Sparkles } from 'lucide-react';
import { TypeBadge, cardClass, cx } from '../ui';
import { TYPE_IDS } from '../../platform/questions/types';

const SUBJECT_EMOJI = {
    Math: '➗', Science: '🔬', Geography: '🌍', History: '🏛️', English: '📖', Languages: '🗣️',
    Physics: '⚛️', Chemistry: '🧪', Biology: '🧬', 'Computer Science': '💻', Art: '🎨', Music: '🎵', Other: '📘'
};

export const subjectEmoji = (subject) => SUBJECT_EMOJI[subject] || '📘';

// Compact card used in Discover, Create and the set picker
const SetCard = ({ set, to, onClick, badge, actions, selected = false }) => {
    const types = TYPE_IDS.filter(t => set.questions.some(q => q.type === t));
    const Wrapper = to ? Link : 'button';
    const wrapperProps = to ? { to } : { type: 'button', onClick };

    return (
        <div className={cx(cardClass, 'orbit-card-hover relative group flex flex-col min-w-0', selected && 'ring-2 ring-primary-500')}>
            <Wrapper {...wrapperProps} className="flex-1 text-left p-4 flex gap-3 min-w-0 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500">
                <span className="relative w-12 h-12 shrink-0 flex items-center justify-center text-2xl" aria-hidden>
                    <span className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-100 to-violet-200 dark:from-primary-500/25 dark:to-violet-600/30" />
                    <span className="absolute -inset-x-2 top-1/2 h-3 -translate-y-1/2 rounded-[50%] border border-primary-300/60 dark:border-primary-300/30 -rotate-[24deg]" />
                    <span className="relative">{subjectEmoji(set.subject)}</span>
                </span>
                <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                        <span className="font-display font-bold text-gray-900 dark:text-white truncate">{set.title}</span>
                        {badge === 'featured' && <Sparkles size={14} className="text-amber-500 shrink-0" aria-label="Featured" />}
                        {badge === 'public' && <Globe size={14} className="text-sky-500 shrink-0" aria-label="Public" />}
                        {badge === 'private' && <Lock size={13} className="text-gray-400 shrink-0" aria-label="Private" />}
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {set.questions.length} question{set.questions.length === 1 ? '' : 's'}
                        {set.subject ? ` · ${set.subject}` : ''}
                        {set.author ? ` · ${set.author}` : ''}
                        {set.plays > 0 ? ` · ${set.plays} play${set.plays === 1 ? '' : 's'}` : ''}
                    </span>
                    {types.length > 0 && (
                        <span className="flex flex-wrap gap-1 mt-2">
                            {types.map(t => <TypeBadge key={t} type={t} />)}
                        </span>
                    )}
                </span>
            </Wrapper>
            {actions && <div className="px-4 pb-4 -mt-1 flex flex-wrap gap-2">{actions}</div>}
        </div>
    );
};

export const HostButton = ({ setId, className = '' }) => (
    <Link to={`/host/${setId}`} className={cx('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-b from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white text-sm font-bold shadow-[0_6px_16px_-8px_rgb(var(--color-primary-500))] transition-colors', className)}>
        <Play size={14} className="fill-current" /> Host
    </Link>
);

export default SetCard;
