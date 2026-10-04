import React, { memo, useState } from 'react';
import { ArrowUp, ArrowDown, Copy, Trash2, Plus, X, Check, AlertTriangle, ChevronDown, Timer } from 'lucide-react';
import { TYPE_IDS, LIMITS, QUESTION_TIMES, validateQuestion, uid, formatSeconds } from '../../platform/questions/types';
import { TYPE_ICONS, cx, btn } from '../ui';
import { useT } from '../../context/LanguageContext';
import Rich from '../../i18n/Rich';

const optionInput = 'flex-1 min-w-0 bg-gray-50 dark:bg-[#070c21] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors text-sm';

const TypePicker = ({ value, onChange }) => {
    const t = useT();
    const [open, setOpen] = useState(false);
    const Icon = TYPE_ICONS[value];
    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap bg-gray-100 dark:bg-white/[0.07] hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
                {Icon && <Icon size={14} className="shrink-0" />}
                <span className="sm:hidden">{t(`qtypes.${value}.short`)}</span>
                <span className="hidden sm:inline">{t(`qtypes.${value}.label`)}</span>
                <ChevronDown size={14} className="shrink-0" />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <ul role="listbox" className="absolute z-20 left-0 top-full mt-1 w-56 bg-white dark:bg-[#0e1638] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl p-1">
                        {TYPE_IDS.map(type => {
                            const TIcon = TYPE_ICONS[type];
                            return (
                                <li key={type}>
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={type === value}
                                        onClick={() => { setOpen(false); if (type !== value) onChange(type); }}
                                        className={cx('w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-800', type === value && 'bg-primary-50 dark:bg-primary-900/20')}
                                    >
                                        <TIcon size={16} className="mt-0.5 shrink-0 text-gray-500" />
                                        <span>
                                            <span className="block text-sm font-semibold">{t(`qtypes.${type}.label`)}</span>
                                            <span className="block text-xs text-gray-500">{t(`qtypes.${type}.hint`)}</span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
        </div>
    );
};

const OptionsEditor = ({ q, onChange }) => {
    const t = useT();
    const single = q.type === 'mc';
    const setOption = (id, patch) => onChange({
        ...q,
        options: q.options.map(o => {
            if (o.id === id) return { ...o, ...patch };
            // Multiple choice: marking one correct unmarks the others
            if (single && patch.correct) return { ...o, correct: false };
            return o;
        })
    });
    const add = () => q.options.length < LIMITS.maxOptions && onChange({ ...q, options: [...q.options, { id: uid(), text: '', correct: false }] });
    const remove = (id) => onChange({ ...q, options: q.options.filter(o => o.id !== id) });

    return (
        <div className="space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">{single ? t('editor.tapCorrect') : t('editor.tickCorrect')}</p>
            {q.options.map((o, i) => (
                <div key={o.id} className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setOption(o.id, { correct: single ? true : !o.correct })}
                        aria-label={o.correct ? t('editor.optionIsCorrect', { n: i + 1 }) : t('editor.markOption', { n: i + 1 })}
                        aria-pressed={o.correct}
                        className={cx(
                            'w-9 h-9 shrink-0 flex items-center justify-center border-2 transition-colors',
                            single ? 'rounded-full' : 'rounded-lg',
                            o.correct ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 dark:border-gray-600 text-transparent hover:border-emerald-400'
                        )}
                    >
                        <Check size={16} strokeWidth={3} />
                    </button>
                    <input
                        value={o.text}
                        onChange={e => setOption(o.id, { text: e.target.value })}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && i === q.options.length - 1) {
                                e.preventDefault();
                                add();
                            }
                        }}
                        maxLength={LIMITS.option}
                        placeholder={t('editor.option', { n: i + 1 })}
                        className={cx(optionInput, o.correct && 'border-emerald-300 dark:border-emerald-800')}
                    />
                    <button type="button" onClick={() => remove(o.id)} disabled={q.options.length <= 2} className={btn.icon} aria-label={t('editor.removeOption', { n: i + 1 })}>
                        <X size={16} />
                    </button>
                </div>
            ))}
            {q.options.length < LIMITS.maxOptions && (
                <button type="button" onClick={add} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 dark:text-primary-400 px-1 py-1">
                    <Plus size={16} /> {t('editor.addOption')}
                </button>
            )}
        </div>
    );
};

