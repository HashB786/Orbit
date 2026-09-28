// Orbit's sound: every effect and both music tracks are synthesized with the Web Audio API.
// No audio files to download, tiny CPU cost, and it all respects the volume settings.

const SETTINGS_KEY = 'orbit.audio';
const DEFAULTS = { music: 0.5, sfx: 0.8, muted: false };

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---------- MUSIC ----------
// Each track: tempo, 16 steps per bar, a chord per bar. Parts are scheduled step by step.

const TRACKS = {
    // Calm, dreamy lobby loop in A minor (Am - F - C - G)
    lobby: {
        tempo: 92,
        bars: [
            { bass: 45, chord: [57, 60, 64] },
            { bass: 41, chord: [53, 57, 60] },
            { bass: 48, chord: [60, 64, 67] },
            { bass: 43, chord: [55, 59, 62] }
        ],
        play(a, step, bar, t, stepDur) {
            const s = step % 16;
            if (s === 0) {
                bar.chord.forEach(n => a.tone({ midi: n, type: 'triangle', start: t, dur: stepDur * 15, gain: 0.035, attack: 0.35, release: 0.6, bus: a.musicBus, filter: 1400 }));
            }
            if (s === 0 || s === 8) {
                a.tone({ midi: bar.bass, type: 'sawtooth', start: t, dur: stepDur * 3, gain: 0.05, attack: 0.01, release: 0.2, bus: a.musicBus, filter: 380 });
                a.kick(t, 0.12);
            }
            if (s % 2 === 0) {
                const pattern = [0, 1, 2, 1, 0, 2, 1, 2];
                const note = bar.chord[pattern[(s / 2) % 8]] + 12;
                a.tone({ midi: note, type: 'sine', start: t, dur: stepDur * 1.2, gain: 0.04, attack: 0.005, release: 0.25, bus: a.musicBus });
                a.hat(t + stepDur, 0.012, 0.03);
            }
        }
    },
    // Driving battle loop in D minor (Dm - Bb - C - A), lead arpeggio on the second half
    battle: {
        tempo: 128,
        bars: [
            { bass: 38, chord: [62, 65, 69] },
            { bass: 46, chord: [58, 62, 65] },
            { bass: 48, chord: [60, 64, 67] },
            { bass: 45, chord: [57, 61, 64] },
            { bass: 38, chord: [62, 65, 69] },
            { bass: 46, chord: [58, 62, 65] },
            { bass: 48, chord: [60, 64, 67] },
            { bass: 45, chord: [57, 61, 64] }
        ],
        play(a, step, bar, t, stepDur, barIndex) {
            const s = step % 16;
            const bassPattern = [0, null, 0, null, 12, null, 0, null, 0, null, 12, null, 7, null, 12, null];
            if (bassPattern[s] !== null) {
                a.tone({ midi: bar.bass + bassPattern[s], type: 'sawtooth', start: t, dur: stepDur * 1.6, gain: 0.055, attack: 0.005, release: 0.08, bus: a.musicBus, filter: 520 });
            }
            if (s % 4 === 0) a.kick(t, 0.2);
            if (s === 4 || s === 12) a.snare(t, 0.07);
            a.hat(t, s % 4 === 2 ? 0.02 : 0.009, s % 4 === 2 ? 0.07 : 0.025);
            if (s === 0) {
                bar.chord.forEach(n => a.tone({ midi: n, type: 'sawtooth', start: t, dur: stepDur * 14, gain: 0.014, attack: 0.08, release: 0.3, bus: a.musicBus, filter: 900 }));
            }
            if (barIndex >= 4) {
                const arp = [0, 1, 2, 1];
                const note = bar.chord[arp[s % 4]] + 12;
                a.tone({ midi: note, type: 'square', start: t, dur: stepDur * 0.7, gain: 0.018, attack: 0.002, release: 0.05, bus: a.musicBus, filter: 2600 });
            }
        }
    }
};

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.settings = this.loadSettings();
        this.listeners = new Set();
        this.track = null;
        this.trackId = null;
        this.schedulerTimer = 0;
        this.noiseBuffer = null;
        this.lastPlayed = new Map();
    }

    loadSettings() {
        try {
            return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
        } catch {
            return { ...DEFAULTS };
        }
    }

    getSettings = () => this.settings;

    subscribe = (cb) => {
        this.listeners.add(cb);
        return () => this.listeners.delete(cb);
    };

    updateSettings(patch) {
        this.settings = { ...this.settings, ...patch };
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
        } catch {
            /* ignore */
        }
        this.applyVolumes();
        this.listeners.forEach(cb => cb());
    }

    // Must be called from a user gesture (click/tap) before any sound can play
    unlock() {
        if (typeof window === 'undefined') return;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        if (!this.ctx) {
            try {
                this.ctx = new Ctx({ latencyHint: 'interactive' });
            } catch {
                return;
            }
            const comp = this.ctx.createDynamicsCompressor();
            comp.threshold.value = -12;
            comp.ratio.value = 4;
            comp.connect(this.ctx.destination);
            this.master = this.ctx.createGain();
            this.master.connect(comp);
            this.musicBus = this.ctx.createGain();
            this.sfxBus = this.ctx.createGain();
            this.musicBus.connect(this.master);
            this.sfxBus.connect(this.master);
            this.applyVolumes();

            document.addEventListener('visibilitychange', () => {
                if (!this.ctx) return;
                if (document.hidden) this.ctx.suspend().catch(() => {});
                else this.ctx.resume().catch(() => {});
            });
        }
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        // Music asked for before the first tap starts now
        if (this.desiredTrack && !this.trackId) this.playMusic(this.desiredTrack);
    }

    applyVolumes() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const muted = this.settings.muted;
        this.master.gain.setTargetAtTime(muted ? 0 : 1, t, 0.05);
        this.musicBus.gain.setTargetAtTime(this.settings.music * 0.9, t, 0.1);
        this.sfxBus.gain.setTargetAtTime(this.settings.sfx, t, 0.05);
    }

    get ready() {
        return !!this.ctx && this.ctx.state === 'running' && !this.settings.muted;
    }

    // ---------- building blocks ----------

    tone({ midi, freq, type = 'sine', start, dur = 0.15, gain = 0.2, attack = 0.005, release = 0.08, slideTo = null, bus, filter = null }) {
        const ctx = this.ctx;
        const t0 = Math.max(start ?? ctx.currentTime, ctx.currentTime);
        const f = freq ?? mtof(midi);
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(f, t0);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
        g.gain.setValueAtTime(gain, t0 + Math.max(attack, dur));
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(attack, dur) + release);

        let node = osc;
        if (filter) {
            const lp = ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.value = filter;
            osc.connect(lp);
            node = lp;
        }
        node.connect(g);
        g.connect(bus || this.sfxBus);
        osc.start(t0);
        osc.stop(t0 + Math.max(attack, dur) + release + 0.05);
    }

    noise({ start, dur = 0.2, gain = 0.2, type = 'lowpass', freq = 2000, freqEnd = null, q = 0.7, bus }) {
        const ctx = this.ctx;
        if (!this.noiseBuffer) {
            const len = ctx.sampleRate;
            this.noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
            const data = this.noiseBuffer.getChannelData(0);
            for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        }
        const t0 = Math.max(start ?? ctx.currentTime, ctx.currentTime);
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = type;
        filter.frequency.setValueAtTime(freq, t0);
        if (freqEnd) filter.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
        filter.Q.value = q;
        const g = ctx.createGain();
        g.gain.setValueAtTime(gain, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(filter);
        filter.connect(g);
        g.connect(bus || this.sfxBus);
        src.start(t0, Math.random() * 0.5);
        src.stop(t0 + dur + 0.05);
    }

    kick(t, gain = 0.2) {
        this.tone({ freq: 140, slideTo: 42, type: 'sine', start: t, dur: 0.14, gain, attack: 0.002, release: 0.05, bus: this.musicBus });
    }

    snare(t, gain = 0.07) {
        this.noise({ start: t, dur: 0.13, gain, type: 'bandpass', freq: 1900, q: 0.8, bus: this.musicBus });
    }

    hat(t, gain = 0.012, dur = 0.03) {
        this.noise({ start: t, dur, gain, type: 'highpass', freq: 7000, bus: this.musicBus });
    }

    // ---------- SOUND EFFECTS ----------

    sfx(name) {
        if (!this.ready) return;
        // Avoid machine-gun stacking of the same sound in the same instant
        const now = this.ctx.currentTime;
        if (now - (this.lastPlayed.get(name) || 0) < 0.03) return;
        this.lastPlayed.set(name, now);
        const t = now + 0.005;
        const fx = SFX[name];
        if (fx) fx(this, t);
    }

    // ---------- MUSIC ----------

    playMusic(trackId) {
        this.desiredTrack = trackId;
        if (!this.ctx || this.trackId === trackId) return;
        clearInterval(this.schedulerTimer);
        const track = TRACKS[trackId];
        if (!track) return;
        this.track = track;
        this.trackId = trackId;
        this.step = 0;
        this.nextTime = this.ctx.currentTime + 0.08;
        this.schedulerTimer = setInterval(() => this.scheduleMusic(), 50);
        this.scheduleMusic();
    }

    stopMusic() {
        this.desiredTrack = null;
        clearInterval(this.schedulerTimer);
        this.schedulerTimer = 0;
        this.track = null;
        this.trackId = null;
    }

    scheduleMusic() {
        const track = this.track;
        if (!track || !this.ctx || this.ctx.state !== 'running') return;
        const stepDur = 60 / track.tempo / 4;
        const totalSteps = track.bars.length * 16;
        // Skip ahead after the tab was hidden instead of playing a burst of old notes
        if (this.nextTime < this.ctx.currentTime - 0.2) this.nextTime = this.ctx.currentTime + 0.05;
        while (this.nextTime < this.ctx.currentTime + 0.2) {
            const barIndex = Math.floor(this.step / 16);
            if (this.settings.music > 0 && !this.settings.muted) {
                track.play(this, this.step, track.bars[barIndex], this.nextTime, stepDur, barIndex);
            }
            this.nextTime += stepDur;
            this.step = (this.step + 1) % totalSteps;
        }
    }
}

