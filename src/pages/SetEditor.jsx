import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Globe, Lock, Plus, Play, AlertTriangle, Sparkles, Wand2 } from 'lucide-react';
import QuestionCard from '../components/editor/QuestionCard';
import ImportModal from '../components/editor/ImportModal';
import { Modal, ConfirmDialog, EmptyState, btn, inputClass, cx, TYPE_ICONS } from '../components/ui';
import { toast } from '../components/ui/toast';
import { QUESTION_TYPES, TYPE_IDS, createQuestion, convertQuestion, isValidQuestion, uid } from '../platform/questions/types';
import { demoQuestion } from '../platform/questions/demos';
import { saveSet, findLocalSet } from '../platform/sets/store';
import { publishSet, unpublishSet } from '../platform/sets/publicSets';
import { SUBJECTS } from '../platform/sets/search';
import { useUser } from '../context/UserContext';

const blankSet = () => ({
    id: null,
    title: '',
    description: '',
    subject: '',
    visibility: 'private',
    remoteId: null,
    questions: [createQuestion('mc')]
});

const draftKey = (id) => `orbit.editorDraft.${id || 'new'}`;

const SetEditor = () => {
    const { setId } = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { userData, updateUserData } = useUser();

    const existing = setId ? findLocalSet(setId) : null;
    const editable = !setId || (existing && existing.id.startsWith('l_'));

    const [draft, setDraft] = useState(() => {
        // Recover unsaved work after a refresh or crash
        try {
            const saved = sessionStorage.getItem(draftKey(setId));
            if (saved) return JSON.parse(saved);
        } catch {
            /* ignore */
        }
        return existing ? JSON.parse(JSON.stringify(existing)) : blankSet();
    });
    const [dirty, setDirty] = useState(() => {
        try {
            return !!sessionStorage.getItem(draftKey(setId));
        } catch {
            return false;
        }
    });
    const [showErrors, setShowErrors] = useState(false);
    // /create/new?import=1 opens straight into "Import from ChatGPT"
    const [importOpen, setImportOpen] = useState(() => params.get('import') === '1');
    const [leaveOpen, setLeaveOpen] = useState(false);
    const [publishOpen, setPublishOpen] = useState(false);
    const [authorName, setAuthorName] = useState(userData.name || '');
    const [busy, setBusy] = useState(false);
    const bottomRef = useRef(null);

    const update = useCallback((fn) => {
        setDraft(prev => fn(prev));
        setDirty(true);
    }, []);

    // Crash-safe draft + warn before closing the tab with unsaved changes
    useEffect(() => {
        if (!dirty) return undefined;
        try {
            sessionStorage.setItem(draftKey(setId), JSON.stringify(draft));
        } catch {
            /* ignore */
        }
        const warn = (e) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty, draft, setId]);

    const clearDraft = () => {
        try {
            sessionStorage.removeItem(draftKey(setId));
        } catch {
            /* ignore */
        }
    };

    // ---------- question operations (stable callbacks for memoized cards) ----------

    const onChange = useCallback((id, next) => update(d => ({ ...d, questions: d.questions.map(q => (q.id === id ? next : q)) })), [update]);
    const onType = useCallback((id, type) => update(d => ({ ...d, questions: d.questions.map(q => (q.id === id ? convertQuestion(q, type) : q)) })), [update]);
    const onMove = useCallback((id, dir) => update(d => {
        const qs = [...d.questions];
        const i = qs.findIndex(q => q.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= qs.length) return d;
        [qs[i], qs[j]] = [qs[j], qs[i]];
        return { ...d, questions: qs };
    }), [update]);
    const onDuplicate = useCallback((id) => update(d => {
        const i = d.questions.findIndex(q => q.id === id);
        if (i < 0) return d;
        const copy = JSON.parse(JSON.stringify(d.questions[i]));
        copy.id = uid();
        (copy.options || []).forEach(o => { o.id = uid(); });
        const qs = [...d.questions];
        qs.splice(i + 1, 0, copy);
        return { ...d, questions: qs };
    }), [update]);
    const onRemove = useCallback((id) => update(d => ({ ...d, questions: d.questions.filter(q => q.id !== id) })), [update]);

    // The blank starter question is replaced instead of left behind as an empty card
    const isUntouched = (q) => !q.prompt.trim() && !isValidQuestion(q)
        && !(q.options || []).some(o => o.text.trim()) && !(q.accepted || []).some(a => a.trim()) && !(q.items || []).some(i => i.trim());
    const append = (d, added) => ({
        ...d,
        questions: [...(d.questions.length === 1 && isUntouched(d.questions[0]) ? [] : d.questions), ...added]
    });

    const scrollToEnd = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 50);

    const addQuestion = (type) => {
        update(d => ({ ...d, questions: [...d.questions, createQuestion(type)] }));
        scrollToEnd();
    };

    const addExamples = (typeList) => {
        update(d => append(d, typeList.map(demoQuestion)));
        toast(typeList.length === 1 ? `Example added (${QUESTION_TYPES[typeList[0]].label}). Edit it to make it yours.` : 'One example of each type added. Edit them to make them yours.');
        scrollToEnd();
    };

    const stats = useMemo(() => {
        const valid = draft.questions.filter(isValidQuestion).length;
        return { valid, incomplete: draft.questions.length - valid };
    }, [draft.questions]);

    // ---------- save / publish ----------

    const save = useCallback(async ({ quiet = false } = {}) => {
        if (!draft.title.trim()) {
            setShowErrors(true);
            toast('Give your set a title first.', 'error');
            return null;
        }
        setBusy(true);
        try {
            let saved = saveSet({ ...draft, id: draft.id || existing?.id, author: draft.author || userData.name || '' });
            // Public sets stay in sync with the library
            if (saved.visibility === 'public' && saved.remoteId) {
                try {
                    await publishSet(saved);
                } catch {
                    toast('Saved here, but the public copy could not be updated.', 'error');
                }
            }
            setDraft(saved);
            setDirty(false);
            clearDraft();
            setShowErrors(true);
            if (!quiet) {
                toast(stats.incomplete
                    ? `Saved. ${stats.incomplete} incomplete question${stats.incomplete === 1 ? '' : 's'} will be skipped in games.`
                    : 'Saved!');
            }
            if (!setId) navigate(`/create/${saved.id}`, { replace: true });
            return saved;
        } catch (err) {
            toast(err.message || 'Could not save.', 'error');
            return null;
        } finally {
            setBusy(false);
        }
    }, [draft, existing, userData.name, stats.incomplete, setId, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

    // Ctrl/Cmd + S
    useEffect(() => {
        const onKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                save();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [save]);

    const publish = async () => {
        const name = authorName.trim();
        if (!name) return;
        if (name !== userData.name) updateUserData({ name });
        setBusy(true);
        try {
            const base = saveSet({ ...draft, id: draft.id || existing?.id, author: name });
            const remoteId = await publishSet(base);
            const saved = saveSet({ ...base, remoteId, visibility: 'public', author: name });
            setDraft(saved);
            setDirty(false);
            clearDraft();
            setPublishOpen(false);
            toast('Published! It now appears in Discover.');
            if (!setId) navigate(`/create/${saved.id}`, { replace: true });
        } catch (err) {
            toast(err.message || 'Publishing failed. Check your connection.', 'error');
        } finally {
            setBusy(false);
        }
    };

    const unpublish = async () => {
        setBusy(true);
        try {
            await unpublishSet(draft.remoteId);
            const saved = saveSet({ ...draft, remoteId: null, visibility: 'private' });
            setDraft(saved);
            toast('Removed from the public library.');
        } catch {
            toast('Could not unpublish. Check your connection.', 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleImport = (imported, meta = {}) => {
        update(d => {
            const next = append(d, imported);
            if (meta.title && !d.title.trim()) next.title = meta.title;
            if (meta.description && !d.description.trim()) next.description = meta.description;
            if (meta.subject && !d.subject) {
                const match = SUBJECTS.find(sub => sub.toLowerCase() === meta.subject.toLowerCase());
                if (match) next.subject = match;
            }
            return next;
        });
        setImportOpen(false);
        toast(`Imported ${imported.length} question${imported.length === 1 ? '' : 's'}. Check them, then Save.`);
        scrollToEnd();
    };

    const goBack = () => (dirty ? setLeaveOpen(true) : navigate(draft.id ? `/set/${draft.id}` : '/create'));

    if (setId && !editable) {
        return (
            <EmptyState icon={AlertTriangle} title="This set can't be edited here" action={<Link to={`/set/${setId}`} className={btn.primary}>Open the set</Link>}>
                Only your own sets can be edited. Open it and choose "Copy &amp; edit" to make your own version.
            </EmptyState>
        );
    }

    return (
        <div className="max-w-3xl mx-auto md:pb-16">
            {/* Sticky toolbar */}
            <div className="sticky -top-4 md:-top-8 z-20 pb-3">
                <div className="flex items-center gap-2 rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white/95 dark:bg-[#0b1230]/95 shadow-[0_12px_30px_-18px_rgba(5,8,22,0.7)] p-2 pl-1">
                <button onClick={goBack} className={btn.icon} aria-label="Back"><ArrowLeft size={20} /></button>
                <span className="flex-1 min-w-0 font-display font-bold text-lg truncate">{draft.title || 'New set'}</span>
                {dirty && <span className="hidden sm:inline text-xs text-amber-600 dark:text-amber-400 font-semibold">Unsaved</span>}
                {draft.id && !dirty && (
                    <Link to={`/host/${draft.id}`} className={cx(btn.secondary, 'px-3')}><Play size={16} /> <span className="hidden sm:inline">Host</span></Link>
                )}
                <button onClick={() => save()} disabled={busy} className={btn.primary}><Save size={18} /> Save</button>
                </div>
            </div>

            {/* Details */}
            <section className="orbit-card p-4 sm:p-5 space-y-4 mt-2">
                <div>
                    <label htmlFor="set-title" className="block text-sm font-semibold mb-1.5">Title</label>
                    <input
                        id="set-title"
                        value={draft.title}
                        onChange={e => update(d => ({ ...d, title: e.target.value.slice(0, 80) }))}
                        placeholder="e.g. Photosynthesis basics"
                        className={cx(inputClass, 'text-lg font-bold', showErrors && !draft.title.trim() && 'border-red-400')}
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                        <label htmlFor="set-desc" className="block text-sm font-semibold mb-1.5">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                        <input id="set-desc" value={draft.description} onChange={e => update(d => ({ ...d, description: e.target.value.slice(0, 200) }))} placeholder="What is this set about?" className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor="set-subject" className="block text-sm font-semibold mb-1.5">Subject</label>
                        <select id="set-subject" value={draft.subject} onChange={e => update(d => ({ ...d, subject: e.target.value }))} className={inputClass}>
                            <option value="">Choose…</option>
                            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2 text-sm">
                        {draft.visibility === 'public'
                            ? <span className="inline-flex items-center gap-1.5 font-semibold text-sky-600 dark:text-sky-400"><Globe size={16} /> Public in Discover</span>
                            : <span className="inline-flex items-center gap-1.5 font-semibold text-gray-500"><Lock size={15} /> Private</span>}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setImportOpen(true)} className={btn.secondary}><Sparkles size={16} className="text-violet-400" /> Import</button>
                        {draft.visibility === 'public'
                            ? <button onClick={unpublish} disabled={busy} className={btn.secondary}><Lock size={16} /> Unpublish</button>
                            : <button onClick={() => setPublishOpen(true)} disabled={busy || stats.valid === 0} className={btn.secondary}><Globe size={16} /> Publish</button>}
                    </div>
                </div>
            </section>

            {/* Questions */}
            <div className="flex items-center justify-between mt-6 mb-3">
                <h2 className="font-display text-xl font-bold">Questions <span className="text-gray-400 font-semibold">({draft.questions.length})</span></h2>
                {stats.incomplete > 0 && draft.questions.length > 0 && (
                    <button onClick={() => setShowErrors(true)} className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {stats.incomplete} incomplete
                    </button>
                )}
            </div>

            <div className="space-y-3">
                {draft.questions.map((q, i) => (
                    <QuestionCard
                        key={q.id}
                        q={q}
                        index={i}
                        total={draft.questions.length}
                        showErrors={showErrors}
                        onChange={onChange}
                        onType={onType}
                        onMove={onMove}
                        onDuplicate={onDuplicate}
                        onRemove={onRemove}
                    />
                ))}
                {draft.questions.length === 0 && (
                    <p className="text-center text-sm text-gray-500 py-6">No questions yet. Add one below.</p>
                )}
            </div>

            {/* Add question */}
            <div ref={bottomRef} className="mt-4 rounded-3xl border-2 border-dashed border-gray-300/80 dark:border-white/10 bg-white/50 dark:bg-white/[0.02] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1.5"><Plus size={16} /> Add a question</p>
                    <div className="flex flex-wrap gap-1.5">
                        <button onClick={() => addExamples(TYPE_IDS)} className={cx(btn.ghost, 'text-sm py-1.5')}><Wand2 size={15} className="text-violet-400" /> One example of each</button>
                        <button onClick={() => setImportOpen(true)} className={cx(btn.ghost, 'text-sm py-1.5')}><Sparkles size={15} className="text-violet-400" /> From ChatGPT</button>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {TYPE_IDS.map(t => {
                        const Icon = TYPE_ICONS[t];
                        return (
                            <div key={t} className="flex flex-col rounded-2xl bg-white dark:bg-white/[0.04] border border-gray-200/80 dark:border-white/[0.07] overflow-hidden">
                                <button onClick={() => addQuestion(t)} title={`Add an empty ${QUESTION_TYPES[t].label.toLowerCase()} question`} className="flex-1 flex flex-col items-center gap-1.5 px-2 pt-3 pb-2 hover:bg-primary-50 dark:hover:bg-primary-500/10 hover:text-primary-700 dark:hover:text-primary-200 transition-colors">
                                    <Icon size={20} />
                                    <span className="text-xs font-bold text-center leading-tight">{QUESTION_TYPES[t].label}</span>
                                </button>
                                <button onClick={() => addExamples([t])} className="text-[11px] font-semibold py-1.5 border-t border-gray-200/80 dark:border-white/[0.07] text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors">
                                    + Example
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {importOpen && (
                <ImportModal open onClose={() => setImportOpen(false)} onImport={handleImport} currentTitle={draft.title} />
            )}

            {/* Publish */}
            <Modal
                open={publishOpen}
                onClose={() => setPublishOpen(false)}
                title="Publish to Discover"
                size="sm"
                footer={<><button className={btn.secondary} onClick={() => setPublishOpen(false)}>Cancel</button><button className={btn.primary} disabled={!authorName.trim() || busy} onClick={publish}><Globe size={16} /> Publish</button></>}
            >
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Anyone can find, play and copy public sets. {stats.incomplete > 0 && `${stats.incomplete} incomplete question${stats.incomplete === 1 ? ' is' : 's are'} left out.`}</p>
                <label htmlFor="author" className="block text-sm font-semibold mb-1.5">Shown as author</label>
                <input id="author" value={authorName} onChange={e => setAuthorName(e.target.value.slice(0, 40))} placeholder="Your name" className={inputClass} />
            </Modal>

            <ConfirmDialog
                open={leaveOpen}
                title="Leave without saving?"
                message="Your changes to this set will be lost."
                confirmLabel="Leave"
                danger
                onCancel={() => setLeaveOpen(false)}
                onConfirm={() => {
                    clearDraft();
                    setLeaveOpen(false);
                    navigate(draft.id ? `/set/${draft.id}` : '/create');
                }}
            />
        </div>
    );
};

export default SetEditor;