const TrueFalseEditor = ({ q, onChange }) => {
    const t = useT();
    return (
        <div className="grid grid-cols-2 gap-2">
            {[true, false].map(value => (
                <button
                    key={String(value)}
                    type="button"
                    onClick={() => onChange({ ...q, answer: value })}
                    aria-pressed={q.answer === value}
                    className={cx(
                        'py-3 rounded-xl border-2 font-bold transition-colors',
                        q.answer === value
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-emerald-400'
                    )}
                >
                    {value ? t('common.true') : t('common.false')}
                </button>
            ))}
        </div>
    );
};

const TypedEditor = ({ q, onChange }) => {
    const t = useT();
    const set = (i, text) => onChange({ ...q, accepted: q.accepted.map((a, j) => (j === i ? text : a)) });
    const add = () => q.accepted.length < LIMITS.maxAccepted && onChange({ ...q, accepted: [...q.accepted, ''] });
    const remove = (i) => onChange({ ...q, accepted: q.accepted.filter((_, j) => j !== i) });
    return (
        <div className="space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('editor.typedHint')}</p>
            {q.accepted.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 text-xs font-bold text-gray-400 uppercase">{i === 0 ? t('editor.answer') : t('editor.alsoAccept')}</span>
                    <input value={a} onChange={e => set(i, e.target.value)} maxLength={LIMITS.option} placeholder={i === 0 ? t('editor.correctAnswer') : t('editor.anotherSpelling')} className={optionInput} />
                    {i > 0 && <button type="button" onClick={() => remove(i)} className={btn.icon} aria-label={t('editor.removeAccepted')}><X size={16} /></button>}
                </div>
            ))}
            {q.accepted.length < LIMITS.maxAccepted && (
                <button type="button" onClick={add} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 dark:text-primary-400 px-1 py-1">
                    <Plus size={16} /> {t('editor.acceptAnother')}
                </button>
            )}
        </div>
    );
};

const OrderEditor = ({ q, onChange }) => {
    const t = useT();
    const set = (i, text) => onChange({ ...q, items: q.items.map((a, j) => (j === i ? text : a)) });
    const move = (i, dir) => {
        const items = [...q.items];
        const j = i + dir;
        if (j < 0 || j >= items.length) return;
        [items[i], items[j]] = [items[j], items[i]];
        onChange({ ...q, items });
    };
    const add = () => q.items.length < LIMITS.maxItems && onChange({ ...q, items: [...q.items, ''] });
    const remove = (i) => onChange({ ...q, items: q.items.filter((_, j) => j !== i) });
    return (
        <div className="space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400"><Rich text={t('editor.orderHint')} /></p>
            {q.items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                    <span className="w-7 h-7 shrink-0 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-black flex items-center justify-center">{i + 1}</span>
                    <input value={item} onChange={e => set(i, e.target.value)} maxLength={LIMITS.option} placeholder={t('editor.item', { n: i + 1 })} className={optionInput} />
                    <div className="flex shrink-0">
                        <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className={btn.icon} aria-label={t('editor.moveUp')}><ArrowUp size={15} /></button>
                        <button type="button" onClick={() => move(i, 1)} disabled={i === q.items.length - 1} className={btn.icon} aria-label={t('editor.moveDown')}><ArrowDown size={15} /></button>
                        <button type="button" onClick={() => remove(i)} disabled={q.items.length <= 2} className={btn.icon} aria-label={t('editor.removeItem', { n: i + 1 })}><X size={15} /></button>
                    </div>
                </div>
            ))}
            {q.items.length < LIMITS.maxItems && (
                <button type="button" onClick={add} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 dark:text-primary-400 px-1 py-1">
                    <Plus size={16} /> {t('editor.addItem')}
                </button>
            )}
        </div>
    );
};

