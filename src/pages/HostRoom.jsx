import React, { Suspense, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import SpaceScreen from '../components/SpaceScreen';
import { Spinner } from '../components/ui';
import { isRoomHost, isValidCode } from '../platform/rooms/rooms';
import { getGame } from '../platform/games/registry';

// The teacher's big-screen view of a live room
const HostRoom = () => {
    const { code } = useParams();
    const navigate = useNavigate();
    const [state, setState] = useState({ loading: true, meta: null, isHost: false, error: '' });

    useEffect(() => {
        if (!isValidCode(code)) {
            setState({ loading: false, meta: null, isHost: false, error: 'Invalid room code.' });
            return;
        }
        let cancelled = false;
        isRoomHost(code)
            .then(({ meta, isHost }) => !cancelled && setState({ loading: false, meta, isHost, error: meta ? '' : 'This room does not exist.' }))
            .catch(() => !cancelled && setState({ loading: false, meta: null, isHost: false, error: 'Could not connect. Check your internet connection.' }));
        return () => {
            cancelled = true;
        };
    }, [code]);

    if (state.loading) return <SpaceScreen center><Spinner size={36} className="text-emerald-400" /></SpaceScreen>;

    if (state.error || !state.isHost) {
        return (
            <SpaceScreen center>
                <div className="max-w-sm text-center">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-400/15 text-amber-300 flex items-center justify-center mb-4"><AlertTriangle size={28} /></div>
                    <p className="text-lg font-bold">{state.error || 'This screen belongs to the teacher who created the game.'}</p>
                    {!state.error && (
                        <Link to={`/play/${code}`} className="inline-block mt-6 px-6 py-3 rounded-2xl bg-emerald-500 text-gray-950 font-black">Join as a player instead</Link>
                    )}
                    <div><Link to="/" className="inline-block mt-4 text-sm font-semibold text-gray-400 hover:text-white">Orbit home</Link></div>
                </div>
            </SpaceScreen>
        );
    }

    const game = getGame(state.meta.gameId);
    if (!game?.Host) return <SpaceScreen center><p>Unknown game.</p></SpaceScreen>;
    const Host = game.Host;
    return (
        <Suspense fallback={<SpaceScreen center><Spinner size={36} className="text-emerald-400" /></SpaceScreen>}>
            <Host key={code} code={code} onExit={() => navigate('/games')} />
        </Suspense>
    );
};

export default HostRoom;
