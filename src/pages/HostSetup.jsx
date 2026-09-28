import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Rocket, Smartphone, Presentation, AlertTriangle, RotateCcw } from 'lucide-react';
import SettingsForm from '../components/host/SettingsForm';
import CompatPanel from '../components/host/CompatPanel';
import { useSet } from '../components/sets/useSet';
import { PageSpinner, EmptyState, btn, cx, cardClass } from '../components/ui';
import { toast } from '../components/ui/toast';
import { GAMES, getGame, defaultSettings, sanitizeSettings } from '../platform/games/registry';
import { analyzeSet, selectQuestions } from '../platform/questions/compat';
import { createRoom } from '../platform/rooms/rooms';
import { countPlay } from '../platform/sets/publicSets';
import { audio } from '../platform/audio/audio';
import { useUser } from '../context/UserContext';
import { saveBoardSession } from '../platform/games/boardSession';

const SETTINGS_KEY = (gameId) => `orbit.gameSettings.${gameId}`;

const loadSettings = (game) => {
    try {
        return sanitizeSettings(game, { ...defaultSettings(game), ...JSON.parse(localStorage.getItem(SETTINGS_KEY(game.id)) || '{}') });
    } catch {
        return defaultSettings(game);
    }
};

const HostSetup = () => {
    const { setId } = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { userData } = useUser();
    const { set, loading } = useSet(setId);

    const [gameId, setGameId] = useState(() => {
        const fromUrl = params.get('game');
        if (getGame(fromUrl)) return fromUrl;
        try {
            const last = localStorage.getItem('orbit.lastGame');
            if (getGame(last)) return last;
        } catch {
            /* ignore */
        }
        return GAMES[0].id;
    });
    const game = getGame(gameId);
    const [settings, setSettings] = useState(() => loadSettings(game));
    const [enabledTypes, setEnabledTypes] = useState(null); // null = all compatible
    const [starting, setStarting] = useState(false);

    // Switching games loads that game's saved settings
    useEffect(() => {
        setSettings(loadSettings(game));
        setEnabledTypes(null);
    }, [game]);

    const analysis = useMemo(() => (set ? analyzeSet(game, set.questions) : null), [game, set]);
    const allowedTypes = useMemo(
        () => (analysis ? Object.values(analysis.byType).filter(t => t.support !== 'unsupported' && t.playable > 0).map(t => t.type) : []),
        [analysis]
    );
    const enabled = enabledTypes ?? allowedTypes;
    const questions = useMemo(() => (set ? selectQuestions(game, set.questions, enabled) : []), [game, set, enabled]);

    if (loading) return <PageSpinner />;
    if (!set) {
        return <EmptyState icon={AlertTriangle} title="Set not found" action={<Link to="/games" className={btn.primary}>Back to games</Link>}>Pick another set to host.</EmptyState>;
    }

    const settingsError = game.validate?.(settings) || null;
    const tooFew = questions.length < (game.minQuestions || 1);
    const canStart = !tooFew && !settingsError && !starting;

    const toggleType = (type) => {
        const current = enabled;
        setEnabledTypes(current.includes(type) ? current.filter(t => t !== type) : [...current, type]);
    };

    const updateSettings = (next) => {
        setSettings(next);
        try {
            localStorage.setItem(SETTINGS_KEY(game.id), JSON.stringify(next));
        } catch {
            /* ignore */
        }
    };

    const start = async () => {
        if (!canStart) return;
        audio.unlock();
        setStarting(true);
        try {
            localStorage.setItem('orbit.lastGame', game.id);
        } catch {
            /* ignore */
        }
        const payload = { title: set.title, questions };
        const clean = sanitizeSettings(game, settings);
        countPlay(set.remoteId);

        if (game.kind === 'board') {
            try {
                saveBoardSession({ gameId: game.id, set: payload, settings: clean, setId: set.id });
            } catch {
                toast('Could not start: browser storage is full.', 'error');
                setStarting(false);
                return;
            }
            navigate(`/board/${game.id}`);
            return;
        }

        try {
            const code = await createRoom({ gameId: game.id, set: payload, settings: clean, hostName: userData.name, setId: set.id });
            navigate(`/room/${code}`);
        } catch (err) {
            console.error(err);
            toast(err.message || 'Could not create the game room. Check your connection.', 'error');
            setStarting(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto md:pb-16">
            <button onClick={() => navigate(`/set/${set.id}`)} className={cx(btn.ghost, '-ml-3 mb-2')}><ArrowLeft size={18} /> {set.title}</button>
            <h1 className="text-3xl md:text-4xl font-extrabold">Host a game</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 mb-6">with <b className="text-gray-700 dark:text-gray-200">{set.title}</b> · {set.questions.length} questions</p>

            {/* 1. Game */}
            <section className="mb-6">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">1 · Game</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {GAMES.map(g => {
                        const a = analyzeSet(g, set.questions);
                        const usable = Object.values(a.byType).reduce((n, t) => n + (t.support !== 'unsupported' ? t.playable : 0), 0);
                        return (
                            <button
                                key={g.id}
                                onClick={() => setGameId(g.id)}
                                aria-pressed={g.id === gameId}
                                className={cx(cardClass, 'text-left p-3 flex items-center gap-3 transition-colors min-w-0', g.id === gameId ? 'ring-2 ring-primary-500' : 'hover:border-gray-300 dark:hover:border-gray-600')}
                            >
                                <span className={`w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br ${g.accent} flex items-center justify-center text-white`}>
                                    {g.kind === 'live' ? <Smartphone size={20} /> : <Presentation size={20} />}
                                </span>
                                <span className="min-w-0">
                                    <span className="block font-bold truncate">{g.name}</span>
                                    <span className="block text-xs text-gray-500">{usable} of {set.questions.length} questions playable</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 2. Questions */}
                <section>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">2 · Questions in this round</h2>
                    <div className={cx(cardClass, 'p-4')}>
                        {analysis && Object.keys(analysis.byType).length > 0 ? (
                            <CompatPanel game={game} analysis={analysis} enabled={enabled} onToggle={toggleType} />
                        ) : (
                            <p className="text-sm text-gray-500">This set has no questions yet.</p>
                        )}
                        <p className={cx('mt-4 text-sm font-semibold', tooFew ? 'text-red-500' : 'text-gray-700 dark:text-gray-200')}>
                            {tooFew
                                ? `${game.name} needs at least ${game.minQuestions} playable question${game.minQuestions === 1 ? '' : 's'} (${questions.length} selected).`
                                : `${questions.length} question${questions.length === 1 ? '' : 's'} will be used.`}
                        </p>
                    </div>
                </section>

                {/* 3. Settings */}
                <section>
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">3 · Settings</h2>
                        <button onClick={() => updateSettings(defaultSettings(game))} className="text-xs font-semibold text-gray-500 hover:text-primary-600 inline-flex items-center gap-1">
                            <RotateCcw size={12} /> Defaults
                        </button>
                    </div>
                    <div className={cx(cardClass, 'p-4')}>
                        <SettingsForm game={game} value={settings} onChange={updateSettings} />
                        {settingsError && <p className="mt-3 text-sm font-semibold text-red-500">{settingsError}</p>}
                    </div>
                </section>
            </div>

            {/* Start */}
            <div className="mt-6 md:sticky md:bottom-0 z-10">
                <button
                    onClick={start}
                    disabled={!canStart}
                    className="w-full py-4 rounded-2xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-lg shadow-xl shadow-primary-600/20 flex items-center justify-center gap-2 transition-colors"
                >
                    <Rocket size={22} />
                    {starting ? 'Starting…' : game.kind === 'live' ? 'Create game room' : 'Start on this screen'}
                </button>
            </div>
        </div>
    );
};

export default HostSetup;
