import React from 'react';
import { Check, RefreshCw, Ban } from 'lucide-react';
import { QUESTION_TYPES, TYPE_IDS } from '../../platform/questions/types';
import { TYPE_ICONS, cx } from '../ui';

const SUPPORT = {
    native: { label: 'Supported', icon: Check, className: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/20' },
    adapted: { label: 'Converted', icon: RefreshCw, className: 'text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-900/20' },
    unsupported: { label: 'Not supported', icon: Ban, className: 'text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-white/[0.06]' }
};

// "Which of your questions can this game play?" with a checkbox per question type
const CompatPanel = ({ game, analysis, enabled, onToggle }) => (
    <ul className="space-y-2">
        {TYPE_IDS.filter(t => analysis.byType[t]).map(type => {
            const info = analysis.byType[type];
            const support = SUPPORT[info.support];
            const Icon = TYPE_ICONS[type];
            const disabled = info.support === 'unsupported' || info.playable === 0;
            const checked = !disabled && enabled.includes(type);
            const note = game.typeNotes?.[type];
            return (
                <li key={type}>
                    <label className={cx(
                        'flex items-start gap-3 p-3 rounded-xl border transition-colors',
                        disabled ? 'border-gray-100 dark:border-gray-800 opacity-70 cursor-not-allowed' : 'border-gray-200 dark:border-gray-700 cursor-pointer hover:border-primary-400',
                        checked && 'border-primary-400 bg-primary-50/50 dark:bg-primary-900/10'
                    )}>
                        <input
                            type="checkbox"
                            className="mt-1 w-4 h-4 accent-[rgb(var(--color-primary-600))] shrink-0"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => onToggle(type)}
                        />
                        <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-sm flex items-center gap-1.5"><Icon size={15} /> {QUESTION_TYPES[type].label}</span>
                                <span className="text-xs text-gray-500">{info.playable}/{info.total} question{info.total === 1 ? '' : 's'}</span>
                                <span className={cx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold', support.className)}>
                                    <support.icon size={11} /> {support.label}
                                </span>
                            </span>
                            {(note || info.invalid > 0) && (
                                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {note}
                                    {info.invalid > 0 && ` ${info.invalid} incomplete question${info.invalid === 1 ? ' is' : 's are'} skipped.`}
                                </span>
                            )}
                        </span>
                    </label>
                </li>
            );
        })}
    </ul>
);

export default CompatPanel;
