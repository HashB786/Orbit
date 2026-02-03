import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Trail, PerspectiveCamera, Sparkles, Float, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Play, RotateCcw, Zap, AlertTriangle } from 'lucide-react';
import GameLoader from './GameLoader';

// --- GAME CONFIG v4 (HYPER) ---
const CONFIG = {
    BASE_SPEED: 50,
    HYPER_SPEED: 180,
    GRAVITY: 2.0,
    JUMP_FORCE: 20,
    SPEED_INC: 0.8,
    TERMINAL_VELOC: -30,
    OBSTACLE_SPAWN_DIST: 200,
    OBSTACLE_GAP: 40,
    FLUX_PER_ORB: 15,
    FLUX_DRAIN: 25,
};

// --- HELPERS ---
const randomRange = (min, max) => Math.random() * (max - min) + min;

// 1. The Player Ship (Visual Only - Controlled by GameWorld)
const Ship = React.forwardRef(({ isHyper }, ref) => {
    return (
        <group ref={ref}>
            <Trail width={isHyper ? 8 : 3} length={isHyper ? 20 : 8} color={isHyper ? "#ff00ff" : "#00ffff"} attenuation={(t) => t * t}>
                <group rotation={[0, Math.PI, 0]}>
                    <mesh castShadow receiveShadow>
                        <coneGeometry args={[0.7, 3, 6]} />
                        <meshStandardMaterial color={isHyper ? "#d946ef" : "#3b82f6"} roughness={0.3} metalness={0.8} />
                    </mesh>
                    <mesh position={[0, 0.5, 0.5]}>
                        <boxGeometry args={[0.6, 1.2, 0.8]} />
                        <meshStandardMaterial color={isHyper ? "#f0abfc" : "#60a5fa"} emissive={isHyper ? "#d946ef" : "#3b82f6"} emissiveIntensity={0.5} />
                    </mesh>
                    <pointLight position={[0, 0, 2]} color={isHyper ? "magenta" : "cyan"} distance={5} intensity={5} />
                </group>
            </Trail>
        </group>
    );
});

// 2. Advanced Obstacles & Collectibles
const Entity = ({ z, type, y, rotSpeed, isHyper }) => {
    const meshRef = useRef();

    // Animate rotation (Visual only, safe for useFrame)
    useFrame((state, delta) => {
        if (!meshRef.current) return;

        if (type === 'orb') {
            meshRef.current.position.y = y + Math.sin(state.clock.elapsedTime * 5) * 0.5;
            meshRef.current.rotation.y += delta * 2;
        } else {
            meshRef.current.rotation.x += rotSpeed * delta;
            meshRef.current.rotation.y += rotSpeed * delta;
        }
    });

    return (
        <group position={[0, y, z]}>
            {/* Energy Orb */}
            {type === 'orb' && (
                <group ref={meshRef}>
                    <mesh>
                        <octahedronGeometry args={[0.8, 0]} />
                        <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={3} />
                    </mesh>
                    <pointLight color="yellow" distance={8} intensity={2} />
                    <Sparkles count={5} scale={3} size={2} color="yellow" />
                </group>
            )}

            {/* Asteroid */}
            {type === 'asteroid' && (
                <Float speed={2} rotationIntensity={1} floatIntensity={1}>
                    <mesh ref={meshRef} castShadow receiveShadow scale={isHyper ? 0 : 1}>
                        <dodecahedronGeometry args={[2.5, 0]} />
                        <meshStandardMaterial color="#78350f" roughness={0.8} />
                    </mesh>
                    {/* Hyper Mode Ghost Visual */}
                    {isHyper && (
                        <mesh ref={meshRef} scale={0.9}>
                            <dodecahedronGeometry args={[2.5, 0]} />
                            <meshBasicMaterial color="#ef4444" wireframe transparent opacity={0.2} />
                        </mesh>
                    )}
                </Float>
            )}

            {/* Scanning Gate */}
            {type === 'gate' && (
                <group rotation={[0, 0, Math.PI / 2]}>
                    <mesh ref={meshRef}>
                        <boxGeometry args={[16, 1, 1]} />
                        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
                    </mesh>
                </group>
            )}

            {/* Mines */}
            {type === 'mine' && (
                <Float speed={4} floatIntensity={2}>
                    <mesh ref={meshRef}>
                        <icosahedronGeometry args={[1.2, 0]} />
                        <meshStandardMaterial color="#333" roughness={0.2} metalness={1} />
                    </mesh>
                    <pointLight color="red" distance={3} intensity={5} animate={{ intensity: [0, 5, 0] }} />
                </Float>
            )}
        </group>
    );
};

