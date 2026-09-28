import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Shuffle } from 'lucide-react';
import SpaceScreen from '../components/SpaceScreen';
import { Spinner } from '../components/ui';
import { inspectRoom, joinRoom, getTabSession, getDeviceSession, getPlayer, isOnline, isValidCode, RoomError } from '../platform/rooms/rooms';
import { MAX_NAME } from '../platform/rooms/names';
import { getGame } from '../platform/games/registry';
import { audio } from '../platform/audio/audio';
import { useUser } from '../context/UserContext';

const NICK_KEY = 'orbit.lastNickname';

const ErrorScreen = ({ message }) => (
    <SpaceScreen center>
        <div className="w-full max-w-sm text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-400/15 text-amber-300 flex items-center justify-center mb-4"><AlertTriangle size={28} /></div>
            <p className="text-lg font-bold">{message}</p>
            <Link to="/join" className="inline-flex items-center justify-center gap-2 mt-6 w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black transition-colors">
                Try another code <ArrowRight size={18} />
            </Link>
        </div>
    </SpaceScreen>
);

// Student flow: check the code -> nickname -> the game's player screen
const PlayRoom = ({ code }) => {
    const navigate = useNavigate();
    const { userData } = useUser();

    const [phase, setPhase] = useState('checking'); // checking | name | resume | joining | playing | error
    const [meta, setMeta] = useState(null);
    const [error, setError] = useState('');
    const [name, setName] = useState(() => {
        try {
            return localStorage.getItem(NICK_KEY) || userData.name || '';
        } catch {
            return userData.name || '';
        }
    });
    const [nameError, setNameError] = useState('');
    const [resumeCandidate, setResumeCandidate] = useState(null);
    const [player, setPlayer] = useState(null);

    const fail = (err) => {
        setError(err instanceof RoomError ? err.message : 'Could not connect. Check your internet and try again.');
        setPhase('error');
    };

    const join = useCallback(async ({ resume = null, nickname = '' } = {}) => {
        setPhase('joining');
        try {
            const result = await joinRoom(code, nickname, { resume });
            if (nickname) {
                try {
                    localStorage.setItem(NICK_KEY, nickname.trim());
                } catch {
                    /* ignore */
                }
            }
            setMeta(result.meta);
            setPlayer({ playerId: result.playerId, name: result.name });
            setPhase('playing');
        } catch (err) {
            if (err instanceof RoomError && (err.reason === 'bad-name' || err.reason === 'name-taken')) {
                setNameError(err.reason === 'name-taken' ? err.message : '');
                setPhase('name');
                return;
            }
            fail(err);
        }
    }, [code]);

    useEffect(() => {
        if (!isValidCode(code)) {
            setError("That doesn't look like a game code. Codes have 6 digits.");
            setPhase('error');
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const m = await inspectRoom(code);
                if (cancelled) return;
                setMeta(m);
                if (m.status === 'ended') throw new RoomError('ended', 'That game has already finished.');

                // Same tab (refresh): rejoin silently
                const tab = getTabSession(code);
                if (tab?.playerId) {
                    await join({ resume: tab });
                    return;
                }
                // Same device, closed tab: offer to continue if that player is offline
                const device = getDeviceSession(code);
                if (device?.playerId) {
                    const { player: existing, now } = await getPlayer(code, device.playerId);
                    if (cancelled) return;
                    if (existing && !existing.kicked && !isOnline(existing, now)) {
                        setResumeCandidate({ ...device, name: existing.name });
                        setPhase('resume');
                        return;
                    }
                }
                setPhase('name');
            } catch (err) {
                if (!cancelled) fail(err);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [code, join]);

    if (phase === 'error') return <ErrorScreen message={error} />;

    if (phase === 'playing' && meta && player) {
        const game = getGame(meta.gameId);
        if (!game?.Player) return <ErrorScreen message="This game can't be played on this version of Orbit. Try refreshing the page." />;
        const Player = game.Player;
        return (
            <Suspense fallback={<SpaceScreen center><Spinner size={32} /></SpaceScreen>}>
                <Player code={code} playerId={player.playerId} name={player.name} onExit={() => navigate('/join')} />
            </Suspense>
        );
    }

    if (phase === 'checking' || phase === 'joining') {
        return (
            <SpaceScreen center>
                <Spinner size={36} className="text-emerald-400" />
                <p className="mt-4 text-gray-400 font-semibold">{phase === 'checking' ? 'Finding your game…' : 'Joining…'}</p>
            </SpaceScreen>
        );
    }

    const randomNames = !!meta?.settings?.randomNames;
    const gameName = getGame(meta?.gameId)?.name || 'Orbit';

    return (
        <SpaceScreen center>
            <div className="w-full max-w-sm text-center">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">{gameName}</p>
                <h1 className="text-2xl sm:text-3xl font-black mt-2 break-words">{meta?.setTitle}</h1>
                <p className="text-gray-400 text-sm mt-1">Game {code.slice(0, 3)} {code.slice(3)}{meta?.hostName ? ` · hosted by ${meta.hostName}` : ''}</p>

                {phase === 'resume' && resumeCandidate ? (
                    <div className="mt-8 space-y-3">
                        <p className="text-gray-300">Welcome back! Continue as <b className="text-white">{resumeCandidate.name}</b>?</p>
                        <button
                            onClick={() => { audio.unlock(); join({ resume: resumeCandidate }); }}
                            className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black text-lg transition-colors"
                        >
                            Continue as {resumeCandidate.name}
                        </button>
                        <button onClick={() => setPhase('name')} className="w-full py-3 rounded-2xl text-gray-300 hover:text-white hover:bg-white/5 font-bold transition-colors">
                            I'm someone else
                        </button>
                    </div>
                ) : randomNames ? (
                    <div className="mt-8 space-y-3">
                        <p className="text-gray-300 flex items-center justify-center gap-2"><Shuffle size={16} /> Your teacher gives everyone a fun random name.</p>
                        <button onClick={() => { audio.unlock(); join(); }} className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black text-lg transition-colors">
                            Join game
                        </button>
                    </div>
                ) : (
                    <form
                        className="mt-8 space-y-3"
                        onSubmit={e => {
                            e.preventDefault();
                            audio.unlock();
                            if (name.trim()) join({ nickname: name });
                        }}
                    >
                        <label htmlFor="nickname" className="block text-gray-300 font-semibold">Pick a nickname</label>
                        <input
                            id="nickname"
                            value={name}
                            onChange={e => { setName(e.target.value.slice(0, MAX_NAME)); setNameError(''); }}
                            aria-invalid={!!nameError}
                            aria-describedby={nameError ? 'nickname-error' : undefined}
                            autoFocus
                            autoComplete="off"
                            maxLength={MAX_NAME}
                            placeholder="Your nickname"
                            className={`w-full text-center text-xl font-bold bg-white/10 border-2 ${nameError ? 'border-rose-400' : 'border-white/15'} focus:border-emerald-400 rounded-2xl px-4 py-3.5 outline-none placeholder:text-white/40`}
                        />
                        {nameError && <p id="nickname-error" role="alert" className="text-sm font-semibold text-rose-300">{nameError}</p>}
                        <button type="submit" disabled={!name.trim()} className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-gray-950 font-black text-lg transition-colors">
                            Join game
                        </button>
                    </form>
                )}
            </div>
        </SpaceScreen>
    );
};

// Keyed by code: moving to a new room (teacher pressed "Play again") starts completely fresh
const Play = () => {
    const { code } = useParams();
    return <PlayRoom key={code} code={code} />;
};

export default Play;
