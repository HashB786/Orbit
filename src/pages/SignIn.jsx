import React, { useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageSpinner } from '../components/ui';
import AuthPanel from '../components/auth/AuthPanel';
import { AcceptTerms } from '../components/auth/AccountSteps';

// /signin?next=/create
const SignIn = () => {
    const auth = useAuth();
    const [params] = useSearchParams();
    const next = params.get('next');
    const safeNext = next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/create';

    useEffect(() => {
        auth.start().catch(() => {});
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (auth.status !== 'ready' || auth.needs === 'loading') return <PageSpinner />;
    if (auth.user && !auth.needs) return <Navigate to={safeNext} replace />;

    return (
        <div className="flex justify-center py-4 md:py-10">
            {auth.needs === 'terms' ? <AcceptTerms />
                : <AuthPanel initialMode={params.get('mode') === 'signup' ? 'signup' : 'signin'} />}
        </div>
    );
};

export default SignIn;