// 3. Combined Game World + Logic Component
const GameWorld = ({ gameState, setGameState, setScore, setFlux, flux, isHyper, setIsHyper }) => {
    const shipRef = useRef();
    const shipY = useRef(0);
    const velocity = useRef(0);
    const speedRef = useRef(CONFIG.BASE_SPEED);
    const entitiesRef = useRef([]);
    const [entities, setEntities] = useState([]); // This update is throttleable/ok

    // Main Loop
    useFrame((state, delta) => {
        if (gameState !== 'playing') {
            // Idle visual
            if (shipRef.current) {
                shipRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.5;
                shipRef.current.rotation.x = 0;
            }
            return;
        }

        const dt = Math.min(delta, 0.1);

        // --- UPDATE PHYSICS ---
        if (isHyper) {
            speedRef.current = THREE.MathUtils.lerp(speedRef.current, CONFIG.HYPER_SPEED, dt * 2);
            setFlux(prev => {
                const next = prev - CONFIG.FLUX_DRAIN * dt;
                if (next <= 0) { setIsHyper(false); return 0; }
                return next;
            });
            velocity.current = THREE.MathUtils.lerp(velocity.current, 0, dt * 5);
            shipY.current = THREE.MathUtils.lerp(shipY.current, 0, dt * 5);
        } else {
            speedRef.current += CONFIG.SPEED_INC * dt;
            velocity.current -= CONFIG.GRAVITY * 60 * dt;
            if (velocity.current < CONFIG.TERMINAL_VELOC) velocity.current = CONFIG.TERMINAL_VELOC;
            shipY.current += velocity.current * dt;
        }

        // Bounds
        if (shipY.current < -14 || shipY.current > 14) {
            if (!isHyper) setGameState('gameover');
        }

        // --- UPDATE VISUALS DIRECTLY (NO STATE LIFTING) ---
        if (shipRef.current) {
            shipRef.current.position.y = shipY.current;
            const targetPitch = -velocity.current * (isHyper ? 0.005 : 0.03);
            shipRef.current.rotation.x = THREE.MathUtils.lerp(shipRef.current.rotation.x, targetPitch, 0.1);
            if (isHyper) shipRef.current.rotation.z += dt * 10;
            else shipRef.current.rotation.z = THREE.MathUtils.lerp(shipRef.current.rotation.z, 0, 0.1);
        }

        // --- UPDATE ENTITIES ---
        const moveDist = speedRef.current * dt;
        entitiesRef.current.forEach(e => e.z += moveDist);

        // Spawn Logic
        const last = entitiesRef.current[entitiesRef.current.length - 1];
        if (!last || last.z > -CONFIG.OBSTACLE_SPAWN_DIST) {
            const z = last ? last.z - CONFIG.OBSTACLE_GAP : -40;
            const isOrb = Math.random() > 0.7;
            if (isOrb) {
                entitiesRef.current.push({ id: Math.random(), z, type: 'orb', y: randomRange(-8, 8), passed: false });
            } else {
                const types = ['asteroid', 'gate', 'mine'];
                const type = types[Math.floor(Math.random() * types.length)];
                entitiesRef.current.push({ id: Math.random(), z, type, y: type === 'gate' ? 0 : randomRange(-8, 8), rotSpeed: randomRange(0.5, 3), passed: false });
            }
        }
        if (entitiesRef.current[0] && entitiesRef.current[0].z > 20) entitiesRef.current.shift();

        // Collision Check
        entitiesRef.current.forEach(e => {
            if (e.collected || e.passed) return;
            if (e.z > -2 && e.z < 2) {
                const dy = Math.abs(shipY.current - e.y);
                if (e.type === 'orb') {
                    if (dy < 3) {
                        e.collected = true;
                        setFlux(f => Math.min(100, f + CONFIG.FLUX_PER_ORB));
                        setScore(s => s + 50);
                    }
                } else if (!isHyper) {
                    if ((e.type === 'asteroid' && dy < 3) || (e.type === 'mine' && dy < 2) || (e.type === 'gate' && dy < 2)) {
                        setGameState('gameover');
                    }
                }
            }
            if (e.z > 5 && !e.passed && !e.collected) {
                e.passed = true;
                setScore(s => s + (isHyper ? 5 : 1));
            }
        });

        // Loop array
        setEntities([...entitiesRef.current]);
    });

    // Input
    useEffect(() => {
        const jump = (e) => {
            if (gameState !== 'playing' || isHyper) return;
            if (e.code === 'Space' || e.type === 'pointerdown') velocity.current = CONFIG.JUMP_FORCE;
        };
        window.addEventListener('keydown', jump);
        window.addEventListener('pointerdown', jump);
        return () => {
            window.removeEventListener('keydown', jump);
            window.removeEventListener('pointerdown', jump);
        };
    }, [gameState, isHyper]);

    // Reset
    useEffect(() => {
        if (gameState !== 'playing') {
            shipY.current = 0; velocity.current = 0; speedRef.current = CONFIG.BASE_SPEED; entitiesRef.current = [];
        }
    }, [gameState]);

    return (
        <group>
            {/* Player Visual (Controlled by Ref in local Loop) */}
            <Ship ref={shipRef} isHyper={isHyper} />

            {/* Entities */}
            {entities.map(e => (
                !e.collected && <Entity key={e.id} z={e.z} y={e.y} type={e.type} rotSpeed={e.rotSpeed} isHyper={isHyper} />
            ))}
        </group>
    );
};

