import React, { lazy, Suspense, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SpaceScreen from '../components/SpaceScreen';
import { Spinner } from '../components/ui';
import { useSet } from '../components/sets/useSet';
import { getGame } from '../platform/games/registry';
import { selectQuestions } from '../platform/questions/compat';

const PracticeGame = lazy(() => import('../games/comet-clash/Practice'));

// Solo practice with any set, played as Comet Clash
const Practice = () => {
    const { setId } = useParams();
    const navigate = useNavigate();
    const { set, loading } = useSet(setId);
    const questions = useMemo(() => (set ? selectQuestions(getGame('comet-clash'), set.questions) : []), [set]);

    if (loading) return <SpaceScreen center><Spinner size={36} className="text-emerald-400" /></SpaceScreen>;
    if (!set || questions.length === 0) {
        return (
            <SpaceScreen center>
                <div className="max-w-sm text-center">
                    <p className="text-lg font-bold">{set ? 'This set has no questions that can be practiced yet.' : 'Set not found.'}</p>
                    <Link to={set ? `/set/${set.id}` : '/discover'} className="inline-block mt-6 px-6 py-3 rounded-2xl bg-emerald-500 text-gray-950 font-black">Go back</Link>
                </div>
            </SpaceScreen>
        );
    }

    return (
        <Suspense fallback={<SpaceScreen center><Spinner size={36} className="text-emerald-400" /></SpaceScreen>}>
            <PracticeGame set={set} questions={questions} onExit={() => navigate(`/set/${set.id}`)} />
        </Suspense>
    );
};

export default Practice;
