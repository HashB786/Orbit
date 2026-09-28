import React from 'react';
import { Check } from 'lucide-react';
import { TypeBadge, cx } from '../ui';
import { answerLabel, isValidQuestion } from '../../platform/questions/types';
import { useT } from '../../context/LanguageContext';

// Read-only view of a question (set preview page)
const QuestionPreview = ({ q, index, showAnswers }) => {
    const t = useT();
    const valid = isValidQuestion(q);
    return (
        <li className="orbit-card p-4">
            <div className="flex items-start gap-3">
                <span className="w-7 h-7 shrink-0 rounded-lg bg-gray-100 dark:bg-white/[0.07] text-xs font-black flex items-center justify-center">{index + 1}</span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <TypeBadge type={q.type} />
                        {!valid && <span className="text-[11px] font-bold text-amber-600">{t('sets.incomplete')}</span>}
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white break-words">{q.prompt || <span className="text-gray-400 italic">{t('sets.noText')}</span>}</p>

                    {(q.type === 'mc' || q.type === 'multi') && (
                        <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {q.options.map(o => (
                                <li key={o.id} className={cx(
                                    'text-sm px-3 py-1.5 rounded-lg border flex items-center gap-2 min-w-0',
                                    showAnswers && o.correct
                                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200'
                                        : 'border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300'
                                )}>
                                    {showAnswers && o.correct && <Check size={14} className="shrink-0" />}
                                    <span className="truncate">{o.text}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                    {q.type === 'order' && !showAnswers && (
                        <p className="mt-2 text-sm text-gray-500">{t('sets.itemsToOrder', { count: q.items.length })}</p>
                    )}
                    {showAnswers && q.type !== 'mc' && q.type !== 'multi' && (
                        <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300 flex items-start gap-1.5 break-words">
                            <Check size={16} className="shrink-0 mt-0.5" /> {answerLabel(q)}
                        </p>
                    )}
                </div>
            </div>
        </li>
    );
};

export default QuestionPreview;