// --- MAIN DEFAULT EXPORT ---
const OrbitBird = () => {
    const [gameState, setGameState] = useState('ready');
    const [score, setScore] = useState(0);
    const [flux, setFlux] = useState(0); // 0-100
    const [isHyper, setIsHyper] = useState(false);

    // Hyper Trigger
    useEffect(() => {
        const trigger = (e) => {
            if (e.key === 'Shift') {
                if (flux >= 100 && gameState === 'playing') setIsHyper(true);
            }
        };
        window.addEventListener('keydown', trigger);
        return () => window.removeEventListener('keydown', trigger);
    }, [flux, gameState]);

    return (
        <div className="w-full h-full relative bg-gray-950 font-sans overflow-hidden">
            <Suspense fallback={<GameLoader />}>
                <Canvas shadows>
                    <PerspectiveCamera makeDefault position={[18, 5, 22]} fov={isHyper ? 60 : 40} onUpdate={c => c.lookAt(0, 0, 0)} />
                    <Environment preset="city" />
                    <Stars radius={150} depth={50} count={5000} factor={6} fade speed={isHyper ? 10 : 2} />
                    <fog attach="fog" args={['#050510', 20, isHyper ? 200 : 120]} />

                    {isHyper && <Sparkles count={500} scale={[50, 50, 200]} size={10} speed={10} opacity={0.8} color="magenta" />}
                    {!isHyper && <Sparkles count={200} scale={[20, 20, 100]} size={6} speed={2} opacity={0.5} color="#4fd1c5" />}

                    <ambientLight intensity={0.2} />
                    <pointLight position={[10, 10, 10]} intensity={1} castShadow />

                    {/* GAME WORLD + LOGIC + RENDERER */}
                    <GameWorld
                        gameState={gameState}
                        setGameState={setGameState}
                        setScore={setScore}
                        setFlux={setFlux}
                        flux={flux}
                        isHyper={isHyper}
                        setIsHyper={setIsHyper}
                    />

                    <group position={[0, -15, 0]}>
                        <gridHelper args={[200, 20, '#333', '#111']} />
                    </group>
                </Canvas>
            </Suspense>

            {/* UI LAYER */}
            <div className="absolute inset-0 pointer-events-none p-8 flex flex-col justify-between z-50">
                {/* HUD */}
                <div className="flex justify-between items-start w-full">
                    <div>
                        <div className="text-cyan-400 font-mono text-xs mb-1">DISTANCE</div>
                        <h2 className="text-6xl font-black text-white italic tracking-tighter">{Math.floor(score)}<span className="text-2xl not-italic text-gray-500">km</span></h2>
                    </div>

                    {/* Flux Meter */}
                    <div className="flex flex-col items-end">
                        <div className={`text-xs font-mono mb-1 ${flux >= 100 ? 'text-magenta-400 animate-pulse' : 'text-cyan-400'}`}>
                            {flux >= 100 ? 'HYPER READY [SHIFT]' : 'FLUX CAPACITOR'}
                        </div>
                        <div className="w-64 h-4 bg-gray-900 rounded-full border border-gray-700 overflow-hidden">
                            <div
                                className={`h-full transition-all duration-300 ${flux >= 100 ? 'bg-fuchsia-500 shadow-[0_0_15px_#d946ef]' : 'bg-cyan-500'}`}
                                style={{ width: `${Math.min(100, flux)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Menus */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                    {gameState === 'ready' && (
                        <div className="text-center">
                            <h1 className="text-9xl font-black text-white mb-2 tracking-tighter italic">ORBIT<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">HYPER</span></h1>
                            <button
                                onClick={() => setGameState('playing')}
                                className="px-16 py-6 bg-white text-black font-black text-3xl skew-x-[-10deg] hover:bg-cyan-400 hover:scale-105 transition-all shadow-[0_0_40px_rgba(6,182,212,0.6)]"
                            >
                                ENGAGE
                            </button>
                        </div>
                    )}
                    {gameState === 'gameover' && (
                        <div className="bg-black/90 p-12 border border-red-500 text-center">
                            <h1 className="text-red-500 text-8xl font-black mb-4">CRITICAL FAILURE</h1>
                            <div className="text-4xl text-white font-mono mb-8">SCORE: {Math.floor(score)}</div>
                            <button
                                onClick={() => { setGameState('ready'); setScore(0); setFlux(0); }}
                                className="px-10 py-4 bg-red-600 text-white font-bold text-xl hover:bg-red-500"
                            >
                                SYSTEM REBOOT
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrbitBird;
