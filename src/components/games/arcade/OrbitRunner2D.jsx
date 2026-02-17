import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Keyboard, MousePointer2 } from 'lucide-react';

// --- GAME CONFIG ---
const GRAVITY = 0.5;
const JUMP = -8;
const SPEED = 4;
const GAP_SIZE = 180;
const PIPE_WIDTH = 60;
const PIPE_SPAWN_RATE = 100;
const PLAYER_SIZE = 30;

const OrbitRunner2D = () => {
    const canvasRef = useRef(null);
    const requestRef = useRef(null);
    const frameRef = useRef(0);
    const scoreRef = useRef(0);

    const [gameState, setGameState] = useState('ready'); // ready, playing, gameover
    const [finalScore, setFinalScore] = useState(0);

    // --- GAME STATE REF (Mutable for Loop) ---
    const state = useRef({
        p1: { y: 300, vy: 0, dead: false, color: '#06b6d4' }, // Cyan
        p2: { y: 300, vy: 0, dead: false, color: '#d946ef' }, // Magenta
        pipes: [],
    });

    // --- INPUT HANDLING (Universal) ---
    useEffect(() => {
        const handleInput = (type, code) => {
            if (gameState !== 'playing') return;

            // Player 1
            if ((code === 'Space' || code === 'KeyW' || type === 'left-tap') && !state.current.p1.dead) {
                state.current.p1.vy = JUMP;
            }

            // Player 2
            if ((code === 'Enter' || code === 'ArrowUp' || type === 'right-tap') && !state.current.p2.dead) {
                state.current.p2.vy = JUMP;
            }
        };

        const handleKeyDown = (e) => handleInput('key', e.code);

        const handleTouch = (e) => {
            // Prevent default zooming/scrolling on touch
            // e.preventDefault(); // Sometimes interferes with UI outside canvas, be careful

            const width = window.innerWidth;
            // Handle multi-touch
            for (let i = 0; i < e.touches.length; i++) {
                const touchX = e.touches[i].clientX;
                if (touchX < width / 2) handleInput('left-tap');
                else handleInput('right-tap');
            }
        };

        const handleMouseDown = (e) => {
            const width = window.innerWidth;
            if (e.clientX < width / 2) handleInput('left-tap');
            else handleInput('right-tap');
        };

        window.addEventListener('keydown', handleKeyDown);
        // Add listeners to window or canvas? Window ensures catches all.
        // But might conflict with UI buttons. 
        // Logic: if input target is NOT a button, process it.

        // Touch/Mouse logic needs to be careful not to trigger if clicking a UI button
        // We'll attach these to the canvas container or window but check target.

        // Actually, attaching to window is best for "play anywhere" feel on smart boards.
        // We just need to check if e.target is a button.

        const safeInput = (handler) => (e) => {
            if (e.target.closest('button')) return; // Ignore button clicks
            handler(e);
        };

        window.addEventListener('touchstart', safeInput(handleTouch), { passive: false });
        window.addEventListener('mousedown', safeInput(handleMouseDown));

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('touchstart', safeInput(handleTouch));
            window.removeEventListener('mousedown', safeInput(handleMouseDown));
        };
    }, [gameState]);


    // --- GAME LOOP ---
    const update = () => {
        if (gameState !== 'playing') return;

        const canvas = canvasRef.current;
        if (!canvas) return;
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
                p.x = (p.x || 100) - 2; // Drift back
            }
        });

        // 2. SPAWN PIPES
        if (frameRef.current % PIPE_SPAWN_RATE === 0) {
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

            if (pipe.x + PIPE_WIDTH < 0) {
                state.current.pipes.splice(index, 1);
            }

            // Score logic
            if (!pipe.passed && pipe.x + PIPE_WIDTH < 100) {
                pipe.passed = true;
                if (!state.current.p1.dead || !state.current.p2.dead) {
                    scoreRef.current++;
                }
            }

            // Collision
            [state.current.p1, state.current.p2].forEach(p => {
                if (p.dead) return;
                if (100 < pipe.x + PIPE_WIDTH && 100 + PLAYER_SIZE > pipe.x) {
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
        // Clear
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, width, height);

        // Split Screen Line (Subtle)
        ctx.strokeStyle = '#1e293b';
        ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.moveTo(width / 2, 0); ctx.lineTo(width / 2, height); ctx.stroke();
        ctx.setLineDash([]);

        // Grid
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        for (let i = 0; i < width; i += 40) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
        }
        for (let i = 0; i < height; i += 40) {
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke();
        }

        // Zones Labels (Only if Playing and early game)
        if (scoreRef.current < 2) {
            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#1e293b';
            ctx.fillText("TAP LEFT (P1)", width * 0.25, height - 50);
            ctx.fillText("TAP RIGHT (P2)", width * 0.75, height - 50);
        }

        // Draw Pipes
        state.current.pipes.forEach(pipe => {
            ctx.fillStyle = '#22c55e';
            ctx.strokeStyle = '#4ade80';
            ctx.lineWidth = 2;

            // Top
            ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
            ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);

            // Bottom
            const bottomY = pipe.topHeight + GAP_SIZE;
            ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, height - bottomY);
            ctx.strokeRect(pipe.x, bottomY, PIPE_WIDTH, height - bottomY);
        });

        // Draw Players
        const drawPlayer = (p, x) => {
            ctx.save();
            ctx.translate(x + PLAYER_SIZE / 2, p.y + PLAYER_SIZE / 2);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 20;

            if (p.dead) ctx.globalAlpha = 0.5;

            ctx.beginPath();
            ctx.moveTo(0, -PLAYER_SIZE / 2);
            ctx.lineTo(PLAYER_SIZE / 2, PLAYER_SIZE / 2);
            ctx.lineTo(0, PLAYER_SIZE / 3);
            ctx.lineTo(-PLAYER_SIZE / 2, PLAYER_SIZE / 2);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        };

        drawPlayer(state.current.p1, 100);
        drawPlayer(state.current.p2, 100);

        // Score
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(scoreRef.current, width / 2, 80);
    };

    const startGame = () => {
        state.current = {
            p1: { y: 300, vy: 0, dead: false, color: '#06b6d4' },
            p2: { y: 300, vy: 0, dead: false, color: '#d946ef' },
            pipes: []
        };
        scoreRef.current = 0;
        frameRef.current = 0;
        setGameState('playing');
        requestRef.current = requestAnimationFrame(update);
    };

    const endGame = () => {
        setGameState('gameover');
        cancelAnimationFrame(requestRef.current);
        setFinalScore(scoreRef.current);
    };

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

    // Initial Draw
    useEffect(() => {
        if (gameState === 'ready' && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) draw(ctx, canvasRef.current.width, canvasRef.current.height);
        }
    }, [gameState]);

    return (
        <div className="w-full h-full relative bg-gray-950 font-sans overflow-hidden select-none touch-none">
            <canvas ref={canvasRef} className="block w-full h-full" />

            {/* UI LAYER */}
            <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-center items-center z-50">
                {gameState === 'ready' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-black/80 backdrop-blur-xl p-8 md:p-12 border border-cyan-500/30 text-center rounded-2xl shadow-2xl pointer-events-auto max-w-lg w-full"
                    >
                        <h1 className="text-5xl md:text-6xl font-black text-white mb-2 tracking-tighter italic">
                            ORBIT<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">DUO</span>
                        </h1>
                        <p className="text-gray-400 mb-8 font-mono text-sm">UNIVERSAL 2-PLAYER CO-OP</p>

                        <div className="grid grid-cols-2 gap-4 mb-8 text-sm md:text-base">
                            <div className="p-4 bg-gray-900/50 rounded-xl border border-cyan-500/30 flex flex-col items-center gap-2">
                                <h3 className="text-cyan-400 font-bold">PLAYER 1</h3>
                                <div className="flex items-center gap-2 text-gray-400">
                                    <MousePointer2 size={16} className="-scale-x-100" />
                                    <span>LEFT TAP</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-500 text-xs">
                                    <Keyboard size={14} /> SPACE / W
                                </div>
                            </div>
                            <div className="p-4 bg-gray-900/50 rounded-xl border border-fuchsia-500/30 flex flex-col items-center gap-2">
                                <h3 className="text-fuchsia-400 font-bold">PLAYER 2</h3>
                                <div className="flex items-center gap-2 text-gray-400">
                                    <span>RIGHT TAP</span>
                                    <MousePointer2 size={16} />
                                </div>
                                <div className="flex items-center gap-2 text-gray-500 text-xs">
                                    <Keyboard size={14} /> ENTER / UP
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
                        <h2 className="text-red-500 text-4xl md:text-5xl font-black mb-2 tracking-tighter">MISSION FAILED</h2>
                        <div className="text-6xl font-mono text-white mb-8">{finalScore}</div>

                        <button
                            onClick={startGame}
                            className="px-8 py-3 bg-white text-black font-bold text-lg hover:bg-gray-200 transition-all rounded flex items-center gap-2 mx-auto"
                        >
                            <RotateCcw size={20} /> RESTART MISSION
                        </button>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default OrbitRunner2D;
