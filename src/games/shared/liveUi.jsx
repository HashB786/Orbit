import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { audio } from '../../platform/audio/audio';
import { roomPath, isOnline } from '../../platform/rooms/rooms';
import { getTabId } from '../../platform/realtime';
import { useT } from '../../context/LanguageContext';

// Small building blocks shared by live games (teacher screen + student devices)

export const Pill = ({ children, className = '' }) => (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-sm font-semibold ${className}`}>{children}</span>
);

export const HostButton = ({ children, onClick, variant = 'ghost', disabled, title }) => (
    <button
        onClick={(e) => { e.currentTarget.blur(); onClick?.(e); }}
        disabled={disabled}
        title={title}
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${variant === 'primary'
            ? 'px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-gray-950 text-lg'
            : variant === 'danger'
                ? 'px-3 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-300'
                : 'px-3 py-2 bg-white/10 hover:bg-white/15 text-white'}`}
    >
        {children}
    </button>
);

export const SoundToggle = () => {
    const t = useT();
    const [muted, setMuted] = useState(audio.getSettings().muted);
    return (
        <HostButton
            title={muted ? t('common.unmute') : t('common.mute')}
            onClick={() => {
                audio.unlock();
                audio.updateSettings({ muted: !muted });
                setMuted(!muted);
            }}
        >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </HostButton>
    );
};

// One host tab drives a game; a second tab asks before taking over.
// Returns { claim: 'checking' | 'mine' | 'other', takeOver, offlineFor() }
export const useHostClaim = (rt, code, hostNode) => {
    const tabId = getTabId();
    const [claim, setClaim] = useState('checking');
    const offlineFor = useRef(0);

    useEffect(() => {
        if (!rt) return undefined;
        let cancelled = false;
        (async () => {
            const host = await rt.get(roomPath(code, 'host'));
            if (cancelled) return;
            // How long no host screen was running (tab closed, crash): the controller decides what to do
            offlineFor.current = host?.lastSeen && !isOnline(host, rt.now()) ? Math.max(0, rt.now() - host.lastSeen) : 0;
            const busyElsewhere = host?.tab && host.tab !== tabId && isOnline(host, rt.now());
            if (busyElsewhere) setClaim('other');
            else {
                await rt.update(roomPath(code, 'host'), { tab: tabId });
                setClaim('mine');
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [rt, code, tabId]);

    // Another tab took over
    useEffect(() => {
        if (claim === 'mine' && hostNode?.tab && hostNode.tab !== tabId) setClaim('other');
    }, [claim, hostNode, tabId]);

    const takeOver = async () => {
        await rt.update(roomPath(code, 'host'), { tab: tabId, connected: true, lastSeen: rt.now() });
        setClaim('mine');
    };

    // Read once by the controller when it starts
    const takeOfflineFor = () => {
        const value = offlineFor.current;
        offlineFor.current = 0;
        return value;
    };

    return { claim, takeOver, takeOfflineFor };
};

// Keep phones and tablets awake while playing
export const useWakeLock = (active) => {
    useEffect(() => {
        if (!active || !('wakeLock' in navigator)) return undefined;
        let lock = null;
        let released = false;
        const request = () => navigator.wakeLock.request('screen').then(l => { lock = l; }).catch(() => {});
        request();
        const onVisible = () => {
            if (!document.hidden && !released) request();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            released = true;
            document.removeEventListener('visibilitychange', onVisible);
            lock?.release().catch(() => {});
        };
    }, [active]);
};
