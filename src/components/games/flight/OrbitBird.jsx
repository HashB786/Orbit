import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Trail, PerspectiveCamera, Sparkles, Float, Text3D, Center, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Play, RotateCcw, Zap } from 'lucide-react';

// --- GAME CONFIG v3 ---
const BASE_SPEED = 40;
const SPEED_INC = 0.5; // Speed increase per second
const GRAVITY = 1.8; // Heavier gravity
const JUMP_FORCE = 18; // Stronger punch
const TERMINAL_VELOCITY = -25;
const OBSTACLE_SPAWN_DIST = 120;
const OBSTACLE_GAP = 35; // More space between obstacles to react

// --- HELPERS ---
const randomRange = (min, max) => Math.random() * (max - min) + min;

// --- COMPONENTS ---

// 1. The Player Ship
const Ship = ({ isPlaying, onCrash, setScore, gameSpeed }) => {
    const shipRef = useRef();
    const velocity = useRef(0);
    const targetRotation = useRef(0);

    useFrame((state, delta) => {
        if (!shipRef.current) return;

        // Idle Animation
        if (!isPlaying) {
            shipRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.5;
            shipRef.current.rotation.z = Math.sin(state.clock.elapsedTime) * 0.1;
            shipRef.current.rotation.x = 0;
            return;
        }

        const dt = Math.min(delta, 0.1);

        // Physics: Acceleration
        velocity.current -= GRAVITY * dt * 60;
        if (velocity.current < TERMINAL_VELOCITY) velocity.current = TERMINAL_VELOCITY;

        // Apply velocity
        shipRef.current.position.y += velocity.current * dt;

        // Dynamic Tilt (Banking)
        // Nose dives when falling, pitches up when climbing
        const targetPitch = -velocity.current * 0.03;
        shipRef.current.rotation.x = THREE.MathUtils.lerp(shipRef.current.rotation.x, targetPitch, 0.1);

        // Camera Shake effect based on speed could go here, but let's keep camera steady for gameplay clarity.

        // Floor/Ceiling Bounds
        if (shipRef.current.position.y < -14 || shipRef.current.position.y > 14) {
            onCrash();
        }
    });

    useEffect(() => {
        const jump = (e) => {
            if (!isPlaying) return;
            if (e.code === 'Space' || e.type === 'pointerdown') {
                velocity.current = JUMP_FORCE;
                // Add a small forward kick effect or particle burst here?
            }
        };
        window.addEventListener('keydown', jump);
        window.addEventListener('pointerdown', jump);
        return () => {
            window.removeEventListener('keydown', jump);
            window.removeEventListener('pointerdown', jump);
        };
    }, [isPlaying]);

    return (
        <group ref={shipRef} position={[0, 0, 0]}>
            <Trail width={3} length={8} color="#00ffff" attenuation={(t) => t * t}>
                <group rotation={[0, Math.PI, 0]}>
                    {/* Fuselage */}
                    <mesh castShadow receiveShadow>
                        <coneGeometry args={[0.7, 3, 6]} />
                        <meshStandardMaterial color="#3b82f6" roughness={0.3} metalness={0.8} />
                    </mesh>
                    {/* Cockpit */}
                    <mesh position={[0, 0.5, 0.5]}>
                        <boxGeometry args={[0.6, 1.2, 0.8]} />
                        <meshStandardMaterial color="#60a5fa" emissive="#3b82f6" emissiveIntensity={0.5} />
                    </mesh>
                    {/* Wings */}
                    <mesh position={[0, -0.5, 0]}>
                        <boxGeometry args={[3, 0.2, 1.5]} />
                        <meshStandardMaterial color="#1e40af" metalness={0.8} />
                    </mesh>
                    {/* Engines */}
                    <mesh position={[1, -0.5, 1]}>
                        <cylinderGeometry args={[0.3, 0.4, 2]} />
                        <meshStandardMaterial color="#333" />
                    </mesh>
                    <mesh position={[-1, -0.5, 1]}>
                        <cylinderGeometry args={[0.3, 0.4, 2]} />
                        <meshStandardMaterial color="#333" />
                    </mesh>
                    {/* Engine Glows */}
                    <pointLight position={[1, -0.5, 2]} color="cyan" distance={3} intensity={5} />
                    <pointLight position={[-1, -0.5, 2]} color="cyan" distance={3} intensity={5} />
                </group>
            </Trail>
        </group>
    );
};

