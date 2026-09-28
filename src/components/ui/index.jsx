// Small shared UI pieces used across the platform pages.

import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, CircleDot, ToggleLeft, PenLine, ListChecks, ArrowDownUp, Loader2 } from 'lucide-react';
import { QUESTION_TYPES } from '../../platform/questions/types';
import IconOrb from '../art/IconOrb';

export { IconOrb };

export const cx = (...parts) => parts.filter(Boolean).join(' ');

// ---------- buttons (class helpers keep markup readable) ----------

export const btn = {
    primary: 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-b from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-bold shadow-[0_8px_22px_-10px_rgb(var(--color-primary-500)/0.9)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 dark:bg-white/[0.06] dark:hover:bg-white/10 dark:border-white/10 text-gray-800 dark:text-gray-100 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
    ghost: 'inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06] font-semibold transition-colors disabled:opacity-50',
    danger: 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-colors disabled:opacity-50',
    icon: 'inline-flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 transition-colors disabled:opacity-40'
};

export const inputClass = 'w-full bg-white dark:bg-[#070c21] border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500';

export const cardClass = 'orbit-card';

// Title row used by every main page: icon planet, gradient title, subtitle and optional actions
export const PageHeader = ({ icon, tone, title, subtitle, actions }) => (
    <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
            {icon && <IconOrb icon={icon} tone={tone} size={52} className="hidden sm:inline-flex" />}
            <div className="min-w-0">
                <h1 className="orbit-title text-3xl md:text-4xl leading-tight pb-0.5">{title}</h1>
                {subtitle && <p className="text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
            </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
);

// ---------- feedback ----------

export const Spinner = ({ className = '', size = 24 }) => (
    <Loader2 size={size} className={cx('animate-spin text-primary-500', className)} aria-label="Loading" />
);

export const PageSpinner = () => (
    <div className="flex items-center justify-center py-24"><Spinner size={32} /></div>
);

export const EmptyState = ({ icon: Icon, title, children, action, tone = 'slate' }) => (
    <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-gray-300/80 dark:border-white/10 bg-white/40 dark:bg-white/[0.02]">
        {Icon && <div className="flex justify-center mb-4"><IconOrb icon={Icon} tone={tone} size={64} /></div>}
        <h3 className="font-bold text-gray-800 dark:text-gray-100">{title}</h3>
        {children && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">{children}</p>}
        {action && <div className="mt-4">{action}</div>}
    </div>
);

// ---------- form controls ----------

export const Toggle = ({ checked, onChange, label, help, disabled }) => {
    const id = useId();
    return (
        <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
                <label htmlFor={id} className="font-semibold text-sm text-gray-800 dark:text-gray-100">{label}</label>
                {help && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{help}</p>}
            </div>
            <button
                id={id}
                type="button"
                role="switch"
                aria-checked={!!checked}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={cx(
                    'relative shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-50',
                    checked ? 'bg-primary-500' : 'bg-gray-300 dark:bg-white/15'
                )}
            >
                <span className={cx('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
            </button>
        </div>
    );
};

export const Stepper = ({ value, onChange, min, max, step = 1, suffix = '', label }) => {
    const set = (v) => onChange(Math.min(max, Math.max(min, v)));
    return (
        <div className="flex items-center justify-between gap-4">
            {label && <span className="font-semibold text-sm text-gray-800 dark:text-gray-100 min-w-0">{label}</span>}
            <div className="flex items-center gap-1 shrink-0 bg-gray-100 dark:bg-white/[0.06] rounded-xl p-1">
                <button type="button" aria-label={`Decrease ${label || ''}`} onClick={() => set(value - step)} disabled={value <= min}
                    className="w-9 h-8 rounded-lg font-bold text-lg hover:bg-white dark:hover:bg-white/10 disabled:opacity-30 transition-colors">−</button>
                <span className="min-w-[3.25rem] text-center font-bold tabular-nums text-sm">{value}{suffix && <span className="text-gray-400 font-medium ml-0.5">{suffix}</span>}</span>
                <button type="button" aria-label={`Increase ${label || ''}`} onClick={() => set(value + step)} disabled={value >= max}
                    className="w-9 h-8 rounded-lg font-bold text-lg hover:bg-white dark:hover:bg-white/10 disabled:opacity-30 transition-colors">+</button>
            </div>
        </div>
    );
};

export const Segmented = ({ value, onChange, options, className = '', size = 'md' }) => (
    <div className={cx('grid gap-1 p-1 rounded-xl bg-gray-100 dark:bg-white/[0.06]', className)}
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map(opt => (
            <button
                key={String(opt.value)}
                type="button"
                aria-pressed={value === opt.value}
                disabled={opt.disabled}
                onClick={() => onChange(opt.value)}
                className={cx(
                    'flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors truncate disabled:opacity-40',
                    size === 'sm' ? 'px-2 py-1.5 text-xs' : 'px-2 py-2 text-sm',
                    value === opt.value
                        ? 'bg-white dark:bg-primary-500/20 text-primary-600 dark:text-primary-200 shadow-sm'
                        : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100'
                )}
            >
                {opt.icon && <opt.icon size={15} className="shrink-0" />}
                <span className="truncate">{opt.label}</span>
            </button>
        ))}
    </div>
);

// ---------- question types ----------

export const TYPE_ICONS = { mc: CircleDot, tf: ToggleLeft, typed: PenLine, multi: ListChecks, order: ArrowDownUp };

const TYPE_COLORS = {
    mc: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    tf: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    typed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    multi: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    order: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
};

export const TypeBadge = ({ type, short = true, className = '' }) => {
    const Icon = TYPE_ICONS[type];
    const info = QUESTION_TYPES[type];
    if (!info) return null;
    return (
        <span className={cx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap', TYPE_COLORS[type], className)}>
            {Icon && <Icon size={12} />} {short ? info.short : info.label}
        </span>
    );
};

// ---------- modal ----------

export const Modal = ({ open, onClose, title, children, footer, size = 'md' }) => {
    const panelRef = useRef(null);
    // Keep the latest onClose without re-running the effect (which would steal focus from inputs)
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') onCloseRef.current?.();
        };
        document.addEventListener('keydown', onKey);
        const previous = document.activeElement;
        panelRef.current?.focus();
        return () => {
            document.removeEventListener('keydown', onKey);
            if (previous instanceof HTMLElement) previous.focus();
        };
    }, [open]);

    if (!open) return null;
    const width = size === 'lg' ? 'max-w-2xl' : size === 'sm' ? 'max-w-sm' : 'max-w-lg';

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4">
            <div className="absolute inset-0 bg-[#030513]/70" onClick={onClose} />
            <div
                ref={panelRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label={typeof title === 'string' ? title : undefined}
                className={cx('relative w-full bg-white dark:bg-[#0b1230] border border-transparent dark:border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] outline-none text-gray-900 dark:text-gray-100', width)}
            >
                <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
                    <h2 className="font-display text-xl font-bold min-w-0 truncate">{title}</h2>
                    <button onClick={onClose} className={btn.icon} aria-label="Close"><X size={18} /></button>
                </div>
                <div className="px-5 pb-5 overflow-y-auto">{children}</div>
                {footer && <div className="px-5 py-4 border-t border-gray-100 dark:border-white/10 flex flex-wrap justify-end gap-2 pb-safe">{footer}</div>}
            </div>
        </div>,
        document.body
    );
};

export const ConfirmDialog = ({ open, title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) => (
    <Modal
        open={open}
        onClose={onCancel}
        title={title}
        size="sm"
        footer={(
            <>
                <button className={btn.secondary} onClick={onCancel}>Cancel</button>
                <button className={danger ? btn.danger : btn.primary} onClick={onConfirm}>{confirmLabel}</button>
            </>
        )}
    >
        <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
    </Modal>
);
