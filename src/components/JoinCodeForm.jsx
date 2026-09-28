import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { audio } from '../platform/audio/audio';

// 6-digit room code box. Shows the code as "123 456" but keeps only digits.
const JoinCodeForm = ({ autoFocus = false, initial = '' }) => {
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
                    size={8}
                    autoComplete="off"
                    autoFocus={autoFocus}
                    aria-label="Game code"
                    placeholder="Game code"
                    className="w-full sm:w-auto flex-1 min-w-0 text-center sm:text-left text-2xl font-black tracking-[0.2em] placeholder:tracking-normal placeholder:font-semibold rounded-2xl px-5 py-3.5 outline-none border-2 transition-colors bg-white/[0.08] border-white/15 text-white placeholder:text-white/45 focus:border-primary-300 focus:bg-white/[0.12]"
                />
                <button type="submit" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-b from-primary-400 to-primary-600 hover:from-primary-300 hover:to-primary-500 text-white font-black text-lg shadow-[0_10px_30px_-10px_rgb(var(--color-primary-400))] transition-colors">
                    Launch <ArrowRight size={20} />
                </button>
            </div>
            {error && <p className="mt-2 text-sm font-semibold text-amber-200" role="alert">{error}</p>}
        </form>
    );
};

export default JoinCodeForm;