// 2. Obstacles (Asteroids & Structures)
const Obstacle = ({ position, type, rotSpeed }) => {
    const meshRef = useRef();

    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.x += rotSpeed * delta;
            meshRef.current.rotation.y += rotSpeed * delta;
        }
    });

    return (
        <group position={position}>
            {/* Hitbox Visualization (Debug only, disabled for prod) */}

            {type === 'asteroid' && (
                <Float speed={2} rotationIntensity={1} floatIntensity={1}>
                    <mesh ref={meshRef} castShadow receiveShadow>
                        <dodecahedronGeometry args={[2.5, 0]} />
                        <meshStandardMaterial color="#78350f" roughness={0.8} />
                    </mesh>
                    {/* Glow Core */}
                    <mesh scale={[0.8, 0.8, 0.8]}>
                        <dodecahedronGeometry args={[2.5, 0]} />
                        <meshBasicMaterial color="#ef4444" wireframe />
                    </mesh>
                </Float>
            )}

            {type === 'bar' && (
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[12, 1.5, 1.5]} />
                    <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={2} toneMapped={false} />
                </mesh>
            )}

            {type === 'ring' && (
                <group rotation={[0, 0, Math.PI / 4]}>
                    <mesh castShadow>
                        <torusGeometry args={[5, 0.5, 8, 20]} />
                        <meshStandardMaterial color="#d946ef" emissive="#d946ef" emissiveIntensity={3} toneMapped={false} />
                    </mesh>
                </group>
            )}
        </group>
    );
};

