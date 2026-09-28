import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SpaceScreen from '../components/SpaceScreen';
import JoinCodeForm from '../components/JoinCodeForm';
import HeroArt from '../components/art/HeroArt';

// Minimal page for students: type the code, that's it
const Join = () => (
    <SpaceScreen center>
        <div className="w-full max-w-md text-center">
            <HeroArt className="w-56 sm:w-64 h-auto mx-auto -mt-4 -mb-2" />
            <h1 className="font-display font-bold text-4xl sm:text-5xl tracking-tight">Join a <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-300 via-sky-300 to-violet-300">game</span></h1>
            <p className="text-gray-400 mt-2 mb-6">Enter the 6-digit code shown on your teacher's screen.</p>
            <JoinCodeForm autoFocus />
            <p className="text-xs text-gray-500 mt-4">No account needed.</p>
            <Link to="/" className="inline-flex items-center gap-1.5 mt-8 text-sm font-semibold text-gray-400 hover:text-white">
                <ArrowLeft size={16} /> Orbit home
            </Link>
        </div>
    </SpaceScreen>
);

export default Join;
