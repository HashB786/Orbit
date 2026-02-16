import React, { useState, useRef, useEffect, Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Trail, PerspectiveCamera, Sparkles, Float, Environment, MeshWobbleMaterial, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Play, RotateCcw, Zap, AlertTriangle, Shield, Trophy, Pause } from 'lucide-react';

// --- GAME CONFIG v6 (BALANCED & OPTIMIZED) ---
const CONFIG = {
    BASE_SPEED: 50,
    MAX_SPEED: 120,
    HYPER_SPEED: 180,
    GRAVITY: 2.2,
    JUMP_FORCE: 20,
    SPEED_INC: 0.5,
    TERMINAL_VELOC: -30,
    OBSTACLE_SPAWN_DIST: 300,
    OBSTACLE_GAP_MIN: 40,
    OBSTACLE_GAP_MAX: 70,
    FLUX_PER_ORB: 25,
    FLUX_DRAIN: 25,
};

// --- OPTIMIZED RESOURCES (Shared Geometries/Materials) ---
const GEOMETRIES = {
    cone: new THREE.ConeGeometry(0.8, 3.5, 8),
    box: new THREE.BoxGeometry(0.7, 1.5, 0.5),
    wing: new THREE.CylinderGeometry(0.1, 1.5, 3, 3),
    sphere: new THREE.SphereGeometry(0.4),
    dodeca: new THREE.DodecahedronGeometry(2.2, 0),
    icosa: new THREE.IcosahedronGeometry(1.2, 0),
    spike: new THREE.CylinderGeometry(0.1, 0, 2.5),
    torusLarge: new THREE.TorusGeometry(3.5, 0.3, 16, 32),
    torusSmall: new THREE.TorusGeometry(3.5, 0.2, 16, 32),
    octa: new THREE.OctahedronGeometry(1, 0),
};

const MATERIALS = {
    shipHyper: new THREE.MeshStandardMaterial({ color: "#f0abfc", roughness: 0.2, metalness: 0.8 }),
    shipBase: new THREE.MeshStandardMaterial({ color: "#e2e8f0", roughness: 0.2, metalness: 0.8 }),
    cockpitHyper: new THREE.MeshStandardMaterial({ color: "#fae8ff", emissive: "#d946ef", emissiveIntensity: 1 }),
    cockpitBase: new THREE.MeshStandardMaterial({ color: "#0ea5e9", emissive: "#0ea5e9", emissiveIntensity: 1 }),
    asteroid: new THREE.MeshStandardMaterial({ color: "#451a03", roughness: 0.9 }),
    asteroidGhost: new THREE.MeshBasicMaterial({ color: "#ef4444", wireframe: true, transparent: true, opacity: 0.2 }),
    mine: new THREE.MeshStandardMaterial({ color: "#18181b", metalness: 0.9, roughness: 0.1 }),
    spike: new THREE.MeshStandardMaterial({ color: "#ef4444", emissive: "#ef4444", emissiveIntensity: 2 }),
    gatePrimary: new THREE.MeshStandardMaterial({ color: "#f97316", emissive: "#ea580c", emissiveIntensity: 2 }),
    gateSecondary: new THREE.MeshStandardMaterial({ color: "#f97316", emissive: "#ea580c", emissiveIntensity: 1 }),
};

// --- HELPERS ---
const randomRange = (min, max) => Math.random() * (max - min) + min;

// 1. COMPONENTS USING SHARED RESOURCES

const Ship = React.forwardRef(({ isHyper }, ref) => {
    return (
        <group ref={ref}>
            <Trail width={isHyper ? 10 : 4} length={isHyper ? 25 : 12} color={isHyper ? "#d946ef" : "#06b6d4"} attenuation={(t) => t * t}>
                <group rotation={[0, Math.PI, 0]}>
                    <mesh castShadow receiveShadow geometry={GEOMETRIES.cone} material={isHyper ? MATERIALS.shipHyper : MATERIALS.shipBase} />
                    <mesh position={[0, 0.8, 0.8]} geometry={GEOMETRIES.box} material={isHyper ? MATERIALS.cockpitHyper : MATERIALS.cockpitBase} />
                    <mesh position={[0, -0.5, 0.5]} rotation={[Math.PI / 2, 0, 0]} geometry={GEOMETRIES.wing}>
                        <meshStandardMaterial color={isHyper ? "#86198f" : "#1e293b"} />
                    </mesh>
                    <mesh position={[0, -1.8, 0]} geometry={GEOMETRIES.sphere}>
                        <meshBasicMaterial color={isHyper ? "magenta" : "cyan"} />
                    </mesh>
                    <pointLight position={[0, -2, 0]} color={isHyper ? "magenta" : "cyan"} distance={5} intensity={5} />
                </group>
            </Trail>
        </group>
    );
});

