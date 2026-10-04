import React, { useEffect, useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Toggle, Stepper, Segmented, cx } from '../ui';
import { settingLabel, settingHelp, optionLabel } from '../../platform/games/registry';
import { useT } from '../../context/LanguageContext';

const SettingRow = ({ game, s, value, set }) => {
    const t = useT();
    // A setting's help can depend on the other settings (e.g. the chosen mode)
    const help = settingHelp(t, game, s, value);
    const label = settingLabel(t, game, s);
    const options = s.options?.map(o => ({ value: o.value, label: optionLabel(t, game, s, o) }));
    return (
        <div className="py-3.5 first:pt-0 last:pb-0">
            {s.type === 'toggle' && (
                <Toggle label={label} help={help} checked={!!value[s.key]} onChange={v => set(s.key, v)} />
            )}
            {s.type === 'number' && (
                <>
                    <Stepper label={label} value={value[s.key]} min={s.min} max={s.max} step={s.step || 1} suffix={s.suffix ? t(s.suffix) : undefined} onChange={v => set(s.key, v)} />
                    {help && <p className="text-xs text-gray-500 mt-1">{help}</p>}
                </>
            )}
            {(s.type === 'segmented' || s.type === 'select') && (
                <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">{label}</span>
                        {s.type === 'segmented' || options.length <= 3 ? (
                            <Segmented value={value[s.key]} onChange={v => set(s.key, v)} options={options} size="sm" className="sm:w-72" />
                        ) : (
                            <select
                                value={String(value[s.key])}
                                onChange={e => set(s.key, options.find(o => String(o.value) === e.target.value)?.value ?? s.default)}
                                className="sm:w-72 bg-gray-100 dark:bg-white/[0.06] rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-500/30"
                                aria-label={label}
                            >
                                {options.map(o => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
                            </select>
                        )}
                    </div>
                    {help && <p className="text-xs text-gray-500 mt-1.5">{help}</p>}
                </>
            )}
        </div>
    );
};

// Renders a game's settings schema (see platform/games/registry.js): the essentials,
// then everything marked `advanced` behind a button. `forceOpen` reveals the advanced part
// (e.g. when one of its values makes the settings invalid).
const SettingsForm = ({ game, value, onChange, forceOpen = false }) => {
    const t = useT();
    const [open, setOpen] = useState(false);
    const set = (key, v) => onChange({ ...value, [key]: v });

    useEffect(() => {
        if (forceOpen) setOpen(true);
    }, [forceOpen]);

    const visible = game.settings.filter(s => !s.showIf || s.showIf(value));
    const basic = visible.filter(s => !s.advanced);
    const advanced = visible.filter(s => s.advanced);
    const changed = advanced.filter(s => value[s.key] !== s.default).length;

    return (
        <div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {basic.map(s => <SettingRow key={s.key} game={game} s={s} value={value} set={set} />)}
            </div>
            {advanced.length > 0 && (
                <div className={cx(basic.length > 0 && 'mt-4 pt-3 border-t border-gray-100 dark:border-gray-800')}>
                    <button
                        type="button"
                        onClick={() => setOpen(o => !o)}
                        aria-expanded={open}
                        className="w-full flex items-center justify-between gap-2 py-1.5 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
                    >
                        <span className="inline-flex items-center gap-2">
                            <SlidersHorizontal size={16} /> {t('host.advanced')}
                            {changed > 0 && <span className="px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-600 dark:text-primary-300 text-[11px] font-bold">{t('host.advancedChanged', { count: changed })}</span>}
                        </span>
                        <ChevronDown size={18} className={cx('shrink-0 transition-transform', open && 'rotate-180')} />
                    </button>
                    {open && (
                        <div className="mt-3 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] px-3.5 py-3.5 divide-y divide-gray-100 dark:divide-gray-800">
                            {advanced.map(s => <SettingRow key={s.key} game={game} s={s} value={value} set={set} />)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SettingsForm;
