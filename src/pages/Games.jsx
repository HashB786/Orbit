import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, Play, Smartphone, Presentation, Check, RefreshCw, Ban } from 'lucide-react';
import PickSetModal from '../components/sets/PickSetModal';
import { TYPE_ICONS, cx } from '../components/ui';
import { GAMES } from '../platform/games/registry';
import { QUESTION_TYPES, TYPE_IDS } from '../platform/questions/types';

const SUPPORT_ICON = { native: Check, adapted: RefreshCw, unsupported: Ban };
const SUPPORT_TEXT = { native: 'text-emerald-600 dark:text-emerald-400', adapted: 'text-sky-600 dark:text-sky-400', unsupported: 'text-gray-400 line-through' };

const GameCard = ({ game, onHost }) => (
    <article className="bg-white dark:bg-dark-surface border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden flex flex-col">
        <div className={`h-24 bg-gradient-to-br ${game.accent} relative`}>
            <span className="absolute bottom-3 left-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/30 text-white text-xs font-bold">
                {game.kind === 'live' ? <Smartphone size={13} /> : <Presentation size={13} />}
                {game.kind === 'live' ? 'Live · join with code' : 'Smart board'}
            </span>
        </div>
        <div className="p-5 flex flex-col flex-1">
            <h3 className="text-xl font-extrabold">{game.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{game.tagline}</p>
            <ul className="mt-3 space-y-1.5 text-sm text-gray-500 dark:text-gray-400">
                {game.howItWorks.map(line => <li key={line} className="flex gap-2"><span className="text-primary-500">•</span><span>{line}</span></li>)}
            </ul>
            <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Question types</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                    {TYPE_IDS.map(t => {
                        const support = game.compat[t] || 'unsupported';
                        const Icon = SUPPORT_ICON[support];
                        const TIcon = TYPE_ICONS[t];
                        return (
                            <span key={t} className={cx('inline-flex items-center gap-1 text-xs font-semibold', SUPPORT_TEXT[support])} title={support === 'adapted' ? 'Converted' : support === 'native' ? 'Supported' : 'Not supported'}>
                                <TIcon size={13} /> {QUESTION_TYPES[t].short} <Icon size={11} />
                            </span>
                        );
                    })}
                </div>
            </div>
            <div className="flex-1" />
            <button onClick={() => onHost(game)} className="mt-5 w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                <Play size={18} className="fill-current" /> Host {game.name}
            </button>
        </div>
    </article>
);

const Games = () => {
    const navigate = useNavigate();
    const [picking, setPicking] = useState(null);
    const live = GAMES.filter(g => g.kind === 'live');
    const board = GAMES.filter(g => g.kind === 'board');

    return (
        <div className="space-y-8 md:pb-16">
            <header>
                <h1 className="text-3xl md:text-4xl font-extrabold flex items-center gap-3">
                    <Gamepad2 className="text-primary-500 shrink-0" size={32} /> Games
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Every game works with any question set. Pick one, then choose your set.</p>
            </header>

            <section>
                <h2 className="text-lg font-bold mb-1 flex items-center gap-2"><Smartphone size={18} className="text-primary-500" /> Live games</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Students join on their own phones or laptops with a code. No accounts.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {live.map(g => <GameCard key={g.id} game={g} onHost={setPicking} />)}
                </div>
            </section>

            <section>
                <h2 className="text-lg font-bold mb-1 flex items-center gap-2"><Presentation size={18} className="text-primary-500" /> Smart board games</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Played together on one big screen. Nothing to join.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {board.map(g => <GameCard key={g.id} game={g} onHost={setPicking} />)}
                </div>
            </section>

            <PickSetModal
                open={!!picking}
                onClose={() => setPicking(null)}
                title={picking ? `Pick a set for ${picking.name}` : ''}
                onPick={(set) => {
                    const gameId = picking.id;
                    setPicking(null);
                    navigate(`/host/${set.id}?game=${gameId}`);
                }}
            />
        </div>
    );
};

export default Games;
