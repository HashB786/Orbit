import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, addDoc, getDocs, doc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';

export const useQuestionSets = () => {
    // Local Sets (localStorage)
    const [localSets, setLocalSets] = useState(() => {
        const saved = localStorage.getItem('gridBattleQuestions');
        const initial = saved ? JSON.parse(saved) : {};
        // Ensure Demo Set exists
        if (!initial['Demo: General Knowledge']) {
            initial['Demo: General Knowledge'] = [
                { q: "What is the capital of France?", a: "Paris" },
                { q: "Which planet is known as the Red Planet?", a: "Mars" },
                { q: "What is 7 x 8?", a: "56" },
                { q: "Who painted the Mona Lisa?", a: "Leonardo da Vinci" },
                { q: "What is the largest mammal in the world?", a: "Blue Whale" }
            ];
        }
        return initial;
    });

    // Public Sets (Firestore or Mock)
    const [publicSets, setPublicSets] = useState([]);
    const [loadingPublic, setLoadingPublic] = useState(false);
    const [error, setError] = useState(null);
    const [isMockMode, setIsMockMode] = useState(false);

    // Check Config on Mount
    useEffect(() => {
        if (db.app.options.apiKey === "YOUR_API_KEY") {
            setIsMockMode(true);
        }
    }, []);

    // Sync Local Sets
    useEffect(() => {
        localStorage.setItem('gridBattleQuestions', JSON.stringify(localSets));
    }, [localSets]);

    // Fetch Public Sets
    const fetchPublicSets = async () => {
        setLoadingPublic(true);
        setError(null);

        if (isMockMode) {
            // SIMULATION MODE
            setTimeout(() => {
                const mockData = localStorage.getItem('gridBattleMockPublic');
                setPublicSets(mockData ? JSON.parse(mockData) : []);
                setLoadingPublic(false);
            }, 500); // Fake delay
            return;
        }

        try {
            const q = query(collection(db, "question_sets"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const sets = [];
            querySnapshot.forEach((doc) => {
                sets.push({ id: doc.id, ...doc.data() });
            });
            setPublicSets(sets);
        } catch (err) {
            console.error("Error fetching public sets:", err);
            // Fallback to mock if real fetch fails
            setIsMockMode(true);
            const mockData = localStorage.getItem('gridBattleMockPublic');
            setPublicSets(mockData ? JSON.parse(mockData) : []);
        } finally {
            setLoadingPublic(false);
        }
    };

    // Actions
    const saveLocalSet = (name, questions) => {
        setLocalSets(prev => ({ ...prev, [name]: questions }));
    };

    const deleteLocalSet = (name) => {
        setLocalSets(prev => {
            const next = { ...prev };
            delete next[name];
            return next;
        });
    };

    const publishSet = async (name, author, questions) => {
        if (isMockMode) {
            // SIMULATION MODE
            const newSet = {
                id: 'mock_' + Date.now(),
                name,
                author,
                questions,
                createdAt: new Date().toISOString(),
                likes: 0
            };
            const currentMock = JSON.parse(localStorage.getItem('gridBattleMockPublic') || '[]');
            const updatedMock = [newSet, ...currentMock];
            localStorage.setItem('gridBattleMockPublic', JSON.stringify(updatedMock));
            fetchPublicSets(); // Refresh
            return true;
        }

        try {
            await addDoc(collection(db, "question_sets"), {
                name,
                author,
                questions,
                createdAt: serverTimestamp(),
                likes: 0
            });
            // Refresh public list
            fetchPublicSets();
            return true;
        } catch (err) {
            console.error("Error publishing set:", err);
            setError("Failed to publish. Check internet or Firebase config.");
            return false;
        }
    };

    const deletePublicSet = async (id) => {
        if (isMockMode) {
            // SIMULATION MODE
            const currentMock = JSON.parse(localStorage.getItem('gridBattleMockPublic') || '[]');
            const updatedMock = currentMock.filter(s => s.id !== id);
            localStorage.setItem('gridBattleMockPublic', JSON.stringify(updatedMock));
            setPublicSets(updatedMock);
            return true;
        }

        try {
            await deleteDoc(doc(db, "question_sets", id));
            // Refresh public list
            const newSets = publicSets.filter(s => s.id !== id);
            setPublicSets(newSets);
            return true;
        } catch (err) {
            console.error("Error deleting set:", err);
            setError("Failed to delete set.");
            return false;
        }
    };

    return {
        localSets,
        publicSets,
        loadingPublic,
        error,
        isMockMode,
        saveLocalSet,
        deleteLocalSet,
        deletePublicSet,
        fetchPublicSets,
        publishSet
    };
};
