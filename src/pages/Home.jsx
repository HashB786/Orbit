import React from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, PenSquare, Compass, ChevronRight, Info, Smartphone, Presentation, Sparkles } from 'lucide-react';
import { useUser } from '../context/UserContext';
import JoinCodeForm from '../components/JoinCodeForm';
import SetCard, { HostButton } from '../components/sets/SetCard';
import HeroArt from '../components/art/HeroArt';
import GameArt from '../components/art/GameArt';
import { IconOrb } from '../components/ui';
import { FEATURED_SETS } from '../platform/sets/featured';
import { useMySets } from '../platform/sets/store';
import { realtimeMode } from '../platform/realtime';
import { GAMES } from '../platform/games/registry';

const SectionTitle = ({ title, to, linkLabel }) => (
    <div className="flex items-end justify-between mb-3">
        <h2 className="font-display text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
        {to && <Link to={to} className="text-sm font-semibold text-primary-600 dark:text-primary-300 hover:underline">{linkLabel}</Link>}
    </div>
);

// Deep-space panel used for the hero in both themes
const HERO_BG = {
    backgroundColor: '#070b24',
    backgroundImage: [
        'radial-gradient(ellipse 70% 60% at 85% 20%, rgb(var(--color-primary-500) / 0.28), transparent 65%)',
        'radial-gradient(ellipse 60% 60% at 0% 100%, rgba(124, 58, 237, 0.35), transparent 65%)',
        'radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.8), transparent)',
        'radial-gradient(1px 1px at 110px 140px, rgba(255,255,255,0.5), transparent)',
        'radial-gradient(1.5px 1.5px at 180px 70px, rgba(199,210,254,0.8), transparent)'
    ].join(','),
    backgroundSize: '100% 100%, 100% 100%, 220px 220px, 220px 220px, 220px 220px'
};

const Home = () => {
    const { userData } = useUser();
    const mySets = useMySets();

    const actions = [
        { to: '/games', icon: Gamepad2, tone: 'primary', title: 'Host a game', text: 'Pick a game, tune the settings, share the code.' },
        { to: '/create/new', icon: PenSquare, tone: 'sky', title: 'Create a set', text: 'Write questions, or paste them from ChatGPT.' },
        { to: '/discover', icon: Compass, tone: 'violet', title: 'Discover sets', text: 'Search sets other teachers have shared.' }
    ];

    return (
        <div className="space-y-9 md:space-y-12 md:pb-16">
            {/* Join hero */}
            <section className="relative overflow-hidden rounded-[2rem] border border-white/10 text-white shadow-[0_30px_60px_-30px_rgba(5,8,22,0.8)]" style={HERO_BG}>
                <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] items-center">
                    <div className="relative z-10 p-6 sm:p-8 md:p-12">
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-sm font-semibold text-primary-100">
                            <span className="w-2 h-2 rounded-full bg-primary-400 shadow-[0_0_8px_rgb(var(--color-primary-400))]" />
                            {userData.name ? `Hi ${userData.name}!` : 'Welcome aboard Orbit'}
                        </span>
                        <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-6xl tracking-tight mt-4 leading-[1.05]">
                            Join a <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-300 via-sky-300 to-violet-300">game</span>
                        </h1>
                        <p className="text-indigo-100/80 mt-3 mb-6 max-w-md">Type the code on your teacher's screen and launch in. No account needed.</p>
                        <JoinCodeForm />
                    </div>
                    <div className="hidden md:block relative h-full min-h-[20rem]">
                        <HeroArt className="absolute inset-0 w-full h-full" />
                    </div>
                </div>
                {/* Small planet for phones, where the big illustration is hidden */}
                <HeroArt className="md:hidden absolute -top-10 -right-16 w-52 opacity-60 pointer-events-none" />
            </section>

            {realtimeMode === 'local' && (
                <div className="flex gap-3 items-start rounded-2xl border border-amber-300/60 dark:border-amber-400/20 bg-amber-50 dark:bg-amber-400/[0.07] px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                    <Info size={18} className="shrink-0 mt-0.5" />
                    <p><b>Offline test mode.</b> Live games only connect tabs in this browser until Firebase is set up (see README). Open a second tab to join as a student.</p>
                </div>
            )}

            {/* Teacher actions */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                {actions.map(a => (
                    <Link key={a.to} to={a.to} className="group orbit-card orbit-card-hover p-5 flex sm:flex-col gap-4">
                        <IconOrb icon={a.icon} tone={a.tone} size={50} />
                        <span className="min-w-0">
                            <span className="font-display text-lg font-bold text-gray-900 dark:text-white flex items-center gap-1">
                                {a.title} <ChevronRight size={17} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                            </span>
                            <span className="block text-sm text-gray-500 dark:text-gray-400 mt-0.5">{a.text}</span>
                        </span>
                    </Link>
                ))}
            </section>

            {/* Games */}
            <section>
                <SectionTitle title="Games" to="/games" linkLabel="See all" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                    {GAMES.map(g => (
                        <Link key={g.id} to={`/games?host=${g.id}`} className="group orbit-card orbit-card-hover overflow-hidden flex flex-col min-w-0">
                            <div className="relative aspect-[16/8] overflow-hidden">
                                <GameArt gameId={g.id} className="absolute inset-0 w-full h-full group-hover:scale-[1.04] transition-transform duration-500" />
                            </div>
                            <div className="p-4 flex items-center justify-between gap-3">
                                <span className="min-w-0">
                                    <span className="block font-display font-bold text-gray-900 dark:text-white truncate">{g.name}</span>
                                    <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {g.kind === 'live' ? <Smartphone size={13} /> : <Presentation size={13} />}
                                        {g.kind === 'live' ? 'Live · students join with a code' : 'Smart board · one screen'}
                                    </span>
                                </span>
                                <ChevronRight size={18} className="shrink-0 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-0.5 transition" />
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {mySets.length > 0 && (
                <section>
                    <SectionTitle title="Your sets" to="/create" linkLabel="All sets" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {mySets.slice(0, 4).map(set => (
                            <SetCard key={set.id} set={set} to={`/set/${set.id}`} badge={set.visibility === 'public' ? 'public' : 'private'} actions={<HostButton setId={set.id} />} />
                        ))}
                    </div>
                </section>
            )}

            <section>
                <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={18} className="text-amber-400" />
                    <h2 className="font-display text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Featured sets</h2>
                </div>
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