// Optional per-question time limit; games without a timer ignore it
const TimePicker = ({ q, onChange }) => {
    const t = useT();
    const value = q.time || 0;
    const choices = QUESTION_TIMES.includes(value) || !value ? QUESTION_TIMES : [...QUESTION_TIMES, value].sort((a, b) => a - b);
    const set = (time) => {
        const next = { ...q };
        if (time) next.time = time;
        else delete next.time;
        onChange(next);
    };
    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400" title={t('editor.timeHelp')}>
                <Timer size={14} className={value ? 'text-primary-500' : ''} />
                <span>{t('editor.timeLimit')}</span>
                <select
                    value={value}
                    onChange={e => set(Number(e.target.value))}
                    className={cx('bg-gray-100 dark:bg-white/[0.06] rounded-lg px-2 py-1 font-semibold outline-none focus:ring-2 focus:ring-primary-500/30', value ? 'text-primary-600 dark:text-primary-300' : '')}
                >
                    <option value={0}>{t('editor.timeDefault')}</option>
                    {choices.map(n => <option key={n} value={n}>{formatSeconds(t, n)}</option>)}
                </select>
            </label>
            <span className="hidden sm:inline text-[11px] text-gray-400">{t('editor.timeHelp')}</span>
        </div>
    );
};

// One question in the editor. Memoized: typing in one card doesn't re-render the others.
const QuestionCard = memo(({ q, index, total, showErrors, onChange, onType, onMove, onDuplicate, onRemove }) => {
    const t = useT();
    const errors = validateQuestion(q);
    const change = (next) => onChange(q.id, next);

    return (
        <article className={cx('orbit-card p-4 sm:p-5', showErrors && errors.length ? 'border-amber-300 dark:border-amber-800' : '')}>
            <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="w-8 h-8 shrink-0 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-black flex items-center justify-center">{index + 1}</span>
                    <TypePicker value={q.type} onChange={(type) => onType(q.id, type)} />
                </div>
                <div className="flex items-center shrink-0">
                    <button type="button" onClick={() => onMove(q.id, -1)} disabled={index === 0} className={btn.icon} aria-label={t('editor.moveQuestionUp')}><ArrowUp size={16} /></button>
                    <button type="button" onClick={() => onMove(q.id, 1)} disabled={index === total - 1} className={btn.icon} aria-label={t('editor.moveQuestionDown')}><ArrowDown size={16} /></button>
                    <button type="button" onClick={() => onDuplicate(q.id)} className={btn.icon} aria-label={t('editor.duplicateQuestion')}><Copy size={16} /></button>
                    <button type="button" onClick={() => onRemove(q.id)} className={`${btn.icon} hover:!text-red-600`} aria-label={t('editor.deleteQuestion')}><Trash2 size={16} /></button>
                </div>
            </div>

            <textarea
                value={q.prompt}
                onChange={e => change({ ...q, prompt: e.target.value })}
                maxLength={LIMITS.prompt}
                rows={2}
                placeholder={q.type === 'tf' ? t('editor.statementPlaceholder') : t('editor.questionPlaceholder')}
                className="w-full resize-y min-h-[3.25rem] bg-transparent text-base sm:text-lg font-semibold outline-none border-b-2 border-gray-100 dark:border-gray-800 focus:border-primary-500 pb-2 mb-4 transition-colors placeholder:text-gray-300 dark:placeholder:text-gray-600"
                aria-label={t('editor.questionN', { n: index + 1 })}
            />

            {(q.type === 'mc' || q.type === 'multi') && <OptionsEditor q={q} onChange={change} />}
            {q.type === 'tf' && <TrueFalseEditor q={q} onChange={change} />}
            {q.type === 'typed' && <TypedEditor q={q} onChange={change} />}
            {q.type === 'order' && <OrderEditor q={q} onChange={change} />}

            {showErrors && errors.length > 0 && (
                <p className="mt-3 flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {errors.map(code => t(`validation.${code}`)).join(' ')}
                </p>
            )}

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/[0.06]">
                <TimePicker q={q} onChange={change} />
            </div>
        </article>
    );
});

QuestionCard.displayName = 'QuestionCard';

export default QuestionCard;
