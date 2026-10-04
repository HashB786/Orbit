import React, { useEffect, useRef, useState } from 'react';
import { audio } from '../../platform/audio/audio';
import { useT } from '../../context/LanguageContext';

// Countdown ring for the smart-board games. Remount it (new `key`) for each question.
// `running={false}` freezes it (answer revealed, answer locked in...). `onExpire` fires once at zero.
const QuestionTimer = ({ seconds, running, onExpire, size = 84, sound = true }) => {
    const t = useT();
    const totalMs = seconds * 1000;
    const [left, setLeft] = useState(totalMs);
    const leftRef = useRef(totalMs);
    const expireRef = useRef(onExpire);
    expireRef.current = onExpire;

    useEffect(() => {
        if (!running || leftRef.current <= 0) return undefined;
        const end = performance.now() + leftRef.current;
        let lastSecond = Math.ceil(leftRef.current / 1000);
        const id = setInterval(() => {
            const ms = Math.max(0, end - performance.now());
            leftRef.current = ms;
            setLeft(ms);
            const second = Math.ceil(ms / 1000);
            if (second !== lastSecond) {
                lastSecond = second;
                if (sound && second > 0 && second <= 3) audio.sfx('countdown');
                else if (sound && second > 0 && second <= 5) audio.sfx('tick');
            }
            if (ms <= 0) {
                clearInterval(id);
                if (sound) audio.sfx('timeUp');
                expireRef.current?.();
            }
        }, 200);
        return () => clearInterval(id);
    }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

    const frac = totalMs > 0 ? left / totalMs : 0;
    const color = frac > 0.5 ? '#34d399' : frac > 0.2 ? '#fbbf24' : '#f87171';
    const r = 42;
    const circumference = 2 * Math.PI * r;
    return (
        <div className="relative shrink-0" style={{ width: size, height: size }} role="timer" aria-label={t('board.secondsLeft', { count: Math.ceil(left / 1000) })}>
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden>
                <circle cx="50" cy="50" r={r} fill="rgba(11,17,40,0.9)" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                <circle
                    cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={circumference} strokeDashoffset={circumference * (1 - frac)}
                    style={{ transition: 'stroke-dashoffset 0.2s linear, stroke 0.3s' }}
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-black tabular-nums text-white" style={{ fontSize: size * 0.34, color: frac <= 0.2 ? color : undefined }}>
                {Math.ceil(left / 1000)}
            </span>
        </div>
    );
};

export default QuestionTimer;