const Asteroid = ({ isHyper }) => {
    const r = useMemo(() => Math.random(), []);
    return (
        <Float speed={r * 2} rotationIntensity={r * 2} floatIntensity={r * 2}>
            <group scale={window.innerWidth < 768 ? 0.8 : 1}>
                <mesh castShadow receiveShadow geometry={GEOMETRIES.dodeca} material={isHyper ? MATERIALS.asteroidGhost : MATERIALS.asteroid} />
                {!isHyper && (
                    <mesh position={[1.5, 1, 0]} scale={0.4} geometry={GEOMETRIES.icosa}>
                        <meshStandardMaterial color="#57534e" />
                    </mesh>
                )}
            </group>
        </Float>
    );
};

const Mine = ({ isHyper }) => {
    const spikes = useMemo(() => [...Array(6)].map(() => ({
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0]
    })), []);

    return (
        <Float speed={5} floatIntensity={2}>
            <group scale={isHyper ? 0.8 : 1.2}>
                <mesh geometry={GEOMETRIES.icosa} material={MATERIALS.mine} />
                {spikes.map((s, i) => (
                    <mesh key={i} rotation={s.rotation} geometry={GEOMETRIES.spike} material={MATERIALS.spike} />
                ))}
                <pointLight color="red" distance={4} intensity={4} animate={{ intensity: [2, 6, 2] }} />
            </group>
        </Float>
    );
};

const Gate = () => {
    return (
        <group rotation={[0, 0, Math.PI / 4]}>
            <mesh geometry={GEOMETRIES.torusLarge} material={MATERIALS.gatePrimary} />
            <mesh rotation={[0, 0, Math.PI / 2]} geometry={GEOMETRIES.torusSmall} material={MATERIALS.gateSecondary} />
        </group>
    );
};

const Orb = () => {
    return (
        <group>
            <Float speed={10} rotationIntensity={5}>
                <mesh geometry={GEOMETRIES.octa}>
                    <MeshWobbleMaterial factor={0.6} speed={2} color="#facc15" emissive="#fbbf24" emissiveIntensity={2} />
                </mesh>
            </Float>
            <Sparkles count={8} scale={3} size={3} color="yellow" />
            <pointLight color="yellow" distance={5} intensity={2} />
        </group>
    );
};

const Entity = React.memo(({ z, type, y, isHyper }) => {
    const meshRef = useRef();

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        if (type === 'orb') {
            meshRef.current.rotation.y += delta * 3;
            meshRef.current.position.y = y + Math.sin(state.clock.elapsedTime * 4) * 0.5;
        } else if (type === 'gate') {
            meshRef.current.rotation.z += delta * 0.5;
        } else {
            meshRef.current.rotation.x += delta;
            meshRef.current.rotation.y += delta;
        }
    });

    return (
        <group position={[0, y, z]} ref={meshRef}>
            {type === 'asteroid' && <Asteroid isHyper={isHyper} />}
            {type === 'mine' && <Mine isHyper={isHyper} />}
            {type === 'gate' && <Gate />}
            {type === 'orb' && <Orb />}
        </group>
    );
});

