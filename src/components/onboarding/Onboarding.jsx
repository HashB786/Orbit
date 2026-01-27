import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../../context/UserContext';
import { useTheme } from '../../context/ThemeContext';
import { ChevronRight, Check } from 'lucide-react';

const Onboarding = () => {
    const { userData, updateUserData } = useUser();
    const { setColorTheme, setTheme } = useTheme();
    const [step, setStep] = useState(0);
    const [form, setForm] = useState({
        name: '',
        grade: '8',
        classColor: 'green',
        theme: 'light'
    });

    if (userData.isOnboarded) return null;

    const handleNext = () => {
        if (step < 3) setStep(step + 1);
        else handleFinish();
    };

    const handleFinish = () => {
        updateUserData({
            name: form.name || 'Student',
            grade: form.grade,
            classColor: form.classColor,
            isOnboarded: true
        });
        setColorTheme(form.classColor, true);
        setTheme(form.theme, true);
    };

    const variants = {
        enter: { x: 50, opacity: 0 },
        center: { x: 0, opacity: 1 },
        exit: { x: -50, opacity: 0 }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-dark-surface p-8 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden relative"
            >
                {/* Progress Bar */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100 dark:bg-gray-800">
                    <motion.div
                        className="h-full bg-primary-500"
                        animate={{ width: `${((step + 1) / 4) * 100}%` }}
                    />
                </div>

                <div className="mt-4 min-h-[300px] flex flex-col">
                    <AnimatePresence mode="wait">
                        {step === 0 && (
                            <motion.div key="step0" variants={variants} initial="enter" animate="center" exit="exit" className="flex-1">
                                <h2 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-teal-500">Welcome to Orbit</h2>
                                <p className="text-gray-500 mb-8">Let's set up your personalized dashboard.</p>

                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">What should we call you?</label>
                                <input
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="Enter your name"
                                    className="w-full text-xl border-b-2 border-gray-200 focus:border-primary-500 bg-transparent py-2 outline-none transition-colors"
                                    autoFocus
                                />
                            </motion.div>
                        )}

                        {step === 1 && (
                            <motion.div key="step1" variants={variants} initial="enter" animate="center" exit="exit" className="flex-1">
                                <h2 className="text-2xl font-bold mb-6">Select your Grade</h2>
                                <div className="grid grid-cols-3 gap-3">
                                    {[5, 6, 7, 8, 9, 10, 11].map(g => (
                                        <button
                                            key={g}
                                            onClick={() => setForm({ ...form, grade: String(g) })}
                                            className={`p-4 rounded-xl border-2 font-bold text-lg transition-all ${form.grade === String(g) ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-gray-100 hover:border-gray-300'}`}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div key="step2" variants={variants} initial="enter" animate="center" exit="exit" className="flex-1">
                                <h2 className="text-2xl font-bold mb-6">Your Class Color</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setForm({ ...form, classColor: 'green' })}
                                        className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${form.classColor === 'green' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-500 ring-offset-2' : 'border-gray-200 opacity-60 hover:opacity-100'}`}
                                    >
                                        <div className="w-12 h-12 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30" />
                                        <span className="font-bold text-emerald-700 dark:text-emerald-400">Green Class</span>
                                    </button>
                                    <button
                                        onClick={() => setForm({ ...form, classColor: 'blue' })}
                                        className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${form.classColor === 'blue' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500 ring-offset-2' : 'border-gray-200 opacity-60 hover:opacity-100'}`}
                                    >
                                        <div className="w-12 h-12 rounded-full bg-blue-500 shadow-lg shadow-blue-500/30" />
                                        <span className="font-bold text-blue-700 dark:text-blue-400">Blue Class</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div key="step3" variants={variants} initial="enter" animate="center" exit="exit" className="flex-1">
                                <h2 className="text-2xl font-bold mb-6">Appearance</h2>
                                <div className="space-y-3">
                                    <button
                                        onClick={() => setForm({ ...form, theme: 'light' })}
                                        className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all ${form.theme === 'light' ? 'border-primary-500 bg-gray-50 text-gray-900 ring-1 ring-primary-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        <span className="font-medium">Light Mode</span>
                                        {form.theme === 'light' && <Check className="text-primary-500" />}
                                    </button>
                                    <button
                                        onClick={() => setForm({ ...form, theme: 'dark' })}
                                        className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all ${form.theme === 'dark' ? 'border-primary-500 bg-gray-800 text-white' : 'border-gray-200'}`}
                                    >
                                        <span className="font-medium">Dark Mode</span>
                                        {form.theme === 'dark' && <Check className="text-primary-500" />}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                    <button
                        onClick={handleFinish}
                        className="text-gray-400 hover:text-gray-600 font-medium text-sm px-4 py-2"
                    >
                        Skip
                    </button>

                    <button
                        onClick={handleNext}
                        className="bg-primary-500 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-primary-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                        {step === 3 ? "Get Started" : "Continue"} <ChevronRight size={18} />
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default Onboarding;
