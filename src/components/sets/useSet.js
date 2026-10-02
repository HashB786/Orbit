import { useEffect, useState } from 'react';
import { findLocalSet, useMySets, useSetsState } from '../../platform/sets/store';
import { fetchPublicSet } from '../../platform/sets/publicSets';
import { useAuth } from '../../context/AuthContext';

// Finds a set by id wherever it lives: my sets, featured sets or the public library
export const useSet = (setId) => {
    const mySets = useMySets();
    const sets = useSetsState();
    const auth = useAuth();
    const local = setId ? findLocalSet(setId) : null;
    const [remote, setRemote] = useState({ id: null, set: null, loading: false, error: null });

    useEffect(() => {
        if (!setId || local || !setId.startsWith('p_')) return undefined;
        let cancelled = false;
        setRemote({ id: setId, set: null, loading: true, error: null });
        fetchPublicSet(setId)
            .then(set => !cancelled && setRemote({ id: setId, set, loading: false, error: set ? null : 'not-found' }))
            .catch(() => !cancelled && setRemote({ id: setId, set: null, loading: false, error: 'network' }));
        return () => {
            cancelled = true;
        };
        // mySets: re-check local sets when they change
    }, [setId, local, mySets]);

    if (local) return { set: local, loading: false, error: null, isMine: local.id.startsWith('l_') };
    if (setId?.startsWith('l_')) {
        // A user's own set: wait for the account and its sets before saying "not found"
        const settling = auth.status === 'loading' || (!!auth.user && (!sets.ready || sets.owner !== auth.user.uid));
        if (settling) return { set: null, loading: true, error: null, isMine: false };
        return { set: null, loading: false, error: auth.user ? 'not-found' : 'private', isMine: false };
    }
    if (!setId || !setId.startsWith('p_')) return { set: null, loading: false, error: 'not-found', isMine: false };
    const current = remote.id === setId ? remote : { set: null, loading: true, error: null };
    return { set: current.set, loading: current.loading, error: current.error, isMine: false };
};
