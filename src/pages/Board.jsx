import React, { Suspense } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { X } from 'lucide-react';
import SpaceScreen from '../components/SpaceScreen';
import { Spinner } from '../components/ui';
import { getGame } from '../platform/games/registry';
import { loadBoardSession } from '../platform/games/boardSession';

// Smart-board games: full screen, one device, no room code
const Board = () => {
    const { gameId } = useParams();
    const navigate = useNavigate();
    const session = loadBoardSession();
    const game = getGame(gameId);

    if (!game?.Board || !session || session.gameId !== gameId) {
        return (
            <SpaceScreen center>
                <div className="max-w-sm text-center">
                    <p className="text-lg font-bold">This board game isn't set up yet.</p>
                    <Link to="/games" className="inline-block mt-6 px-6 py-3 rounded-2xl bg-emerald-500 text-gray-950 font-black">Choose a game</Link>
                </div>
            </SpaceScreen>
        );
    }

    const exit = () => navigate(session.setId ? `/set/${session.setId}` : '/games');
    const GameBoard = game.Board;

    return (
        <div className="app-height w-full relative overflow-y-auto overflow-x-hidden bg-gray-950">
            <Suspense fallback={<SpaceScreen center><Spinner size={36} className="text-emerald-400" /></SpaceScreen>}>
                <GameBoard questions={session.set.questions} title={session.set.title} settings={session.settings} onExit={exit} />
            </Suspense>
            <button
                onClick={exit}
                aria-label="Exit game"
                className="fixed top-3 right-3 z-[110] bg-black/40 backdrop-blur text-white w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-xl font-bold hover:bg-white/20 hover:text-red-300 transition-colors flex items-center justify-center gap-2"
            >
                <X size={18} /> <span className="hidden sm:inline">Exit</span>
            </button>
        </div>
    );
};

export default Board;