// 2. LOGIC
const GameWorld = ({ gameState, setGameState, setScore, setFlux, isHyper, setIsHyper }) => {
    const shipRef = useRef();
    const shipY = useRef(0);
    const velocity = useRef(0);
    const speedRef = useRef(CONFIG.BASE_SPEED);
    const entitiesRef = useRef([]);
    const [entities, setEntities] = useState([]);

    useFrame((state, delta) => {
        if (gameState === 'paused') return;

        if (gameState !== 'playing') {
            if (shipRef.current) {
                shipRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.5;
                shipRef.current.rotation.z = Math.sin(state.clock.elapsedTime) * 0.1;
                shipRef.current.rotation.x = 0;
            }
            return;
        }

        const dt = Math.min(delta, 0.1);

        // Physics
        if (isHyper) {
            speedRef.current = THREE.MathUtils.lerp(speedRef.current, CONFIG.HYPER_SPEED, dt * 1.5);
            setFlux(prev => {
                const next = prev - CONFIG.FLUX_DRAIN * dt;
                if (next <= 0) { setIsHyper(false); return 0; }
                return next;
            });
            velocity.current = THREE.MathUtils.lerp(velocity.current, 0, dt * 5);
            shipY.current = THREE.MathUtils.lerp(shipY.current, 0, dt * 5);
        } else {
            if (speedRef.current < CONFIG.MAX_SPEED) {
                speedRef.current += CONFIG.SPEED_INC * dt;
            }
            velocity.current -= CONFIG.GRAVITY * 60 * dt;
            if (velocity.current < CONFIG.TERMINAL_VELOC) velocity.current = CONFIG.TERMINAL_VELOC;
            shipY.current += velocity.current * dt;
        }

        // Bounds
        if (shipY.current < -16 || shipY.current > 16) {
            if (!isHyper) setGameState('gameover');
        }

        // Visuals
        if (shipRef.current) {
            shipRef.current.position.y = shipY.current;
            const targetPitch = -velocity.current * (isHyper ? 0.005 : 0.04);
            shipRef.current.rotation.x = THREE.MathUtils.lerp(shipRef.current.rotation.x, targetPitch, 0.1);
            if (isHyper) shipRef.current.rotation.z += dt * 15;
            else shipRef.current.rotation.z = THREE.MathUtils.lerp(shipRef.current.rotation.z, 0, 0.1);
        }

        // Entities
        const moveDist = speedRef.current * dt;
        entitiesRef.current.forEach(e => e.z += moveDist);

        const currentGap = THREE.MathUtils.clamp(
            CONFIG.OBSTACLE_GAP_MIN + (speedRef.current / 10),
            CONFIG.OBSTACLE_GAP_MIN,
            CONFIG.OBSTACLE_GAP_MAX
        );

        const last = entitiesRef.current[entitiesRef.current.length - 1];
        if (!last || last.z > -CONFIG.OBSTACLE_SPAWN_DIST) {
            const z = last ? last.z - currentGap : -50;

            // Safe Start: Force Orbs if speed is low (Proxy for start of run)
            const isSafeStart = speedRef.current < (CONFIG.BASE_SPEED + 20); // First ~15 seconds?
            const isOrb = isSafeStart || Math.random() > 0.65;

            if (isOrb) {
                entitiesRef.current.push({ id: Math.random(), z, type: 'orb', y: randomRange(-8, 8), passed: false });
            } else {
                const types = ['asteroid', 'gate', 'mine'];
                const type = types[Math.floor(Math.random() * types.length)];
                const y = type === 'gate' ? randomRange(-3, 3) : randomRange(-10, 10);
                entitiesRef.current.push({ id: Math.random(), z, type, y, passed: false });
            }
        }

        if (entitiesRef.current[0] && entitiesRef.current[0].z > 30) entitiesRef.current.shift();

        // Collision
        entitiesRef.current.forEach(e => {
            if (e.collected || e.passed) return;

            if (e.z > -2.5 && e.z < 2.5) {
                const dy = Math.abs(shipY.current - e.y);

                if (e.type === 'orb') {
                    if (dy < 4.5) {
                        e.collected = true;
                        setFlux(f => Math.min(100, f + CONFIG.FLUX_PER_ORB));
                        setScore(s => s + 150);
                    }
                } else if (!isHyper) {
                    if (e.type === 'gate') {
                        // Ring logic: Safe inside (dy < 2.0) OR Safe outside (dy > 3.8)
                        // Crash if hitting the rim (2.0 < dy < 3.8)
                        if (dy > 2.0 && dy < 3.8) setGameState('gameover');
                    } else if (e.type === 'asteroid') {
                        if (dy < 2.0) setGameState('gameover');
                    } else if (e.type === 'mine') {
                        if (dy < 1.8) setGameState('gameover');
                    }
                }
            }

            if (e.z > 8 && !e.passed && !e.collected) {
                e.passed = true;
                setScore(s => s + (isHyper ? 20 : 10));
            }
        });

        setEntities([...entitiesRef.current]);
    });

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

    useEffect(() => {
        if (gameState === 'ready') {
            shipY.current = 0; velocity.current = 0; speedRef.current = CONFIG.BASE_SPEED; entitiesRef.current = [];
        }
    }, [gameState]);

    return (
        <group>
            <Ship ref={shipRef} isHyper={isHyper} />
            {entities.map(e => (
                !e.collected && <Entity key={e.id} z={e.z} y={e.y} type={e.type} isHyper={isHyper} />
            ))}
        </group>
    );
};

