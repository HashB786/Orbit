import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { motion } from 'framer-motion';
import { Rocket, Gamepad2, Play, Grid as GridIcon } from 'lucide-react';

import GridBattle from '../components/games/grid/GridBattle';
import OrbitRunner2D from '../components/games/arcade/OrbitRunner2D';

const Games = () => {
    const { t } = useLanguage();
    const [activeGame, setActiveGame] = useState(null);

    const games = [
        {
            id: 'orbit-duo',
            title: 'Orbit Duo',
            description: '2-Player Co-op. Touch or Keys. Fly together!',
            icon: Rocket,
            color: 'from-cyan-500 to-fuchsia-500',
            component: OrbitRunner2D
        },
        {
            id: 'grid-battle',
            title: 'Grid Battle',
            description: 'The ultimate classroom quiz showdown! Teams, bombs, and glory.',
            icon: GridIcon,
            color: 'from-blue-600 to-indigo-600',
            component: GridBattle
        }
    ];

    if (activeGame) {
        const GameComponent = activeGame.component;
        return (
            <div className="absolute inset-0 z-[100] bg-gray-950 flex flex-col">
                <button
                    onClick={() => setActiveGame(null)}
                    className="absolute top-4 right-4 z-50 bg-white/10 backdrop-blur text-white px-4 py-2 rounded-xl font-bold hover:bg-white/20 hover:text-red-400 transition-all flex items-center gap-2"
                >
                    <span className="text-xl">&times;</span> Exit to Orbit
                </button>
                <GameComponent />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-teal-500 flex items-center gap-3">
                    <Gamepad2 className="text-primary-500" size={32} /> {t('games') || 'Games'}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Take a break and recharge.</p>
            </div>

            {/* Games Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {games.map((game, idx) => (
                    <motion.div
                        key={game.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="group relative overflow-hidden rounded-2xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-300"
                    >
                        {/* Background Gradient */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

                        <div className="p-6 relative z-10">
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${game.color} flex items-center justify-center text-white mb-4 shadow-lg`}>
                                <game.icon size={28} />
                            </div>

                            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{game.title}</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 h-10">{game.description}</p>

                            <button
                                onClick={() => setActiveGame(game)}
                                className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold flex items-center justify-center gap-2 group-hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                <Play size={18} className="fill-current" /> Play Now
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default Games;
