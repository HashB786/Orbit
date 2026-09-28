// Tiny toast notifications: toast('Saved!') from anywhere, <Toaster /> renders them.

import React, { useSyncExternalStore } from 'react';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

let toasts = [];
const listeners = new Set();
const emit = () => listeners.forEach(cb => cb());

export const toast = (message, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    toasts = [...toasts, { id, message, type }].slice(-3);
    emit();
    setTimeout(() => {
        toasts = toasts.filter(t => t.id !== id);
        emit();
    }, type === 'error' ? 5000 : 2800);
};

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info };
const COLORS = { success: 'text-emerald-500', error: 'text-red-500', info: 'text-sky-500' };

export const Toaster = () => {
    const list = useSyncExternalStore(
        (cb) => {
            listeners.add(cb);
            return () => listeners.delete(cb);
        },
        () => toasts
    );
    return (
        <div className="fixed z-[300] bottom-20 md:bottom-6 inset-x-0 flex flex-col items-center gap-2 px-4 pointer-events-none" aria-live="polite">
            {list.map(t => {
                const Icon = ICONS[t.type] || Info;
                return (
                    <div key={t.id} className="pointer-events-auto flex items-center gap-2.5 max-w-md w-full sm:w-auto px-4 py-3 rounded-2xl bg-gray-900 text-white shadow-xl text-sm font-medium">
                        <Icon size={18} className={`${COLORS[t.type]} shrink-0`} />
                        <span className="min-w-0">{t.message}</span>
                    </div>
                );
            })}
        </div>
    );
};
