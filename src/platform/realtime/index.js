// Picks the realtime backend: Firebase when configured, otherwise the offline test mode.

import { isRealtimeConfigured } from '../../config/firebase';

let instance = null;

export const realtimeMode = isRealtimeConfigured ? 'firebase' : 'local';

export const getRealtime = () => {
    if (!instance) {
        instance = (isRealtimeConfigured
            ? import('./firebase').then(m => m.createFirebaseRealtime())
            : import('./local').then(m => {
                m.pruneLocalRooms();
                return new m.LocalRealtime({ clientId: getDeviceId() });
            })
        ).catch(err => {
            instance = null;
            throw err;
        });
    }
    return instance;
};

// Stable id for this browser (offline mode ownership); Firebase mode uses the anonymous uid instead
export const getDeviceId = () => {
    try {
        let id = localStorage.getItem('orbit.deviceId');
        if (!id) {
            id = `d${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
            localStorage.setItem('orbit.deviceId', id);
        }
        return id;
    } catch {
        return `d${Math.random().toString(36).slice(2, 10)}`;
    }
};

// Id for this browser tab, so several tabs can join the same room as different players while testing
export const getTabId = () => {
    try {
        let id = sessionStorage.getItem('orbit.tabId');
        if (!id) {
            id = Math.random().toString(36).slice(2, 8);
            sessionStorage.setItem('orbit.tabId', id);
        }
        return id;
    } catch {
        return Math.random().toString(36).slice(2, 8);
    }
};
