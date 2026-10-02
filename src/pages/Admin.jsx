import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Shield, Users, BookOpen, Sparkles, Trash2, Star, StarOff, Search, RefreshCw,
    Eye, ExternalLink, BarChart3, Globe, AlertTriangle, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useT } from '../context/LanguageContext';
import { isFirebaseConfigured, getFirestoreApi } from '../config/firebase';
import { refreshPublicSets } from '../platform/sets/publicSets';
import { PageHeader, EmptyState, Spinner, btn, inputClass, cx } from '../components/ui';
import { toast } from '../components/ui/toast';
import SpaceScreen from '../components/SpaceScreen';
import AuthPanel from '../components/auth/AuthPanel';

const ADMIN_EMAIL = 'fynamichashbdev@gmail.com';

const StatCard = ({ icon: Icon, label, value, tone = 'primary' }) => (
    <div className="orbit-card p-4 sm:p-5 flex items-center gap-4">
        <span className={cx(
            'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0',
            tone === 'primary' && 'bg-primary-500/15 text-primary-500',
            tone === 'violet' && 'bg-violet-500/15 text-violet-500',
            tone === 'amber' && 'bg-amber-500/15 text-amber-500',
            tone === 'sky' && 'bg-sky-500/15 text-sky-500'
        )}>
            <Icon size={22} />
        </span>
        <div>
            <p className="text-2xl font-display font-bold text-gray-900 dark:text-white">{value ?? '—'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">{label}</p>
        </div>
    </div>
);

const SetRow = ({ set, onFeature, onDelete }) => {
    const [expanded, setExpanded] = useState(false);
    const isFeatured = !!set.featured;
    return (
        <div className="orbit-card p-4 space-y-2">
            <div className="flex items-start gap-3">
                <button onClick={() => setExpanded(v => !v)} className="mt-0.5 shrink-0 text-gray-400 hover:text-gray-600">
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-bold text-gray-900 dark:text-white truncate">{set.title}</span>
                        {isFeatured && <Sparkles size={14} className="text-amber-500 shrink-0" />}
                        {set.visibility === 'public' && <Globe size={13} className="text-sky-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {set.questionCount ?? set.questions?.length ?? 0} questions
                        {set.subject ? ` · ${set.subject}` : ''}
                        {set.grade ? ` · ${set.grade}` : ''}
                        {set.author ? ` · by ${set.author}` : ''}
                        {set.plays ? ` · ${set.plays} plays` : ''}
                    </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <Link to={`/set/p_${set.id}`} className={cx(btn.icon, 'text-gray-400')} title="View"><Eye size={16} /></Link>
                    <button onClick={() => onFeature(set)} className={cx(btn.icon, isFeatured ? 'text-amber-500' : 'text-gray-400')} title={isFeatured ? 'Unfeature' : 'Feature'}>
                        {isFeatured ? <StarOff size={16} /> : <Star size={16} />}
                    </button>
                    <button onClick={() => onDelete(set)} className={cx(btn.icon, 'text-red-400 hover:text-red-600')} title="Delete"><Trash2 size={16} /></button>
                </div>
            </div>
            {expanded && (
                <div className="ml-7 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <p><strong>ID:</strong> {set.id}</p>
                    <p><strong>Owner:</strong> {set.ownerId}</p>
                    {set.description && <p><strong>Description:</strong> {set.description}</p>}
                    <p><strong>Created:</strong> {set.createdAt ? new Date(typeof set.createdAt.toMillis === 'function' ? set.createdAt.toMillis() : set.createdAt).toLocaleString() : '—'}</p>
                    <p><strong>Types:</strong> {(set.types || []).join(', ') || '—'}</p>
                </div>
            )}
        </div>
    );
};

const UserRow = ({ user, uid }) => {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="orbit-card p-4">
            <div className="flex items-center gap-3">
                <button onClick={() => setExpanded(v => !v)} className="shrink-0 text-gray-400 hover:text-gray-600">
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-bold text-gray-900 dark:text-white truncate">{user.name || 'No name'}</span>
                        {user.email === ADMIN_EMAIL && <Shield size={13} className="text-primary-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {user.email || 'no email'}
                        {user.termsVersion ? ` · Terms ${user.termsVersion}` : ' · No terms'}
                    </p>
                </div>
            </div>
            {expanded && (
                <div className="ml-7 mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <p><strong>UID:</strong> {uid}</p>
                    <p><strong>Created:</strong> {user.createdAt ? new Date(user.createdAt).toLocaleString() : '—'}</p>
                    <p><strong>Terms accepted:</strong> {user.termsAcceptedAt ? new Date(user.termsAcceptedAt).toLocaleString() : '—'}</p>
                    <p><strong>Changelog seen:</strong> {user.seenChangelog || '—'}</p>
                </div>
            )}
        </div>
    );
};

const Admin = () => {
    const auth = useAuth();
    const t = useT();
    const [tab, setTab] = useState('dashboard');
    const [sets, setSets] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [userQuery, setUserQuery] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(null);

    useEffect(() => { auth.start().catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const isAdmin = auth.user?.email === ADMIN_EMAIL && auth.user.emailVerified;

    const loadSets = useCallback(async () => {
        if (!isFirebaseConfigured) return;
        try {
            const { db, collection, getDocs, query: q, orderBy, limit } = await getFirestoreApi();
            const snap = await getDocs(q(collection(db, 'question_sets'), orderBy('createdAt', 'desc'), limit(500)));
            setSets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error('Admin: load sets failed', err);
            toast('Failed to load sets', 'error');
        }
    }, []);

    const loadUsers = useCallback(async () => {
        if (!isFirebaseConfigured) return;
        try {
            const { db, collection, getDocs, query: q, limit } = await getFirestoreApi();
            const snap = await getDocs(q(collection(db, 'users'), limit(500)));
            setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
        } catch (err) {
            console.error('Admin: load users failed', err);
            toast('Failed to load users', 'error');
        }
    }, []);

    useEffect(() => {
        if (!isAdmin) { setLoading(false); return; }
        setLoading(true);
        Promise.all([loadSets(), loadUsers()]).finally(() => setLoading(false));
    }, [isAdmin, loadSets, loadUsers]);

    const featureSet = async (set) => {
        try {
            const { db, doc, updateDoc } = await getFirestoreApi();
            const next = !set.featured;
            await updateDoc(doc(db, 'question_sets', set.id), { featured: next });
            setSets(prev => prev.map(s => s.id === set.id ? { ...s, featured: next } : s));
            refreshPublicSets();
            toast(next ? `Featured "${set.title}"` : `Unfeatured "${set.title}"`);
        } catch {
            toast('Failed to update', 'error');
        }
    };

    const deleteSet = async () => {
        const set = confirmDelete;
        setConfirmDelete(null);
        try {
            const { db, doc, deleteDoc } = await getFirestoreApi();
            await deleteDoc(doc(db, 'question_sets', set.id));
            setSets(prev => prev.filter(s => s.id !== set.id));
            refreshPublicSets();
            toast(`Deleted "${set.title}"`);
        } catch {
            toast('Failed to delete', 'error');
        }
    };

    // Gate: must be signed in
    if (auth.status !== 'ready') return <SpaceScreen center><Spinner size={36} className="text-emerald-400" /></SpaceScreen>;
    if (!auth.user) return <SpaceScreen center><AuthPanel reason="default" /></SpaceScreen>;
    if (!isAdmin) {
        return (
            <SpaceScreen center>
                <div className="orbit-card p-8 text-center max-w-sm">
                    <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
                    <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Access denied</h1>
                    <p className="text-sm text-gray-500 mt-2">This area is restricted.</p>
                    <Link to="/" className={cx(btn.primary, 'mt-4')}>Go home</Link>
                </div>
            </SpaceScreen>
        );
    }

    if (loading) return <div className="flex justify-center py-20"><Spinner size={36} /></div>;

    const totalPlays = sets.reduce((sum, s) => sum + (s.plays || 0), 0);
    const featuredCount = sets.filter(s => s.featured).length;
    const filteredSets = sets.filter(s =>
        !query || [s.title, s.author, s.subject, s.id].some(f => (f || '').toLowerCase().includes(query.toLowerCase()))
    );
    const filteredUsers = users.filter(u =>
        !userQuery || [u.name, u.email, u.uid].some(f => (f || '').toLowerCase().includes(userQuery.toLowerCase()))
    );

    const TABS = [
        { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
        { id: 'sets', icon: BookOpen, label: `Sets (${sets.length})` },
        { id: 'users', icon: Users, label: `Users (${users.length})` },
    ];

    return (
        <div className="space-y-6 md:pb-16">
            <PageHeader icon={Shield} tone="primary" title="Admin Panel" subtitle="HashB's hideout" />

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {TABS.map(({ id, icon: Icon, label }) => (
                    <button key={id} onClick={() => setTab(id)}
                        className={cx('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors',
                            tab === id
                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                                : 'bg-white/60 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-primary-400')}>
                        <Icon size={16} /> {label}
                    </button>
                ))}
            </div>

            {/* Dashboard */}
            {tab === 'dashboard' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <StatCard icon={BookOpen} label="Public Sets" value={sets.length} tone="primary" />
                        <StatCard icon={Users} label="Accounts" value={users.length} tone="violet" />
                        <StatCard icon={BarChart3} label="Total Plays" value={totalPlays.toLocaleString()} tone="sky" />
                        <StatCard icon={Sparkles} label="Featured" value={featuredCount} tone="amber" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="orbit-card p-5">
                            <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white mb-3">Recent Sets</h3>
                            <div className="space-y-2">
                                {sets.slice(0, 5).map(s => (
                                    <div key={s.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100 dark:border-white/5 last:border-0">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold truncate text-gray-900 dark:text-white">{s.title}</p>
                                            <p className="text-xs text-gray-400">{s.author} · {s.questionCount ?? s.questions?.length ?? 0}q</p>
                                        </div>
                                        <Link to={`/set/p_${s.id}`} className="text-primary-500 hover:text-primary-400 shrink-0"><ExternalLink size={14} /></Link>
                                    </div>
                                ))}
                                {sets.length === 0 && <p className="text-sm text-gray-400">No public sets yet.</p>}
                            </div>
                        </div>

                        <div className="orbit-card p-5">
                            <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white mb-3">Recent Users</h3>
                            <div className="space-y-2">
                                {[...users].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5).map(u => (
                                    <div key={u.uid} className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100 dark:border-white/5 last:border-0">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold truncate text-gray-900 dark:text-white">{u.name || 'No name'}</p>
                                            <p className="text-xs text-gray-400">{u.email}</p>
                                        </div>
                                        {u.email === ADMIN_EMAIL && <Shield size={13} className="text-primary-500" />}
                                    </div>
                                ))}
                                {users.length === 0 && <p className="text-sm text-gray-400">No users yet.</p>}
                            </div>
                        </div>
                    </div>

                    <div className="orbit-card p-5">
                        <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white mb-3">Top Sets by Plays</h3>
                        <div className="space-y-2">
                            {[...sets].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 8).map((s, i) => (
                                <div key={s.id} className="flex items-center gap-3 py-1.5 border-b border-gray-100 dark:border-white/5 last:border-0">
                                    <span className="text-xs font-bold text-gray-400 w-5 text-right">{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate text-gray-900 dark:text-white">{s.title}</p>
                                    </div>
                                    <span className="text-sm font-semibold text-primary-500">{(s.plays || 0).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Sets management */}
            {tab === 'sets' && (
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <div className="relative flex-1 min-w-0">
                            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search sets by title, author or subject…"
                                className={`${inputClass} pl-10 py-3`} />
                            {query && <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400"><X size={16} /></button>}
                        </div>
                        <button onClick={() => { setLoading(true); loadSets().finally(() => setLoading(false)); }} className={btn.secondary}>
                            <RefreshCw size={16} /> Refresh
                        </button>
                    </div>

                    <div className="space-y-2">
                        {filteredSets.map(s => (
                            <SetRow key={s.id} set={s} onFeature={featureSet} onDelete={setConfirmDelete} />
                        ))}
                        {filteredSets.length === 0 && <EmptyState icon={BookOpen} title="No sets found">Try a different search.</EmptyState>}
                    </div>
                </div>
            )}

            {/* Users */}
            {tab === 'users' && (
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <div className="relative flex-1 min-w-0">
                            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input value={userQuery} onChange={e => setUserQuery(e.target.value)} placeholder="Search users by name, email or UID…"
                                className={`${inputClass} pl-10 py-3`} />
                            {userQuery && <button onClick={() => setUserQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400"><X size={16} /></button>}
                        </div>
                        <button onClick={() => { setLoading(true); loadUsers().finally(() => setLoading(false)); }} className={btn.secondary}>
                            <RefreshCw size={16} /> Refresh
                        </button>
                    </div>

                    <div className="space-y-2">
                        {filteredUsers.map(u => <UserRow key={u.uid} user={u} uid={u.uid} />)}
                        {filteredUsers.length === 0 && <EmptyState icon={Users} title="No users found">Try a different search.</EmptyState>}
                    </div>
                </div>
            )}

            {/* Delete confirmation */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
                    <div className="orbit-card w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">Delete this set?</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            <strong>"{confirmDelete.title}"</strong> by {confirmDelete.author || 'Unknown'} will be permanently deleted from the public library.
                        </p>
                        <div className="flex gap-2 mt-5">
                            <button onClick={() => setConfirmDelete(null)} className={cx(btn.secondary, 'flex-1')}>Cancel</button>
                            <button onClick={deleteSet} className={cx(btn.primary, 'flex-1 !bg-red-600 hover:!bg-red-700')}>
                                <Trash2 size={16} /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Admin;
