import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Gamepad2, Play, Smartphone, Presentation, Check, RefreshCw, Ban } from 'lucide-react';
import PickSetModal from '../components/sets/PickSetModal';
import GameArt from '../components/art/GameArt';
import { TYPE_ICONS, PageHeader, cx } from '../components/ui';
import { GAMES, getGame } from '../platform/games/registry';
import { QUESTION_TYPES, TYPE_IDS } from '../platform/questions/types';

const SUPPORT_ICON = { native: Check, adapted: RefreshCw, unsupported: Ban };
const SUPPORT_TEXT = { native: 'text-emerald-600 dark:text-emerald-300', adapted: 'text-sky-600 dark:text-sky-300', unsupported: 'text-gray-400 dark:text-gray-500 line-through' };

// `wide`: a section's only game gets a big side-by-side card instead of a lonely column
const GameCard = ({ game, onHost, wide = false }) => (
    <article className={cx('orbit-card orbit-card-hover overflow-hidden flex flex-col group', wide && 'md:col-span-full lg:flex-row')}>
        <div className={cx('relative aspect-[16/9] overflow-hidden', wide && 'lg:aspect-auto lg:w-[55%] lg:min-h-[22rem] shrink-0')}>
            <GameArt gameId={game.id} title={`${game.name} illustration`} className="absolute inset-0 w-full h-full group-hover:scale-[1.03] transition-transform duration-500" />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
            <span className="absolute bottom-3 left-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/45 border border-white/15 text-white text-xs font-bold">
                {game.kind === 'live' ? <Smartphone size={13} /> : <Presentation size={13} />}
                {game.kind === 'live' ? 'Live · join with code' : 'Smart board'}
            </span>
        </div>
        <div className={cx('p-5 flex flex-col flex-1', wide && 'lg:p-7')}>
            <h3 className={cx('font-display font-bold text-gray-900 dark:text-white', wide ? 'text-2xl lg:text-3xl' : 'text-2xl')}>{game.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{game.tagline}</p>
            <ul className="mt-3 space-y-1.5 text-sm text-gray-500 dark:text-gray-400">
                {game.howItWorks.map(line => (
                    <li key={line} className="flex gap-2">
                        <span className="mt-2 w-1.5 h-1.5 shrink-0 rounded-full bg-primary-400 shadow-[0_0_6px_rgb(var(--color-primary-400))]" />
                        <span>{line}</span>
                    </li>
                ))}
            </ul>
            <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Question types</p>
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
            <button
                onClick={() => onHost(game)}
                className="mt-5 w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-white bg-gradient-to-b from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 shadow-[0_10px_24px_-12px_rgb(var(--color-primary-500))] transition-colors"
            >
                <Play size={18} className="fill-current" /> Host {game.name}
            </button>
        </div>
    </article>
);

const Games = () => {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const [picking, setPicking] = useState(() => getGame(params.get('host')));
    const live = GAMES.filter(g => g.kind === 'live');
    const board = GAMES.filter(g => g.kind === 'board');

    const closePicker = () => {
        setPicking(null);
        if (params.has('host')) setParams({}, { replace: true });
    };

    return (
        <div className="space-y-10 md:pb-16">
            <PageHeader icon={Gamepad2} title="Games" subtitle="Every game works with any question set. Pick one, then choose your set." />

            <section>
                <h2 className="font-display text-xl font-bold mb-1 flex items-center gap-2 text-gray-900 dark:text-white"><Smartphone size={19} className="text-primary-500" /> Live games</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Students join on their own phones or laptops with a code. No accounts.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {live.map(g => <GameCard key={g.id} game={g} onHost={setPicking} wide={live.length === 1} />)}
                </div>
            </section>

            <section>
                <h2 className="font-display text-xl font-bold mb-1 flex items-center gap-2 text-gray-900 dark:text-white"><Presentation size={19} className="text-primary-500" /> Smart board games</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Played together on one big screen. Nothing to join.</p>
                <div className={cx('grid grid-cols-1 md:grid-cols-2 gap-4', board.length > 2 && 'xl:grid-cols-3')}>
                    {board.map(g => <GameCard key={g.id} game={g} onHost={setPicking} wide={board.length === 1} />)}
                </div>
            </section>

            <PickSetModal
                open={!!picking}
                onClose={closePicker}
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
