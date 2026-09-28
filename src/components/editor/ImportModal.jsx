import React, { useMemo, useState } from 'react';
import { Sparkles, Copy, ClipboardPaste, ChevronDown, CheckCircle2, AlertTriangle, FileJson, List, Wand2 } from 'lucide-react';
import { Modal, Segmented, Stepper, TypeBadge, TYPE_ICONS, btn, inputClass, cx } from '../ui';
import { toast } from '../ui/toast';
import { TYPE_IDS } from '../../platform/questions/types';
import { AI_LANGUAGES, EXAMPLE_JSON, buildAiPrompt, parseQuestionsJson, typeCounts } from '../../platform/questions/jsonImport';
import { parseImport } from '../../platform/questions/normalize';
import { useLanguage } from '../../context/LanguageContext';
import Slots from '../../i18n/Slots';

// Ask the AI for questions in the language the teacher is using Orbit in
const AI_LANGUAGE_FOR = { en: 'English', uz: 'Uzbek', ru: 'Russian' };

const copyText = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        // Older browsers / insecure pages
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand('copy');
        area.remove();
        return ok;
    }
};

const Step = ({ n, title, hint, children }) => (
    <section className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.03] p-4">
        <div className="flex items-baseline gap-2 mb-3">
            <span className="w-6 h-6 shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-violet-600 text-white text-xs font-black flex items-center justify-center self-center">{n}</span>
            <h3 className="font-display font-bold text-gray-900 dark:text-white">{title}</h3>
            {hint && <span className="text-xs text-gray-500 dark:text-gray-400">{hint}</span>}
        </div>
        {children}
    </section>
);

const Preview = ({ questions, max = 5 }) => {
    const { t } = useLanguage();
    return (
        <ul className="mt-2 space-y-1.5">
            {questions.slice(0, max).map(q => (
                <li key={q.id} className="flex items-center gap-2 text-sm min-w-0">
                    <TypeBadge type={q.type} />
                    <span className="truncate text-gray-700 dark:text-gray-200">{q.prompt}</span>
                </li>
            ))}
            {questions.length > max && <li className="text-xs text-gray-500">{t('importer.more', { count: questions.length - max })}</li>}
        </ul>
    );
};

