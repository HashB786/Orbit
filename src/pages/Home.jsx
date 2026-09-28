import React from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, PenSquare, Compass, ChevronRight, Info } from 'lucide-react';
import { useUser } from '../context/UserContext';
import JoinCodeForm from '../components/JoinCodeForm';
import SetCard, { HostButton } from '../components/sets/SetCard';
import { FEATURED_SETS } from '../platform/sets/featured';
import { useMySets } from '../platform/sets/store';
import { realtimeMode } from '../platform/realtime';
import { GAMES } from '../platform/games/registry';

const Home = () => {
    const { userData } = useUser();
    const mySets = useMySets();

    const actions = [
        { to: '/games', icon: Gamepad2, title: 'Host a game', text: 'Pick a game, tune the settings, share the code.', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' },
        { to: '/create/new', icon: PenSquare, title: 'Create a set', text: 'Multiple choice, written, true/false, order…', color: 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400' },
        { to: '/discover', icon: Compass, title: 'Discover sets', text: 'Search sets other teachers have shared.', color: 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400' }
    ];

    return (
        <div className="space-y-8 md:space-y-10 md:pb-16">
            {/* Join hero */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-600 to-teal-500 p-6 md:p-10 text-white shadow-xl">
                <div className="relative z-10 max-w-2xl">
                    <p className="text-primary-100 font-semibold">{userData.name ? `Hi ${userData.name}!` : 'Welcome to Orbit'}</p>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight mt-1">Join a game</h1>
                    <p className="text-primary-50/90 mt-2 mb-5">Enter the code on your teacher's screen. No account needed.</p>
                    <JoinCodeForm />
                </div>
                <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full border-[18px] border-white/10" aria-hidden />
                <div className="absolute top-10 right-10 w-10 h-10 rounded-full bg-amber-200/80 hidden md:block" aria-hidden />
            </section>

            {realtimeMode === 'local' && (
                <div className="flex gap-3 items-start rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                    <Info size={18} className="shrink-0 mt-0.5" />
                    <p><b>Offline test mode.</b> Live games only connect tabs in this browser until Firebase is set up (see README). Open a second tab to join as a student.</p>
                </div>
            )}

            {/* Teacher actions */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                {actions.map(a => (
                    <Link key={a.to} to={a.to} className="group bg-white dark:bg-dark-surface border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex sm:flex-col gap-4">
                        <span className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center ${a.color}`}><a.icon size={24} /></span>
                        <span className="min-w-0">
                            <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1">{a.title} <ChevronRight size={16} className="text-gray-300 group-hover:translate-x-0.5 transition-transform" /></span>
                            <span className="block text-sm text-gray-500 dark:text-gray-400 mt-0.5">{a.text}</span>
                        </span>
                    </Link>
                ))}
            </section>

            {/* Games strip */}
            <section>
                <div className="flex items-end justify-between mb-3">
                    <h2 className="text-xl font-bold">Games</h2>
                    <Link to="/games" className="text-sm font-semibold text-primary-600 dark:text-primary-400">See all</Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {GAMES.map(g => (
                        <Link key={g.id} to="/games" className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow min-w-0">
                            <span className={`w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br ${g.accent}`} aria-hidden />
                            <span className="min-w-0">
                                <span className="block font-bold truncate">{g.name}</span>
                                <span className="block text-xs text-gray-500 dark:text-gray-400">{g.kind === 'live' ? 'Live · students join with a code' : 'Smart board · one screen'}</span>
                            </span>
                        </Link>
                    ))}
                </div>
            </section>

            {mySets.length > 0 && (
                <section>
                    <div className="flex items-end justify-between mb-3">
                        <h2 className="text-xl font-bold">Your sets</h2>
                        <Link to="/create" className="text-sm font-semibold text-primary-600 dark:text-primary-400">All sets</Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {mySets.slice(0, 4).map(set => (
                            <SetCard key={set.id} set={set} to={`/set/${set.id}`} badge={set.visibility === 'public' ? 'public' : 'private'} actions={<HostButton setId={set.id} />} />
                        ))}
                    </div>
                </section>
            )}

            <section>
                <h2 className="text-xl font-bold mb-3">Featured sets</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {FEATURED_SETS.map(set => (
                        <SetCard key={set.id} set={set} to={`/set/${set.id}`} badge="featured" actions={<HostButton setId={set.id} />} />
                    ))}
                </div>
            </section>
        </div>
    );
};

export default Home;
