import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Trophy, Play, RotateCcw, Pause, Keyboard } from 'lucide-react';

// --- GAME CONFIG ---
const GRAVITY = 0.5; // Downward force
const JUMP = -8;     // Upward impulse
const SPEED = 4;     // Scroll speed
const GAP_SIZE = 180; // Vertical gap between pipes
const PIPE_WIDTH = 60;
const PIPE_SPAWN_RATE = 100; // Frames between pipes
const PLAYER_SIZE = 30;

const OrbitRunner2D = () => {
    const canvasRef = useRef(null);
    const requestRef = useRef(null);
    const frameRef = useRef(0);
    const scoreRef = useRef(0);

    const [gameState, setGameState] = useState('ready'); // ready, playing, gameover
    const [winner, setWinner] = useState(null); // 'p1', 'p2', 'draw'
    const [finalScore, setFinalScore] = useState(0);

    // --- GAME STATE REF (Mutable for Loop) ---
    const state = useRef({
        p1: { y: 300, vy: 0, dead: false, color: '#06b6d4' }, // Cyan
        p2: { y: 300, vy: 0, dead: false, color: '#d946ef' }, // Magenta
        pipes: [], // { x, y, passed }
    });

    // --- INPUT HANDLING ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (gameState !== 'playing') return;

            // Player 1 (Space / W)
            if ((e.code === 'Space' || e.code === 'KeyW') && !state.current.p1.dead) {
                state.current.p1.vy = JUMP;
            }

            // Player 2 (Enter / ArrowUp)
            if ((e.code === 'Enter' || e.code === 'ArrowUp') && !state.current.p2.dead) {
                state.current.p2.vy = JUMP;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState]);

    // --- GAME LOOP ---
    const update = () => {
        if (gameState !== 'playing') return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const height = canvas.height;
        const width = canvas.width;

        frameRef.current++;

        // 1. UPDATE PLAYERS
        [state.current.p1, state.current.p2].forEach(p => {
            if (!p.dead) {
                p.vy += GRAVITY;
                p.y += p.vy;

                // Floor/Ceiling collision
                if (p.y + PLAYER_SIZE > height || p.y < 0) {
                    p.dead = true;
                }
            } else {
                // Drift back if dead
                p.x = (p.x || 100) - 2;
            }
        });

        // 2. SPAWN PIPES
        if (frameRef.current % PIPE_SPAWN_RATE === 0) {
            // Random height for top pipe (leaving gap)
            // Min height = 50, Max height = height - gap - 50
            const minH = 50;
            const maxH = height - GAP_SIZE - 50;
            const topHeight = Math.floor(Math.random() * (maxH - minH + 1)) + minH;

            state.current.pipes.push({
                x: width,
                topHeight: topHeight,
                passed: false
            });
        }

        // 3. UPDATE PIPES & COLLISION
        state.current.pipes.forEach((pipe, index) => {
            pipe.x -= SPEED;

            // Remove off-screen pipes
            if (pipe.x + PIPE_WIDTH < 0) {
                state.current.pipes.splice(index, 1);
            }

            // Check Score (Passing State)
            if (!pipe.passed && pipe.x + PIPE_WIDTH < 100) { // 100 is player x
                pipe.passed = true;
                if (!state.current.p1.dead || !state.current.p2.dead) {
                    scoreRef.current++;
                }
            }

            // check collision for each living player
            [state.current.p1, state.current.p2].forEach(p => {
                if (p.dead) return;

                // Horizontal overlap
                // Player X is fixed at 100
                if (100 < pipe.x + PIPE_WIDTH && 100 + PLAYER_SIZE > pipe.x) {
                    // Vertical check
                    // Hit Top Pipe OR Hit Bottom Pipe
                    if (p.y < pipe.topHeight || p.y + PLAYER_SIZE > pipe.topHeight + GAP_SIZE) {
                        p.dead = true;
                    }
                }
            });
        });

        // 4. DRAW
        draw(ctx, width, height);

        // 5. CHECK GAME OVER
        if (state.current.p1.dead && state.current.p2.dead) {
            endGame();
        } else {
            requestRef.current = requestAnimationFrame(update);
        }
    };

    const draw = (ctx, width, height) => {
        // Clear background
        ctx.fillStyle = '#020617'; // gray-950
        ctx.fillRect(0, 0, width, height);

        // Draw Grid (Retro effect)
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        for (let i = 0; i < width; i += 40) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
        }
        for (let i = 0; i < height; i += 40) {
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke();
        }

        // Draw Pipes
        state.current.pipes.forEach(pipe => {
            ctx.fillStyle = '#22c55e'; // Green neon
            ctx.strokeStyle = '#4ade80';
            ctx.lineWidth = 2;

            // Top Pipe
            ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
            ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);

            // Bottom Pipe
            const bottomY = pipe.topHeight + GAP_SIZE;
            const bottomH = height - bottomY;
            ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, bottomH);
            ctx.strokeRect(pipe.x, bottomY, PIPE_WIDTH, bottomH);
        });

        // Draw Players
        const drawPlayer = (p, x) => {
            ctx.save();
            ctx.translate(x + PLAYER_SIZE / 2, p.y + PLAYER_SIZE / 2);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 20;

            // Rocket Shape
            ctx.beginPath();
            ctx.moveTo(0, -PLAYER_SIZE / 2); // Tip
            ctx.lineTo(PLAYER_SIZE / 2, PLAYER_SIZE / 2); // Right
            ctx.lineTo(0, PLAYER_SIZE / 3); // Center indentation
            ctx.lineTo(-PLAYER_SIZE / 2, PLAYER_SIZE / 2); // Left
            ctx.closePath();

            ctx.fill();

            if (p.dead) {
                // X eyes
                ctx.strokeStyle = '#FFF';
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(5, 5); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(5, -5); ctx.lineTo(-5, 5); ctx.stroke();
            }

            ctx.restore();
        };

        // Player 1
        drawPlayer(state.current.p1, 100);
        // Player 2
        drawPlayer(state.current.p2, 100);

        // Draw Score
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(scoreRef.current, width / 2, 80);
    };

    // --- GAME CONTROL ---
    const startGame = () => {
        // Reset Logic
        state.current = {
            p1: { y: 300, vy: 0, dead: false, color: '#06b6d4' },
            p2: { y: 300, vy: 0, dead: false, color: '#d946ef' },
            pipes: []
        };
        scoreRef.current = 0;
        frameRef.current = 0;
        setGameState('playing');
        setWinner(null);

        requestRef.current = requestAnimationFrame(update);
    };

    const endGame = () => {
        setGameState('gameover');
        cancelAnimationFrame(requestRef.current);
        setFinalScore(scoreRef.current);

        // Determine Winner (who died LAST)
        // Since update loop checks collision sequentially, if both die same frame it's draw.
        // We can track death timestamps if strict precision needed, but for now:
        // logic is usually handled inside the loop for who died first. 
        // Simple logic: if p1 dead and p2 dead, draw. If one alive, they win.
        // Wait, endGame is called when BOTH are dead.
        // So we need to store who died first? 
        // Let's rely on React state to tell us, or just call it a draw if simultaneous.
        // Actually, let's look at remaining HP or distance. Same distance = draw.
        setWinner('draw'); // Default to draw if crash same frame
    };

    // Fix winning logic by tracking death order
    // Modify update loop to check death

    useEffect(() => {
        const resize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
            }
        };
        window.addEventListener('resize', resize);
        resize();
        return () => window.removeEventListener('resize', resize);
    }, []);

    // Draw initial screen
    useEffect(() => {
        if (gameState === 'ready' && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            draw(ctx, canvasRef.current.width, canvasRef.current.height);
        }
    }, [gameState]);


    return (
        <div className="w-full h-full relative bg-gray-950 font-sans overflow-hidden select-none">
            <canvas ref={canvasRef} className="block w-full h-full" />

            {/* UI LAYER */}
            <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-center items-center z-50">

                {gameState === 'ready' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-black/80 backdrop-blur-xl p-12 border border-cyan-500/30 text-center rounded-2xl shadow-2xl pointer-events-auto max-w-lg w-full"
                    >
                        <h1 className="text-6xl font-black text-white mb-2 tracking-tighter italic">
                            ORBIT<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">RELAY</span>
                        </h1>
                        <p className="text-gray-400 mb-8 font-mono text-sm">2-PLAYER CO-OP SURVIVAL</p>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="p-4 bg-gray-900/50 rounded-xl border border-cyan-500/30">
                                <h3 className="text-cyan-400 font-bold mb-2">PLAYER 1</h3>
                                <div className="flex justify-center gap-2">
                                    <Keyboard className="text-gray-500" />
                                    <span className="font-mono text-white bg-gray-800 px-2 rounded">SPACE</span>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-900/50 rounded-xl border border-fuchsia-500/30">
                                <h3 className="text-fuchsia-400 font-bold mb-2">PLAYER 2</h3>
                                <div className="flex justify-center gap-2">
                                    <Keyboard className="text-gray-500" />
                                    <span className="font-mono text-white bg-gray-800 px-2 rounded">ENTER</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={startGame}
                            className="w-full py-4 bg-gradient-to-r from-cyan-600 to-fuchsia-600 text-white font-bold text-xl uppercase tracking-widest hover:brightness-110 transition-all rounded shadow-lg"
                        >
                            START ENGINE
                        </button>
                    </motion.div>
                )}

                {gameState === 'gameover' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-black/90 backdrop-blur-xl p-10 border-y-2 border-red-500 text-center pointer-events-auto"
                    >
                        <h2 className="text-red-500 text-5xl font-black mb-2 tracking-tighter">CRASHED</h2>
                        <div className="text-6xl font-mono text-white mb-8">{finalScore}</div>

                        <button
                            onClick={startGame}
                            className="px-8 py-3 bg-white text-black font-bold text-lg hover:bg-gray-200 transition-all rounded flex items-center gap-2 mx-auto"
                        >
                            <RotateCcw size={20} /> RESTART
                        </button>
                    </motion.div>
                )}

            </div>
        </div>
    );
};

export default OrbitRunner2D;