// 3. MAIN COMPONENT
const OrbitBird = () => {
    const [gameState, setGameState] = useState('ready');
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('orbitHighScore') || '0'));
    const [flux, setFlux] = useState(0);
    const [isHyper, setIsHyper] = useState(false);

    useEffect(() => {
        if (score > highScore) {
            setHighScore(Math.floor(score));
            localStorage.setItem('orbitHighScore', Math.floor(score).toString());
        }
    }, [score]);

    useEffect(() => {
        const trigger = (e) => {
            if (e.key === 'Shift' && flux >= 100 && gameState === 'playing') setIsHyper(true);
            if (e.key === 'Escape' && gameState === 'playing') setGameState('paused');
        };
        window.addEventListener('keydown', trigger);
        return () => window.removeEventListener('keydown', trigger);
    }, [flux, gameState]);

    return (
        <div className="w-full h-full relative bg-gray-950 font-sans overflow-hidden select-none">
            <Canvas shadows className="w-full h-full block" dpr={[1, 2]}>
                <Suspense fallback={null}>
                    <PerspectiveCamera makeDefault position={[22, 5, 25]} fov={isHyper ? 65 : 45} onUpdate={c => c.lookAt(0, 0, 0)} />
                    <Environment preset="city" />
                    <Stars radius={150} depth={50} count={5000} factor={4} fade speed={isHyper ? 15 : 1} />
                    <fog attach="fog" args={['#050510', 10, isHyper ? 250 : 140]} />

                    {isHyper && <Sparkles count={300} scale={[50, 50, 200]} size={12} speed={10} opacity={0.6} color="magenta" />}
                    {!isHyper && <Sparkles count={100} scale={[30, 30, 100]} size={6} speed={1} opacity={0.3} color="cyan" />}

                    <ambientLight intensity={0.4} />
                    <pointLight position={[10, 10, 10]} intensity={2} castShadow color={isHyper ? "magenta" : "white"} />
                    <spotLight position={[-10, 20, 10]} angle={0.3} penumbra={1} intensity={10} castShadow />

                    <GameWorld
                        gameState={gameState}
                        setGameState={setGameState}
                        setScore={setScore}
                        setFlux={setFlux}
                        flux={flux}
                        isHyper={isHyper}
                        setIsHyper={setIsHyper}
                    />

                    <group position={[0, -18, 0]}>
                        <gridHelper args={[400, 40, '#1e293b', '#0f172a']} />
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
                            <planeGeometry args={[400, 400]} />
                            <meshBasicMaterial color="#020617" opacity={0.8} transparent />
                        </mesh>
                    </group>
                </Suspense>
            </Canvas>

            {/* UI LAYER */}
            <div className="absolute inset-0 pointer-events-none p-6 md:p-10 flex flex-col justify-between z-50">
                {/* HUD Header */}
                <div className="flex justify-between items-start w-full">
                    {/* Score Panel */}
                    <div className="bg-black/40 backdrop-blur-md p-4 rounded-br-2xl border-l-4 border-cyan-500 shadow-lg flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <div className="text-cyan-400 font-mono text-xs tracking-widest opacity-80">DISTANCE</div>
                            {highScore > 0 && <div className="text-yellow-500 font-bold font-mono text-xs flex items-center gap-1 animate-pulse"><Trophy size={12} /> HI: {highScore}</div>}
                        </div>
                        <h2 className="text-5xl font-black text-white italic tracking-tighter drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                            {Math.floor(score)}<span className="text-xl not-italic text-cyan-700 ml-1">km</span>
                        </h2>
                    </div>

                    {/* Flux Panel */}
                    <div className="mt-16 mr-2 flex flex-col items-end">
                        <div className={`text-xs font-bold tracking-widest mb-2 px-3 py-1 rounded-full ${flux >= 100 ? 'bg-fuchsia-500 text-white animate-pulse' : 'bg-black/50 text-cyan-400 border border-cyan-900'}`}>
                            {flux >= 100 ? 'HYPERDRIVE READY [SHIFT]' : 'FLUX CAPACITOR'}
                        </div>
                        <div className="w-72 h-3 bg-gray-900/80 rounded-full border border-gray-700 overflow-hidden backdrop-blur">
                            <div
                                className={`h-full transition-all duration-300 ${flux >= 100 ? 'bg-gradient-to-r from-fuchsia-500 to-purple-600 shadow-[0_0_20px_#d946ef]' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`}
                                style={{ width: `${Math.min(100, flux)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Center Menus */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                    {gameState === 'ready' && (
                        <div className="text-center transform transition-all hover:scale-105 duration-500">
                            <h1 className="text-8xl md:text-9xl font-black text-white mb-6 tracking-tighter italic drop-shadow-2xl">
                                ORBIT<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">RUNNER</span>
                            </h1>
                            <div className="inline-block p-[2px] rounded-lg bg-gradient-to-r from-cyan-500 to-fuchsia-500">
                                <button
                                    onClick={() => setGameState('playing')}
                                    className="px-16 py-6 bg-black text-white font-bold text-2xl uppercase tracking-widest hover:bg-gray-900 transition-all rounded-md"
                                >
                                    Initialize Launch
                                </button>
                            </div>
                            <p className="mt-6 text-cyan-300 font-mono text-sm opacity-70">PRESS SPACE TO JUMP • SHIFT FOR HYPERDRIVE</p>
                        </div>
                    )}

                    {gameState === 'paused' && (
                        <div className="bg-black/80 backdrop-blur-xl p-12 border border-cyan-500/30 text-center rounded-2xl shadow-2xl z-50">
                            <Pause className="mx-auto text-cyan-400 mb-4 h-16 w-16" />
                            <h1 className="text-white text-6xl font-black mb-8 tracking-tighter">PAUSED</h1>
                            <button
                                onClick={() => setGameState('playing')}
                                className="px-12 py-4 bg-cyan-600 text-white font-bold text-xl hover:bg-cyan-500 transition-all rounded"
                            >
                                RESUME
                            </button>
                        </div>
                    )}

                    {gameState === 'gameover' && (
                        <div className="bg-black/80 backdrop-blur-xl p-12 border-y-2 border-red-500 text-center max-w-2xl w-full shadow-[0_0_50px_rgba(239,68,68,0.3)]">
                            <AlertTriangle className="mx-auto text-red-500 mb-4 h-16 w-16 animate-bounce" />
                            <h1 className="text-red-500 text-7xl font-black mb-2 tracking-tighter">CRITICAL FAILURE</h1>
                            <p className="text-red-200/60 font-mono mb-8 text-lg">HULL INTEGRITY COMPROMISED</p>

                            <div className="text-5xl text-white font-black mb-10 bg-gradient-to-r from-gray-800 to-black p-4 rounded-xl border border-gray-800">
                                <div className="flex justify-between items-end px-4">
                                    <div className="text-left">
                                        <span className="text-xs text-gray-500 block font-mono mb-2">FINAL SCORE</span>
                                        {Math.floor(score)}
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-yellow-600 block font-mono mb-2">BEST</span>
                                        <span className="text-3xl text-yellow-500">{highScore}</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => { setGameState('ready'); setScore(0); setFlux(0); }}
                                className="group relative px-12 py-5 bg-red-600 text-white font-bold text-xl hover:bg-red-500 transition-all rounded overflow-hidden"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    <RotateCcw size={20} /> SYSTEM REBOOT
                                </span>
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrbitBird;