// 3. The World Engine
function GameLoop({ isPlaying, setGameState, setScore }) {
    const shipY = useRef(0);
    const velocity = useRef(0);
    const speedRef = useRef(BASE_SPEED);
    const obstaclesRef = useRef([]); // { id, z, type, y, passed }
    const [renderObstacles, setRenderObstacles] = useState([]);
    const scoreRef = useRef(0);

    useFrame((state, delta) => {
        if (!isPlaying) {
            // Bobbing logic for idle state
            shipY.current = Math.sin(state.clock.elapsedTime * 3) * 0.5;
            return;
        }

        const dt = Math.min(delta, 0.1);

        // --- SPEED SCALING ---
        // Increase speed slowly over time
        speedRef.current += SPEED_INC * dt;

        // --- PHYSICS ---
        velocity.current -= GRAVITY * 60 * dt;
        if (velocity.current < TERMINAL_VELOCITY) velocity.current = TERMINAL_VELOCITY;

        shipY.current += velocity.current * dt;

        // Bounds Check
        if (shipY.current < -13 || shipY.current > 13) {
            setGameState('gameover');
        }

        // --- OBSTACLE ENGINE ---
        const moveDist = speedRef.current * dt;

        // 1. Move
        obstaclesRef.current.forEach(o => {
            o.z += moveDist;
        });

        // 2. Spawn
        const lastOb = obstaclesRef.current[obstaclesRef.current.length - 1];
        // Ensure obstacles span far into the distance
        if (!lastOb || lastOb.z > -OBSTACLE_SPAWN_DIST) {
            const z = lastOb ? lastOb.z - OBSTACLE_GAP : -40;

            // Difficulty Progression
            const difficulty = Math.min(1.0, scoreRef.current / 100); // 0 to 1 scaling

            const types = ['asteroid', 'bar', 'ring'];
            // As difficulty increases, use more bars/rings vs asteroids?
            // Random selection for now
            const type = types[Math.floor(Math.random() * types.length)];

            let y = 0;
            if (type === 'asteroid') y = randomRange(-8, 8);
            if (type === 'bar') y = randomRange(-7, 7);
            if (type === 'ring') y = randomRange(-5, 5);

            obstaclesRef.current.push({
                id: Math.random(),
                z: z,
                type,
                y,
                rotSpeed: randomRange(0.5, 2),
                passed: false
            });
        }

        // 3. Cleanup
        if (obstaclesRef.current[0] && obstaclesRef.current[0].z > 15) {
            obstaclesRef.current.shift();
        }

        // 4. Collision Detection (Simple AABB / Radius)
        // Ship is approx 2 units tall, 1 unit wide.
        obstaclesRef.current.forEach(o => {
            // Only check if close in Z
            if (o.z > -2 && o.z < 2) {
                const dy = Math.abs(shipY.current - o.y);

                if (o.type === 'asteroid') {
                    // Radius ~2.5
                    if (dy < 3.0) setGameState('gameover');
                } else if (o.type === 'bar') {
                    // Bar Width 12, Height 1.5. Center Y. 
                    // Ship is X=0. Bar is X=0.
                    // Hit if Y align.
                    if (dy < 1.8) setGameState('gameover');
                } else if (o.type === 'ring') {
                    // Torus Radius 5. Inner Radius ~4.5.
                    // Must be inside the hole.
                    // Hole = > 4.5 is HIT.
                    // Wait, Torus geometry: Radius 5 is center of tube. Tube radius 0.5.
                    // So outer radius 5.5, inner radius 4.5.
                    // If Ship > 4.0 away from center, CRASH (hit rim).
                    if (dy > 3.5) setGameState('gameover');
                }
            }

            // Score Point at passing Z=0
            if (o.z > 0 && !o.passed) {
                o.passed = true;
                scoreRef.current += 1;
                setScore(scoreRef.current);
            }
        });

        // Sync React State for Rendering
        setRenderObstacles([...obstaclesRef.current]);
    });

    // Inputs
    useEffect(() => {
        const jump = (e) => {
            if (!isPlaying) return;
            if (e.code === 'Space' || e.type === 'pointerdown') {
                velocity.current = JUMP_FORCE;
            }
        };
        window.addEventListener('keydown', jump);
        window.addEventListener('pointerdown', jump);
        return () => {
            window.removeEventListener('keydown', jump);
            window.removeEventListener('pointerdown', jump);
        };
    }, [isPlaying]);

    useEffect(() => {
        if (!isPlaying) {
            shipY.current = 0;
            velocity.current = 0;
            speedRef.current = BASE_SPEED;
            obstaclesRef.current = [];
            scoreRef.current = 0;
            setScore(0);
            setRenderObstacles([]);
        }
    }, [isPlaying]);

    return (
        <group>
            {/* Player & Camera Group */}
            <group position={[0, 0, 0]}>
                <Ship isPlaying={isPlaying} onCrash={() => setGameState('gameover')} setScore={setScore} gameSpeed={speedRef.current} />

                {/* Visual Ship Model at Ref Position */}
                <group position={[0, shipY.current, 0]}>
                    <ShipVisual velocity={velocity.current} />
                </group>
            </group>

            {/* Obstacles */}
            {renderObstacles.map(o => (
                <Obstacle key={o.id} position={[0, o.y, o.z]} type={o.type} rotSpeed={o.rotSpeed} />
            ))}
        </group>
    );
}

// Visual Wrapper to allow accessing 'velocity' prop inside useFrame via the main Loop ref
// Actually, I can just pass the props to Ship component and let it handle visuals.
// Simplified: ShipVisual component used inside GameLoop
const ShipVisual = ({ velocity }) => {
    const meshRef = useRef();
    useFrame(() => {
        if (meshRef.current) {
            // Smooth tilt
            const targetRot = -velocity * 0.05;
            meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRot, 0.1);
            meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, targetRot * 0.5, 0.1);
        }
    });

    return (
        <group ref={meshRef}>
            <mesh castShadow receiveShadow rotation={[0, Math.PI, 0]}>
                <group rotation={[Math.PI / 2, 0, 0]}>
                    <coneGeometry args={[0.5, 2, 8]} />
                    <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={0.5} toneMapped={false} />
                </group>
            </mesh>
            <Trail width={4} length={12} color="#00ffff" attenuation={(t) => t * t} />
            <pointLight distance={10} intensity={2} color="cyan" />
        </group>
    );
};


