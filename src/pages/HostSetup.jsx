import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Rocket, Smartphone, Presentation, AlertTriangle, RotateCcw } from 'lucide-react';
import SettingsForm from '../components/host/SettingsForm';
import GameArt from '../components/art/GameArt';
import CompatPanel from '../components/host/CompatPanel';
import { useSet } from '../components/sets/useSet';
import { PageSpinner, EmptyState, btn, cx, cardClass } from '../components/ui';
import { toast } from '../components/ui/toast';
import { GAMES, getGame, gameName, defaultSettings, sanitizeSettings } from '../platform/games/registry';
import { analyzeSet, selectQuestions } from '../platform/questions/compat';
import { createRoom } from '../platform/rooms/rooms';
import { countPlay } from '../platform/sets/publicSets';
import { audio } from '../platform/audio/audio';
import { useUser } from '../context/UserContext';
import { useT } from '../context/LanguageContext';
import { tl } from '../i18n';
import Slots from '../i18n/Slots';
import { saveBoardSession } from '../platform/games/boardSession';

// v2: settings saved before negative scores became the default are discarded once
const SETTINGS_KEY = (gameId) => `orbit.gameSettings.v2.${gameId}`;

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
    const t = useT();
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
        () => (analysis ? Object.values(analysis.byType).filter(info => info.support !== 'unsupported' && info.playable > 0).map(info => info.type) : []),
        [analysis]
    );
    const enabled = enabledTypes ?? allowedTypes;
    const questions = useMemo(() => (set ? selectQuestions(game, set.questions, enabled) : []), [game, set, enabled]);

    if (loading) return <PageSpinner />;
    if (!set) {
        return <EmptyState icon={AlertTriangle} title={t('setView.notFound.title')} action={<Link to="/games" className={btn.primary}>{t('host.backToGames')}</Link>}>{t('host.pickAnother')}</EmptyState>;
    }

    const settingsError = game.validate?.(settings) || null; // a key or [key, vars]
    const name = gameName(t, game);
    const tooFew = questions.length < (game.minQuestions || 1);
    const canStart = !tooFew && !settingsError && !starting;

    const toggleType = (type) => {
        const current = enabled;
        setEnabledTypes(current.includes(type) ? current.filter(x => x !== type) : [...current, type]);
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
                toast(t('host.storageFull'), 'error');
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
            toast(t('host.roomFailed'), 'error');
            setStarting(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto md:pb-16">
            <button onClick={() => navigate(`/set/${set.id}`)} className={cx(btn.ghost, '-ml-3 mb-2')}><ArrowLeft size={18} /> {set.title}</button>
            <h1 className="orbit-title text-3xl md:text-4xl pb-0.5">{t('setView.host')}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 mb-6"><Slots text={t('host.with')} slots={{ title: <b className="text-gray-700 dark:text-gray-200">{set.title}</b> }} /> · {t('common.questions', { count: set.questions.length })}</p>

            {/* 1. Game */}
            <section className="mb-6">
                <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400 mb-2">1 · {t('host.game')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {GAMES.map(g => {
                        const a = analyzeSet(g, set.questions);
                        const usable = Object.values(a.byType).reduce((n, info) => n + (info.support !== 'unsupported' ? info.playable : 0), 0);
                        return (
                            <button
                                key={g.id}
                                onClick={() => setGameId(g.id)}
                                aria-pressed={g.id === gameId}
                                className={cx(cardClass, 'orbit-card-hover text-left p-2.5 flex items-center gap-3 min-w-0', g.id === gameId && 'ring-2 ring-primary-400 shadow-[0_0_24px_-8px_rgb(var(--color-primary-400))]')}
                            >
                                <span className="relative w-20 h-12 shrink-0 rounded-xl overflow-hidden">
                                    <GameArt gameId={g.id} className="absolute inset-0 w-full h-full" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block font-display font-bold truncate text-gray-900 dark:text-white">{gameName(t, g)}</span>
                                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                        {g.kind === 'live' ? <Smartphone size={12} /> : <Presentation size={12} />}
                                        {t('host.playable', { usable, count: set.questions.length })}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 2. Questions */}
                <section>
                    <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400 mb-2">2 · {t('host.questions')}</h2>
                    <div className={cx(cardClass, 'p-4')}>
                        {analysis && Object.keys(analysis.byType).length > 0 ? (
                            <CompatPanel game={game} analysis={analysis} enabled={enabled} onToggle={toggleType} />
                        ) : (
                            <p className="text-sm text-gray-500">{t('host.noQuestions')}</p>
                        )}
                        <p className={cx('mt-4 text-sm font-semibold', tooFew ? 'text-red-500' : 'text-gray-700 dark:text-gray-200')}>
                            {tooFew
                                ? t('host.tooFew', { name, count: game.minQuestions, selected: questions.length })
                                : t('host.willUse', { count: questions.length })}
                        </p>
                    </div>
                </section>

                {/* 3. Settings */}
                <section>
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">3 · {t('nav.settings')}</h2>
                        <button onClick={() => updateSettings(defaultSettings(game))} className="text-xs font-semibold text-gray-500 hover:text-primary-600 inline-flex items-center gap-1">
                            <RotateCcw size={12} /> {t('host.defaults')}
                        </button>
                    </div>
                    <div className={cx(cardClass, 'p-4')}>
                        <SettingsForm key={game.id} game={game} value={settings} onChange={updateSettings} forceOpen={!!settingsError} />
                        {settingsError && <p className="mt-3 text-sm font-semibold text-red-500">{tl(settingsError, t)}</p>}
                    </div>
                </section>
            </div>

            {/* Start */}
            <div className="mt-6 md:sticky md:bottom-0 z-10">
                <button
                    onClick={start}
                    disabled={!canStart}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary-500 via-primary-600 to-violet-600 hover:from-primary-400 hover:via-primary-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-lg shadow-[0_16px_40px_-16px_rgb(var(--color-primary-500))] flex items-center justify-center gap-2 transition-colors"
                >
                    <Rocket size={22} />
                    {starting ? t('host.starting') : game.kind === 'live' ? t('host.createRoom') : t('host.startHere')}
                </button>
            </div>
        </div>
    );
};

export default HostSetup;