// "Import questions" dialog of the set editor
const ImportModal = ({ open, onClose, onImport, currentTitle = '' }) => {
    const { t, lang } = useLanguage();
    const [tab, setTab] = useState('ai');
    const [topic, setTopic] = useState(currentTitle);
    const [count, setCount] = useState(10);
    const [level, setLevel] = useState('');
    const [language, setLanguage] = useState(AI_LANGUAGE_FOR[lang] || 'English');
    const [types, setTypes] = useState(TYPE_IDS);
    const [showPrompt, setShowPrompt] = useState(false);
    const [showExample, setShowExample] = useState(false);
    const [json, setJson] = useState('');
    const [lines, setLines] = useState('');
    const [useTitle, setUseTitle] = useState(!currentTitle.trim());

    const prompt = useMemo(() => buildAiPrompt({ topic, count, level, language, types }), [topic, count, level, language, types]);
    const parsed = useMemo(() => parseQuestionsJson(json), [json]);
    const lineQuestions = useMemo(() => parseImport(lines), [lines]);
    const [problemsOpen, setProblemsOpen] = useState(false);

    const ready = tab === 'ai' ? parsed.questions : lineQuestions;

    const toggleType = (type) => setTypes(prev => (prev.includes(type) ? (prev.length > 1 ? prev.filter(x => x !== type) : prev) : [...prev, type]));

    const copyPrompt = async () => {
        if (await copyText(prompt)) toast(t('importer.promptCopied'));
        else {
            setShowPrompt(true);
            toast(t('importer.copyByHand'), 'info');
        }
    };

    const pasteFromClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) setJson(text);
            else toast(t('importer.clipboardEmpty'), 'info');
        } catch {
            toast(t('importer.pasteByHand'), 'info');
        }
    };

    const submit = () => {
        if (!ready.length) return;
        onImport(ready, tab === 'ai' && useTitle ? parsed.meta : {});
        setJson('');
        setLines('');
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={t('importer.title')}
            size="lg"
            footer={(
                <>
                    <button className={btn.secondary} onClick={onClose}>{t('common.cancel')}</button>
                    <button className={btn.primary} onClick={submit} disabled={!ready.length}>
                        <CheckCircle2 size={18} /> {ready.length ? t('importer.importN', { count: ready.length }) : t('editor.import')}
                    </button>
                </>
            )}
        >
            <Segmented
                value={tab}
                onChange={setTab}
                options={[{ value: 'ai', label: t('editor.fromChatGPT'), icon: Sparkles }, { value: 'lines', label: t('importer.simpleList'), icon: List }]}
            />

            {tab === 'ai' ? (
                <div className="mt-4 space-y-3">
                    <Step n={1} title={t('importer.step1')} hint={t('importer.step1Hint')}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="sm:col-span-2 block">
                                <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t('importer.topic')}</span>
                                <input value={topic} onChange={e => setTopic(e.target.value.slice(0, 120))} placeholder={t('importer.topicPlaceholder')} className={inputClass} />
                            </label>
                            <label className="block">
                                <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t('importer.level')}</span>
                                <input value={level} onChange={e => setLevel(e.target.value.slice(0, 60))} placeholder={t('importer.levelPlaceholder')} className={inputClass} />
                            </label>
                            <div>
                                <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t('importer.language')}</span>
                                <Segmented value={language} onChange={setLanguage} options={AI_LANGUAGES.map(l => ({ value: l, label: t(`importer.languages.${l}`) }))} size="sm" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <Stepper label={t('importer.count')} value={count} min={3} max={40} onChange={setCount} />
                        </div>
                        <div className="mt-3">
                            <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">{t('importer.types')}</span>
                            <div className="flex flex-wrap gap-1.5">
                                {TYPE_IDS.map(type => {
                                    const Icon = TYPE_ICONS[type];
                                    const on = types.includes(type);
                                    return (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => toggleType(type)}
                                            aria-pressed={on}
                                            className={cx('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors',
                                                on ? 'border-primary-400 bg-primary-500/15 text-primary-700 dark:text-primary-200' : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400')}
                                        >
                                            <Icon size={13} /> {t(`qtypes.${type}.label`)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <button type="button" onClick={copyPrompt} className={btn.primary}><Copy size={16} /> {t('importer.copyPrompt')}</button>
                            <button type="button" onClick={() => setShowPrompt(v => !v)} className={btn.ghost}>
                                <ChevronDown size={16} className={cx('transition-transform', showPrompt && 'rotate-180')} /> {showPrompt ? t('importer.hidePrompt') : t('importer.seePrompt')}
                            </button>
                        </div>
                        {showPrompt && (
                            <pre className="mt-3 max-h-56 overflow-auto rounded-xl bg-white dark:bg-[#050918] border border-gray-200 dark:border-white/10 p-3 text-xs whitespace-pre-wrap break-words text-gray-700 dark:text-gray-300">{prompt}</pre>
                        )}
                    </Step>

                    <Step n={2} title={t('importer.step2')}>
                        <div className="flex flex-wrap gap-2 mb-2">
                            <button type="button" onClick={pasteFromClipboard} className={btn.secondary}><ClipboardPaste size={16} /> {t('importer.paste')}</button>
                            <button type="button" onClick={() => setShowExample(v => !v)} className={btn.ghost}><FileJson size={16} /> {showExample ? t('importer.hideExample') : t('importer.seeFormat')}</button>
                        </div>
                        {showExample && (
                            <div className="mb-3 rounded-xl bg-white dark:bg-[#050918] border border-gray-200 dark:border-white/10">
                                <pre className="max-h-56 overflow-auto p-3 text-xs text-gray-700 dark:text-gray-300">{EXAMPLE_JSON}</pre>
                                <div className="px-3 pb-3">
                                    <button type="button" onClick={() => setJson(EXAMPLE_JSON)} className={cx(btn.ghost, 'text-sm')}><Wand2 size={15} /> {t('importer.tryExample')}</button>
                                </div>
                            </div>
                        )}
                        <textarea
                            value={json}
                            onChange={e => setJson(e.target.value)}
                            rows={7}
                            spellCheck={false}
                            placeholder={'{\n  "title": "…",\n  "questions": [ … ]\n}'}
                            className={cx(inputClass, 'font-mono text-xs leading-relaxed')}
                            aria-label={t('importer.pasteJson')}
                        />

                        {parsed.error && (
                            <p className="mt-2 flex items-start gap-2 text-sm text-rose-600 dark:text-rose-300" role="alert">
                                <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {t(`importer.errors.${parsed.error.code}`, { pos: parsed.error.pos })}
                            </p>
                        )}
                        {!parsed.error && parsed.total > 0 && (
                            <div className="mt-3">
                                {parsed.questions.length > 0 && (
                                    <>
                                        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                            <CheckCircle2 size={16} /> {t('importer.ready', { count: parsed.questions.length })}
                                            <span className="flex flex-wrap gap-1">
                                                {typeCounts(parsed.questions).map(c => (
                                                    <span key={c.type} className="text-xs font-bold text-gray-500 dark:text-gray-400">· {c.count} {t(`qtypes.${c.type}.short`)}</span>
                                                ))}
                                            </span>
                                        </p>
                                        <Preview questions={parsed.questions} />
                                    </>
                                )}
                                {parsed.problems.length > 0 && (
                                    <div className="mt-3 rounded-xl border border-amber-300/70 dark:border-amber-400/25 bg-amber-50 dark:bg-amber-400/[0.06]">
                                        <button type="button" onClick={() => setProblemsOpen(v => !v)} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
                                            <AlertTriangle size={16} /> {t('importer.skipped', { count: parsed.problems.length })}
                                            <ChevronDown size={16} className={cx('ml-auto transition-transform', problemsOpen && 'rotate-180')} />
                                        </button>
                                        {problemsOpen && (
                                            <ul className="px-3 pb-3 space-y-1 text-xs text-amber-900 dark:text-amber-100/90">
                                                {parsed.problems.map(p => (
                                                    <li key={p.n} className="break-words"><b>#{p.n}</b>{p.prompt ? ` "${p.prompt.slice(0, 60)}${p.prompt.length > 60 ? '…' : ''}"` : ''}: {p.codes.map(code => t(`validation.${code}`)).join(' ')}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                                {parsed.meta.title && parsed.questions.length > 0 && (
                                    <label className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                        <input type="checkbox" checked={useTitle} onChange={e => setUseTitle(e.target.checked)} className="w-4 h-4 accent-[rgb(var(--color-primary-600))]" />
                                        {t('importer.useTitle', { title: parsed.meta.title })}
                                    </label>
                                )}
                            </div>
                        )}
                    </Step>
                </div>
            ) : (
                <div className="mt-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        <Slots text={t('importer.linesHint')} slots={{ format: <code className="px-1 rounded bg-gray-100 dark:bg-white/10">{t('importer.linesFormat')}</code> }} />
                    </p>
                    <textarea
                        value={lines}
                        onChange={e => setLines(e.target.value)}
                        rows={9}
                        placeholder={t('importer.linesPlaceholder')}
                        className={cx(inputClass, 'font-mono text-sm')}
                        aria-label={t('importer.linesLabel')}
                    />
                    {lineQuestions.length > 0 && (
                        <>
                            <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                                <CheckCircle2 size={16} /> {t('importer.ready', { count: lineQuestions.length })}
                            </p>
                            <Preview questions={lineQuestions} />
                        </>
                    )}
                </div>
            )}
        </Modal>
    );
};

export default ImportModal;