// --- MAIN DEFAULT EXPORT ---
const OrbitBird = () => {
    const [gameState, setGameState] = useState('ready');
    const [score, setScore] = useState(0);

    return (
        <div className="w-full h-full relative bg-gray-950 font-sans selection:bg-none overflow-hidden">
            <Canvas shadows>
                {/* Camera: Slightly Angled side/rear view for depth perception */}
                <PerspectiveCamera makeDefault position={[18, 5, 22]} fov={40} onUpdate={c => c.lookAt(0, 0, 0)} />

                {/* Environment */}
                <Environment preset="city" />
                <Stars radius={150} depth={50} count={5000} factor={6} fade speed={3} />
                <fog attach="fog" args={['#050510', 20, 120]} />

                {/* Speed Lines (Sparkles) */}
                <Sparkles count={200} scale={[20, 20, 100]} size={6} speed={gameState === 'playing' ? 2 : 0.2} opacity={0.5} color="#4fd1c5" />

                {/* Lighting */}
                <ambientLight intensity={0.2} />
                <pointLight position={[10, 10, 10]} intensity={1} castShadow />
                <spotLight position={[-20, 20, 20]} angle={0.3} penumbra={1} intensity={2} castShadow color="purple" />

                {/* Game World */}
                <GameLoop isPlaying={gameState === 'playing'} setGameState={setGameState} setScore={setScore} />

                {/* Helper Grid for Ground Ref */}
                <group position={[0, -15, 0]}>
                    <gridHelper args={[200, 20, '#333', '#111']} />
                    {/* Fake Ground Reflection */}
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
                        <planeGeometry args={[200, 200]} />
                        <meshStandardMaterial color="#000" roughness={0.1} metalness={0.8} opacity={0.8} transparent />
                    </mesh>
                </group>
            </Canvas>

            {/* UI LAYER */}
            <div className="absolute inset-0 pointer-events-none p-10 flex flex-col justify-between z-50">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 drop-shadow-xl font-mono italic">
                            {score}
                        </h2>
                    </div>
                </div>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                    {gameState === 'ready' && (
                        <div className="text-center animate-in fade-in zoom-in duration-500">
                            <h1 className="text-8xl font-black text-white mb-2 tracking-tighter drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">
                                ORBIT RUNNER
                            </h1>
                            <p className="text-cyan-400 mb-8 font-mono tracking-widest text-lg uppercase">
                                Hyper-Velocity Interceptor
                            </p>

                            <button
                                onClick={() => setGameState('playing')}
                                className="group relative px-12 py-5 bg-white text-black font-black text-2xl skew-x-[-10deg] hover:bg-cyan-400 transition-all hover:scale-110 shadow-[0_0_20px_rgba(255,255,255,0.5)]"
                            >
                                <span className="block skew-x-[10deg] flex items-center gap-3">
                                    <Play fill="currentColor" /> ENGAGE
                                </span>
                            </button>
                            <p className="text-gray-500 mt-8 font-mono text-sm">
                                [SPACE] THRUST &bull; [GRAVITY] NORMAL
                            </p>
                        </div>
                    )}

                    {gameState === 'gameover' && (
                        <div className="bg-red-950/90 backdrop-blur-xl p-16 border-y-4 border-red-500 text-center animate-in slide-in-from-bottom duration-300 shadow-2xl">
                            <h1 className="text-7xl font-black text-red-500 mb-2 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">WRECKED</h1>
                            <div className="flex justify-center gap-12 my-8 border-t border-b border-red-800 py-6">
                                <div>
                                    <p className="text-red-400 font-mono text-sm">DISTANCE</p>
                                    <p className="text-5xl font-bold text-white">{score}km</p>
                                </div>
                            </div>

                            <button
                                onClick={() => { setGameState('ready'); setScore(0); }}
                                className="px-10 py-4 bg-red-600 text-white font-bold text-xl rounded-none hover:bg-red-500 transition-all mx-auto flex items-center gap-2 skew-x-[-10deg] shadow-[0_0_20px_rgba(220,38,38,0.6)]"
                            >
                                <span className="block skew-x-[10deg] flex items-center gap-2">
                                    <RotateCcw size={24} /> SYSTEM RESET
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrbitBird;
