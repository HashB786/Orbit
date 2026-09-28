import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { audio } from '../platform/audio/audio';

// 6-digit room code box. Shows the code as "123 456" but keeps only digits.
const JoinCodeForm = ({ autoFocus = false, dark = false, initial = '' }) => {
    const navigate = useNavigate();
    const [code, setCode] = useState(initial.replace(/\D/g, '').slice(0, 6));
    const [error, setError] = useState('');

    const submit = (e) => {
        e.preventDefault();
        audio.unlock();
        if (code.length !== 6) {
            setError('Game codes have 6 digits.');
            return;
        }
        navigate(`/play/${code}`);
    };

    const display = code.length > 3 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;

    return (
        <form onSubmit={submit} className="w-full" noValidate>
            <div className="flex flex-col sm:flex-row gap-2">
                <input
                    value={display}
                    onChange={e => {
                        setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                        setError('');
                    }}
                    inputMode="numeric"
                    autoComplete="off"
                    autoFocus={autoFocus}
                    aria-label="Game code"
                    placeholder="Game code"
                    className={`flex-1 min-w-0 text-center sm:text-left text-2xl font-black tracking-[0.2em] placeholder:tracking-normal placeholder:font-semibold rounded-2xl px-5 py-3.5 outline-none border-2 transition-colors ${dark
                        ? 'bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white'
                        : 'bg-white border-transparent text-gray-900 placeholder:text-gray-400 focus:border-primary-300'}`}
                />
                <button type="submit" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white font-black text-lg transition-colors">
                    Join <ArrowRight size={20} />
                </button>
            </div>
            {error && <p className={`mt-2 text-sm font-semibold ${dark ? 'text-amber-200' : 'text-red-500'}`} role="alert">{error}</p>}
        </form>
    );
};

export default JoinCodeForm;
