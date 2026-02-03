import React from 'react';
import { Html, useProgress } from '@react-three/drei';

const GameLoader = () => {
    const { progress } = useProgress();

    return (
        <Html center>
            <div className="flex flex-col items-center justify-center w-64 bg-black/80 p-6 rounded-2xl border border-cyan-500/30 backdrop-blur-xl shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                <h3 className="text-cyan-400 font-mono text-xl mb-4 tracking-widest animate-pulse">INITIALIZING</h3>

                <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                    <div
                        className="h-full bg-cyan-500 shadow-[0_0_10px_#06b6d4] transition-all duration-200"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="mt-2 flex justify-between w-full font-mono text-xs text-cyan-700">
                    <span>ASSETS</span>
                    <span>{progress.toFixed(0)}%</span>
                </div>
            </div>
        </Html>
    );
};

export default GameLoader;
