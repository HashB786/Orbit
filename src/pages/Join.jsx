import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SpaceScreen from '../components/SpaceScreen';
import JoinCodeForm from '../components/JoinCodeForm';
import OrbitLogo from '../components/OrbitLogo';

// Minimal page for students: type the code, that's it
const Join = () => (
    <SpaceScreen center>
        <div className="w-full max-w-md text-center">
            <div className="flex justify-center mb-4"><OrbitLogo size={56} /></div>
            <h1 className="text-3xl sm:text-4xl font-black">Join a game</h1>
            <p className="text-gray-400 mt-2 mb-6">Enter the 6-digit code shown on your teacher's screen.</p>
            <JoinCodeForm autoFocus dark />
            <p className="text-xs text-gray-500 mt-4">No account needed.</p>
            <Link to="/" className="inline-flex items-center gap-1.5 mt-8 text-sm font-semibold text-gray-400 hover:text-white">
                <ArrowLeft size={16} /> Orbit home
            </Link>
        </div>
    </SpaceScreen>
);

export default Join;
