import React from 'react';
import { Toggle, Stepper, Segmented } from '../ui';
import { settingLabel, settingHelp, optionLabel } from '../../platform/games/registry';
import { useT } from '../../context/LanguageContext';

// Renders a game's settings schema (see platform/games/registry.js)
const SettingsForm = ({ game, value, onChange }) => {
    const t = useT();
    const set = (key, v) => onChange({ ...value, [key]: v });
    return (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {game.settings.filter(s => !s.showIf || s.showIf(value)).map(s => {
                // A setting's help can depend on the other settings (e.g. the chosen mode)
                const help = settingHelp(t, game, s, value);
                const label = settingLabel(t, game, s);
                const options = s.options?.map(o => ({ value: o.value, label: optionLabel(t, game, s, o) }));
                return (
                    <div key={s.key} className="py-3.5 first:pt-0 last:pb-0">
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
            })}
        </div>
    );
};

export default SettingsForm;
