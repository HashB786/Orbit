import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSetsState } from '../../platform/sets/store';
import { PageSpinner, Spinner } from '../ui';
import SpaceScreen from '../SpaceScreen';
import AuthPanel from './AuthPanel';
import { VerifyEmail, AcceptTerms, SetPassword } from './AccountSteps';

// level='account'  — sign-in + terms only; no email verification needed (creating sets)
// level='teacher'  — sign-in + verify + terms (hosting games, default)
const RequireTeacher = ({ children, reason = 'create', fullscreen = false, level = 'teacher' }) => {
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

    const needs = level === 'account' ? auth.needsForCreate : auth.needs;

    if (auth.status !== 'ready' || needs === 'loading') return loading;
    if (needs === 'signin') return frame(<AuthPanel reason={reason} />);
    if (needs === 'verify') return frame(<VerifyEmail />);
    if (needs === 'terms') return frame(<AcceptTerms />);
    if (needs === 'setPassword') return frame(<SetPassword />);
    // Editors read the user's sets on first render, so wait until they've loaded
    if (!sets.ready || sets.owner !== auth.user.uid) return loading;
    return children;
};

export default RequireTeacher;
