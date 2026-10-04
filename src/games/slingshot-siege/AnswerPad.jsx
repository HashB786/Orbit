import React, { useEffect, useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { useT } from '../../context/LanguageContext';

const LETTERS = 'ABCDEF';
const COLORS = ['#38bdf8', '#f472b6', '#fbbf24', '#34d399', '#a78bfa', '#fb923c'];

// Answer buttons for any choice round (single / multi / order). Touch, mouse and keyboard:
// number keys pick an option, Enter checks a multi-select, Backspace undoes.
const AnswerPad = ({ round, onAnswer, disabled = false }) => {
    const t = useT();
    const [picked, setPicked] = useState([]);
    const n = round.options.length;

    useEffect(() => {
        setPicked([]);
    }, [round]);

    const finishOrder = (seq) => {
        const ok = seq.every((idx, pos) => round.options[idx].order === pos);
        onAnswer(ok, seq.map(k => round.options[k].text).join(' → '));
    };

    const checkMulti = (sel = picked) => {
        if (!sel.length) return;
        const correct = round.options.filter(o => o.correct).length;
        const ok = sel.length === correct && sel.every(i => round.options[i].correct);
        onAnswer(ok, sel.map(i => round.options[i].text).join(', '));
    };

    const choose = (i) => {
        if (disabled || i < 0 || i >= n) return;
        if (round.kind === 'single') {
            onAnswer(!!round.options[i].correct, round.options[i].text);
        } else if (round.kind === 'multi') {
            setPicked(p => (p.includes(i) ? p.filter(x => x !== i) : [...p, i]));
        } else if (!picked.includes(i)) {
            const next = [...picked, i];
            setPicked(next);
            if (next.length === n) finishOrder(next);
        }
    };

    const undo = () => setPicked(p => (round.kind === 'order' ? p.slice(0, -1) : []));

    useEffect(() => {
        const onKey = (e) => {
            if (disabled || e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return;
            const digit = Number(e.key);
            if (Number.isInteger(digit) && digit >= 1 && digit <= n) {
                e.preventDefault();
                choose(digit - 1);
            } else if (e.key === 'Enter' && round.kind === 'multi') {
                e.preventDefault();
                checkMulti();
            } else if (e.key === 'Backspace' && round.kind !== 'single') {
                e.preventDefault();
                undo();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    return (
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-3">
            {round.kind !== 'single' && (
                <p className="text-center text-sm font-bold text-emerald-300">{round.kind === 'multi' ? t('siege.pickAll') : t('siege.tapOrder')}</p>
            )}
            <div className="grid grid-cols-1 min-[440px]:grid-cols-2 gap-2.5">
                {round.options.map((o, i) => {
                    const at = picked.indexOf(i);
                    const on = at !== -1;
                    return (
                        <button
                            key={`${i}:${o.text}`}
                            type="button"
                            disabled={disabled || (round.kind === 'order' && on)}
                            onClick={() => choose(i)}
                            aria-pressed={round.kind === 'single' ? undefined : on}
                            className={`min-h-[3.75rem] sm:min-h-[4.5rem] flex items-center gap-3 px-3 py-2.5 rounded-2xl border-2 text-left transition-colors disabled:cursor-default ${on
                                ? 'bg-white/15 border-white/60'
                                : 'bg-[#0b1128] border-white/10 [@media(hover:hover)]:hover:border-white/40 active:bg-white/10'}`}
                        >
                            <span className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center font-black text-gray-950" style={{ background: COLORS[i % COLORS.length] }}>
                                {round.kind === 'order' && on ? at + 1 : round.kind === 'multi' && on ? <Check size={18} strokeWidth={3} /> : LETTERS[i]}
                            </span>
                            <span className="text-base sm:text-lg font-bold break-words min-w-0">{o.text}</span>
                        </button>
                    );
                })}
            </div>
            {round.kind !== 'single' && (
                <div className="flex gap-2">
                    <button type="button" onClick={undo} disabled={disabled || !picked.length} className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 disabled:opacity-40 font-bold flex items-center gap-2">
                        <RotateCcw size={16} /> {t('siege.reset')}
                    </button>
                    {round.kind === 'multi' && (
                        <button type="button" onClick={() => checkMulti()} disabled={disabled || !picked.length} className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-gray-950 font-black flex items-center justify-center gap-2">
                            <Check size={18} /> {t('siege.check')}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default AnswerPad;