const arp = (a, t, notes, { type = 'triangle', gap = 0.07, dur = 0.09, gain = 0.12, release = 0.15 } = {}) =>
    notes.forEach((m, i) => a.tone({ midi: m, type, start: t + i * gap, dur, gain, release }));

const SFX = {
    click: (a, t) => a.tone({ freq: 1250, type: 'sine', start: t, dur: 0.025, gain: 0.07, release: 0.03 }),
    shoot: (a, t) => a.tone({ freq: 920, slideTo: 260, type: 'square', start: t, dur: 0.08, gain: 0.045, release: 0.03, filter: 3000 }),
    hit: (a, t) => arp(a, t, [84, 91], { gap: 0.045, dur: 0.05, gain: 0.1 }),
    correct: (a, t) => {
        arp(a, t, [84, 88, 91, 96], { gap: 0.06, dur: 0.07, gain: 0.11 });
        a.noise({ start: t + 0.2, dur: 0.25, gain: 0.05, type: 'highpass', freq: 6000 });
    },
    wrong: (a, t) => {
        a.tone({ freq: 220, slideTo: 95, type: 'sawtooth', start: t, dur: 0.22, gain: 0.08, release: 0.08, filter: 900 });
        a.noise({ start: t, dur: 0.12, gain: 0.08, freq: 900 });
    },
    explode: (a, t) => a.noise({ start: t, dur: 0.45, gain: 0.3, type: 'lowpass', freq: 1800, freqEnd: 120 }),
    stun: (a, t) => [0, 1, 2, 3].forEach(i => a.tone({ freq: i % 2 ? 190 : 250, type: 'square', start: t + i * 0.06, dur: 0.05, gain: 0.04, release: 0.02, filter: 1500 })),
    countdown: (a, t) => a.tone({ freq: 660, type: 'sine', start: t, dur: 0.1, gain: 0.14, release: 0.08 }),
    go: (a, t) => {
        a.tone({ freq: 990, type: 'sine', start: t, dur: 0.22, gain: 0.14, release: 0.12 });
        a.tone({ freq: 1485, type: 'triangle', start: t, dur: 0.22, gain: 0.06, release: 0.12 });
    },
    tick: (a, t) => a.tone({ freq: 1600, type: 'sine', start: t, dur: 0.02, gain: 0.05, release: 0.02 }),
    roundWin: (a, t) => arp(a, t, [79, 84, 88], { gap: 0.07, gain: 0.13 }),
    roundLose: (a, t) => arp(a, t, [76, 72, 69], { gap: 0.09, gain: 0.09 }),
    bothMiss: (a, t) => a.tone({ midi: 57, slideTo: mtof(50), type: 'sawtooth', start: t, dur: 0.35, gain: 0.07, release: 0.1, filter: 700 }),
    matchWin: (a, t) => {
        arp(a, t, [72, 76, 79, 84], { type: 'square', gap: 0.1, dur: 0.1, gain: 0.05 });
        [72, 76, 79, 84].forEach(m => a.tone({ midi: m, type: 'triangle', start: t + 0.42, dur: 0.5, gain: 0.07, release: 0.4 }));
    },
    matchLose: (a, t) => arp(a, t, [69, 65, 62], { gap: 0.13, dur: 0.14, gain: 0.08 }),
    join: (a, t) => a.tone({ freq: 520, slideTo: 1040, type: 'sine', start: t, dur: 0.09, gain: 0.09, release: 0.06 }),
    whoosh: (a, t) => a.noise({ start: t, dur: 0.5, gain: 0.12, type: 'bandpass', freq: 400, freqEnd: 3200, q: 1.2 }),
    podium: (a, t) => {
        arp(a, t, [67, 72, 76, 79, 84], { type: 'square', gap: 0.11, dur: 0.1, gain: 0.05 });
        [60, 64, 67, 72, 76].forEach(m => a.tone({ midi: m, type: 'triangle', start: t + 0.6, dur: 1.1, gain: 0.06, attack: 0.02, release: 0.8 }));
        a.noise({ start: t + 0.6, dur: 0.8, gain: 0.05, type: 'highpass', freq: 5000 });
    }
};

export const audio = new AudioEngine();
