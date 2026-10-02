import React, { useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageSpinner } from '../components/ui';
import AuthPanel from '../components/auth/AuthPanel';
import { VerifyEmail, AcceptTerms } from '../components/auth/AccountSteps';

// /signin?next=/create  (also where the verification email link comes back to)
const SignIn = () => {
    const auth = useAuth();
    const [params] = useSearchParams();
    const next = params.get('next');
    const safeNext = next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/create';
    // Only hosting needs a verified email; creating and copying sets just need an account
    const needs = params.has('verify') || /^\/(host|room|board)\//.test(safeNext) ? auth.needs : auth.needsForCreate;

    useEffect(() => {
        auth.start().then(() => {
            if (params.get('verified') === '1') auth.refresh().catch(() => {});
        }).catch(() => {});
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (auth.status !== 'ready' || needs === 'loading') return <PageSpinner />;
    if (auth.user && !needs) return <Navigate to={safeNext} replace />;

    return (
        <div className="flex justify-center py-4 md:py-10">
            {needs === 'verify' ? <VerifyEmail />
                : needs === 'terms' ? <AcceptTerms />
                    : <AuthPanel initialMode={params.get('mode') === 'signup' ? 'signup' : 'signin'} />}
        </div>
    );
};

export default SignIn;
