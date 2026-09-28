import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSetsState } from '../../platform/sets/store';
import { PageSpinner, Spinner } from '../ui';
import SpaceScreen from '../SpaceScreen';
import AuthPanel from './AuthPanel';
import { VerifyEmail, AcceptTerms } from './AccountSteps';

// Pages for creating and hosting: shows sign-in, "verify your email" or "accept the terms"
// until the teacher is fully set up. Joining a game never goes through this.
const RequireTeacher = ({ children, reason = 'create', fullscreen = false }) => {
    const auth = useAuth();
    const sets = useSetsState();

    useEffect(() => {
        auth.start().catch(() => {});
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const frame = (node) => (fullscreen
        ? <SpaceScreen center>{node}</SpaceScreen>
        : <div className="flex justify-center py-4 md:py-10">{node}</div>);

    const loading = fullscreen
        ? <SpaceScreen center><Spinner size={36} className="text-emerald-400" /></SpaceScreen>
        : <PageSpinner />;

    if (auth.status !== 'ready' || auth.needs === 'loading') return loading;
    if (auth.needs === 'signin') return frame(<AuthPanel reason={reason} />);
    if (auth.needs === 'verify') return frame(<VerifyEmail />);
    if (auth.needs === 'terms') return frame(<AcceptTerms />);
    // Editors read the teacher's sets on first render, so wait until they've loaded
    if (!sets.ready || sets.owner !== auth.user.uid) return loading;
    return children;
};

export default RequireTeacher;
