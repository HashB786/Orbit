// Orbit's sound: every effect and every music track is synthesized with the Web Audio API.
// No audio files to download, small CPU cost, and it all respects the volume settings.
// The bigger soundtracks (Star Corsairs) use the richer instruments in ./studio.

import { buildStudio, setTempo, STUDIO_TRACKS, STUDIO_SFX } from './studio';

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
    },
    // Grid Battle: bouncy space-arcade loop in F major (F - Dm - Bb - C), plucky and game-show bright
    board: {
        tempo: 112,
        bars: [
            { bass: 41, chord: [65, 69, 72] },
            { bass: 38, chord: [62, 65, 69] },
            { bass: 46, chord: [62, 65, 70] },
            { bass: 48, chord: [64, 67, 72] }
        ],
        play(a, step, bar, t, stepDur) {
            const s = step % 16;
            // Walking bass on the beats, octave pop on the off-beats
            if (s % 4 === 0) a.tone({ midi: bar.bass, type: 'triangle', start: t, dur: stepDur * 1.8, gain: 0.08, attack: 0.004, release: 0.08, bus: a.musicBus, filter: 700 });
            if (s % 4 === 2) a.tone({ midi: bar.bass + 12, type: 'triangle', start: t, dur: stepDur * 0.9, gain: 0.05, attack: 0.004, release: 0.05, bus: a.musicBus, filter: 900 });
            if (s % 8 === 0) a.kick(t, 0.13);
            if (s === 4 || s === 12) a.noise({ start: t, dur: 0.06, gain: 0.035, type: 'highpass', freq: 3500, bus: a.musicBus });
            // Twinkly marimba-ish melody from the chord
            const melody = [2, null, 1, 0, null, 1, 2, null, 0, null, 2, 1, null, 0, 1, null];
            const idx = melody[s];
            if (idx !== null) a.tone({ midi: bar.chord[idx] + 12, type: 'sine', start: t, dur: stepDur * 0.5, gain: 0.05, attack: 0.002, release: 0.18, bus: a.musicBus });
        }
    },
    // Player battle: high-energy, punchy synth in E minor (Em - C - D - B) — phone adrenaline rush
    playerBattle: {
        tempo: 140,
        bars: [
            { bass: 40, chord: [64, 67, 71] },
            { bass: 36, chord: [60, 64, 67] },
            { bass: 38, chord: [62, 66, 69] },
            { bass: 35, chord: [59, 62, 66] },
            { bass: 40, chord: [64, 67, 71] },
            { bass: 36, chord: [60, 64, 67] },
            { bass: 38, chord: [62, 66, 69] },
            { bass: 35, chord: [59, 62, 66] }
        ],
        play(a, step, bar, t, stepDur, barIndex) {
            const s = step % 16;
            // Pumping sidechain-style bass
            if (s % 2 === 0) {
                a.tone({ midi: bar.bass + (s % 4 === 2 ? 12 : 0), type: 'sawtooth', start: t, dur: stepDur * 1.2, gain: 0.06, attack: 0.003, release: 0.06, bus: a.musicBus, filter: 600 });
            }
            // Four-on-the-floor kick with offbeat hat
            if (s % 4 === 0) a.kick(t, 0.22);
            if (s === 4 || s === 12) a.snare(t, 0.08);
            if (s % 2 === 1) a.hat(t, 0.015, 0.025);
            if (s % 4 === 2) a.hat(t, 0.025, 0.06);
            // Stabby chord on downbeat
            if (s === 0) {
                bar.chord.forEach(n => a.tone({ midi: n, type: 'square', start: t, dur: stepDur * 2, gain: 0.016, attack: 0.005, release: 0.08, bus: a.musicBus, filter: 1800 }));
            }
            // Fast arpeggio lead on second half
            if (barIndex >= 4) {
                const seq = [0, 2, 1, 2, 0, 1, 2, 0, 1, 0, 2, 1, 0, 2, 1, 2];
                const note = bar.chord[seq[s]] + 12;
                a.tone({ midi: note, type: 'sawtooth', start: t, dur: stepDur * 0.5, gain: 0.022, attack: 0.002, release: 0.04, bus: a.musicBus, filter: 3200 });
            }
        }
    },
    // Player lobby: groovy anticipation builder in G minor (Gm - Eb - F - D) — upbeat waiting music
    playerLobby: {
        tempo: 100,
        bars: [
            { bass: 43, chord: [58, 62, 67] },
            { bass: 39, chord: [55, 58, 63] },
            { bass: 41, chord: [57, 60, 65] },
            { bass: 38, chord: [54, 57, 62] }
        ],
        play(a, step, bar, t, stepDur) {
            const s = step % 16;
            // Bouncy bass with slides
            if (s === 0 || s === 6 || s === 10) {
                a.tone({ midi: bar.bass, type: 'triangle', start: t, dur: stepDur * 2, gain: 0.07, attack: 0.004, release: 0.1, bus: a.musicBus, filter: 600 });
            }
            if (s === 4 || s === 12) {
                a.tone({ midi: bar.bass + 12, type: 'triangle', start: t, dur: stepDur * 1.2, gain: 0.04, attack: 0.004, release: 0.06, bus: a.musicBus, filter: 800 });
            }
            // Shuffle kick/hat groove
            if (s % 4 === 0) a.kick(t, 0.14);
            if (s === 4 || s === 12) a.noise({ start: t, dur: 0.07, gain: 0.03, type: 'highpass', freq: 3000, bus: a.musicBus });
            if (s % 2 === 0) a.hat(t, 0.01, 0.035);
            // Funky chord stabs
            if (s === 0 || s === 7 || s === 10) {
                bar.chord.forEach(n => a.tone({ midi: n, type: 'triangle', start: t, dur: stepDur * 1.5, gain: 0.03, attack: 0.005, release: 0.2, bus: a.musicBus, filter: 1600 }));
            }
            // Melody plucks
            const melody = [2, null, 1, null, 0, null, 2, 1, null, 0, null, 2, 1, null, 0, null];
            if (melody[s] !== null) {
                a.tone({ midi: bar.chord[melody[s]] + 12, type: 'sine', start: t, dur: stepDur * 0.6, gain: 0.045, attack: 0.003, release: 0.15, bus: a.musicBus });
            }
        }
    },
    // Slingshot Siege: war drums under a heroic D minor march (Dm - Bb - F - C), melody in the second half
    siege: {
        tempo: 116,
        bars: [
            { bass: 38, chord: [62, 65, 69] },
            { bass: 46, chord: [58, 62, 65] },
            { bass: 41, chord: [60, 65, 69] },
            { bass: 48, chord: [60, 64, 67] },
            { bass: 38, chord: [62, 65, 69] },
            { bass: 46, chord: [58, 62, 65] },
            { bass: 41, chord: [60, 65, 69] },
            { bass: 45, chord: [57, 61, 64] }
        ],
        play(a, step, bar, t, stepDur, barIndex) {
            const s = step % 16;
            // Deep toms: BOOM . . boom . . . . BOOM . . boom
            if (s === 0 || s === 3 || s === 8 || s === 11) {
                a.tone({ freq: s % 8 === 0 ? 92 : 118, slideTo: 44, type: 'sine', start: t, dur: 0.17, gain: s % 8 === 0 ? 0.22 : 0.13, attack: 0.002, release: 0.08, bus: a.musicBus });
            }
            if (s === 4 || s === 12) a.snare(t, 0.065);
            if (s % 2 === 0) a.hat(t, s % 4 === 2 ? 0.016 : 0.008, 0.03);
            // Driving bass in eighths
            if (s % 2 === 0) {
                a.tone({ midi: bar.bass + (s === 6 || s === 14 ? 7 : 0), type: 'sawtooth', start: t, dur: stepDur * 1.4, gain: 0.05, attack: 0.004, release: 0.06, bus: a.musicBus, filter: 480 });
            }
            // Brassy stab on each downbeat
            if (s === 0) {
                bar.chord.forEach(n => a.tone({ midi: n, type: 'sawtooth', start: t, dur: stepDur * 3, gain: 0.02, attack: 0.03, release: 0.3, bus: a.musicBus, filter: 1400 }));
            }
            if (barIndex >= 4) {
                const melody = [0, null, 2, null, 1, null, 2, 1, 0, null, 1, null, 2, null, null, null];
                const idx = melody[s];
                if (idx !== null) a.tone({ midi: bar.chord[idx] + 12, type: 'triangle', start: t, dur: stepDur * 1.6, gain: 0.04, attack: 0.01, release: 0.15, bus: a.musicBus });
            }
        }
    },
    // Millionaire: slow, suspenseful pulse in C minor with a heartbeat bass and shimmering pad
    tension: {
        tempo: 76,
        bars: [
            { bass: 36, chord: [60, 63, 67] },
            { bass: 32, chord: [56, 60, 63] },
            { bass: 34, chord: [58, 62, 65] },
            { bass: 31, chord: [55, 59, 62] }
        ],
        play(a, step, bar, t, stepDur) {
            const s = step % 16;
            if (s === 0) {
                bar.chord.forEach(n => a.tone({ midi: n, type: 'sawtooth', start: t, dur: stepDur * 15, gain: 0.012, attack: 0.9, release: 0.9, bus: a.musicBus, filter: 1100 }));
            }
            // Heartbeat: lub-dub
            if (s === 0 || s === 8) {
                a.tone({ midi: bar.bass, type: 'sine', start: t, dur: stepDur * 0.9, gain: 0.12, attack: 0.005, release: 0.12, bus: a.musicBus });
                a.tone({ midi: bar.bass, type: 'sine', start: t + stepDur * 1.2, dur: stepDur * 0.7, gain: 0.07, attack: 0.005, release: 0.1, bus: a.musicBus });
            }
            // Clock-like tick and a high shimmer
            if (s % 2 === 0) a.noise({ start: t, dur: 0.02, gain: 0.012, type: 'highpass', freq: 8000, bus: a.musicBus });
            if (s === 6 || s === 14) a.tone({ midi: bar.chord[2] + 24, type: 'sine', start: t, dur: stepDur * 2, gain: 0.02, attack: 0.05, release: 0.6, bus: a.musicBus });
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
            this.attach(this.ctx);
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

    // Buses for a context: master (with a compressor), music and effects, and the studio's reverb,
    // echo and pumping bus. Tests render tracks with an OfflineAudioContext through this too.
    attach(ctx, { offline = false } = {}) {
        this.ctx = ctx;
        this.offline = offline;
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -12;
        comp.ratio.value = 4;
        comp.connect(ctx.destination);
        this.master = ctx.createGain();
        this.master.connect(comp);
        this.musicBus = ctx.createGain();
        this.sfxBus = ctx.createGain();
        this.musicBus.connect(this.master);
        this.sfxBus.connect(this.master);
        try {
            buildStudio(this);
        } catch {
            // Very old browsers: the studio tracks play straight into the music bus
            this.mix = this.musicBus;
            this.pumpBus = this.musicBus;
            this.revIn = ctx.createGain();
            this.dlyIn = ctx.createGain();
            this.curves = new Map();
        }
    }

    // Thinner studio synths (for weak devices or when the teacher picked a performance mode)
    setLite(on) {
        this.lite = !!on || this.liteDevice;
    }

    noiseBuf() {
        if (!this.noiseBuffer) {
            const len = this.ctx.sampleRate;
            this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
            const data = this.noiseBuffer.getChannelData(0);
            for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        }
        return this.noiseBuffer;
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
        const t0 = Math.max(start ?? ctx.currentTime, ctx.currentTime);
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuf();
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

    // quantize: wait for the next bar line, so a change of track (a mothership arriving) lands on the beat
    playMusic(trackId, { quantize = false } = {}) {
        this.desiredTrack = trackId;
        if (!this.ctx) return;
        if (this.trackId === trackId) {
            this.pendingTrack = null;
            return;
        }
        if (!TRACKS[trackId]) return;
        if (quantize && this.track) {
            this.pendingTrack = trackId;
            return;
        }
        this.startTrack(trackId);
    }

    startTrack(trackId) {
        clearInterval(this.schedulerTimer);
        this.pendingTrack = null;
        this.track = TRACKS[trackId];
        this.trackId = trackId;
        this.step = 0;
        this.nextTime = this.ctx.currentTime + 0.08;
        setTempo(this, this.track.tempo);
        if (!this.offline) {
            this.schedulerTimer = setInterval(() => this.scheduleMusic(), 50);
            this.scheduleMusic();
        }
    }

    stopMusic() {
        this.desiredTrack = null;
        this.pendingTrack = null;
        clearInterval(this.schedulerTimer);
        this.schedulerTimer = 0;
        this.track = null;
        this.trackId = null;
    }

    // Schedules every step up to `horizon` (a little ahead of now while playing live)
    scheduleMusic(horizon = this.ctx?.currentTime + 0.2) {
        if (!this.track || !this.ctx || (this.ctx.state !== 'running' && !this.offline)) return;
        // Skip ahead after the tab was hidden instead of playing a burst of old notes
        if (!this.offline && this.nextTime < this.ctx.currentTime - 0.2) this.nextTime = this.ctx.currentTime + 0.05;
        while (this.nextTime < horizon) {
            // A queued track starts on a bar line
            if (this.pendingTrack && this.step % 16 === 0) {
                this.track = TRACKS[this.pendingTrack];
                this.trackId = this.pendingTrack;
                this.pendingTrack = null;
                this.step = 0;
                setTempo(this, this.track.tempo);
            }
            const track = this.track;
            const stepDur = 60 / track.tempo / 4;
            const barIndex = Math.floor(this.step / 16);
            if (this.settings.music > 0 && !this.settings.muted) {
                track.play(this, this.step, track.bars[barIndex], this.nextTime, stepDur, barIndex);
            }
            this.nextTime += stepDur;
            this.step = (this.step + 1) % (track.bars.length * 16);
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
    // ---- Grid Battle tiles ----
    reveal: (a, t) => {
        a.noise({ start: t, dur: 0.25, gain: 0.07, type: 'bandpass', freq: 900, freqEnd: 4000, q: 2 });
        a.tone({ freq: 700, slideTo: 1400, type: 'sine', start: t, dur: 0.18, gain: 0.06, release: 0.1 });
    },
    question: (a, t) => arp(a, t, [72, 79, 84], { type: 'sine', gap: 0.05, dur: 0.12, gain: 0.08, release: 0.3 }),
    bomb: (a, t) => {
        a.tone({ freq: 1200, slideTo: 150, type: 'square', start: t, dur: 0.45, gain: 0.04, release: 0.05, filter: 2000 });
        a.noise({ start: t + 0.45, dur: 0.7, gain: 0.35, type: 'lowpass', freq: 2000, freqEnd: 80 });
        a.tone({ freq: 90, slideTo: 35, type: 'sine', start: t + 0.45, dur: 0.5, gain: 0.25, release: 0.2 });
    },
    bonus: (a, t) => {
        arp(a, t, [76, 81, 84, 88, 93], { type: 'triangle', gap: 0.05, dur: 0.08, gain: 0.1 });
        a.noise({ start: t + 0.2, dur: 0.4, gain: 0.05, type: 'highpass', freq: 7000 });
    },
    wind: (a, t) => {
        a.noise({ start: t, dur: 1.1, gain: 0.16, type: 'bandpass', freq: 300, freqEnd: 1800, q: 0.8 });
        a.noise({ start: t + 0.3, dur: 0.9, gain: 0.1, type: 'bandpass', freq: 1500, freqEnd: 250, q: 0.8 });
    },
    grenade: (a, t) => {
        a.tone({ freq: 2000, type: 'sine', start: t, dur: 0.04, gain: 0.08, release: 0.02 });
        a.tone({ freq: 2000, type: 'sine', start: t + 0.25, dur: 0.04, gain: 0.08, release: 0.02 });
        a.noise({ start: t + 0.5, dur: 0.6, gain: 0.3, type: 'lowpass', freq: 2500, freqEnd: 100 });
    },
    skip: (a, t) => arp(a, t, [67, 64, 60, 55], { type: 'square', gap: 0.08, dur: 0.07, gain: 0.04 }),
    blank: (a, t) => a.tone({ freq: 330, slideTo: 300, type: 'triangle', start: t, dur: 0.15, gain: 0.07, release: 0.15 }),
    // ---- Millionaire ----
    lockIn: (a, t) => {
        a.tone({ freq: 110, type: 'sawtooth', start: t, dur: 1.2, gain: 0.05, attack: 0.3, release: 0.4, filter: 500 });
        a.noise({ start: t, dur: 1.3, gain: 0.05, type: 'bandpass', freq: 200, freqEnd: 2500, q: 1.5 });
    },
    lifeline: (a, t) => {
        a.tone({ freq: 440, slideTo: 880, type: 'triangle', start: t, dur: 0.25, gain: 0.09, release: 0.1 });
        a.tone({ freq: 660, slideTo: 1320, type: 'sine', start: t + 0.05, dur: 0.25, gain: 0.05, release: 0.1 });
    },
    milestone: (a, t) => {
        arp(a, t, [72, 76, 79, 84, 88], { type: 'square', gap: 0.07, dur: 0.07, gain: 0.04 });
        [72, 79, 84].forEach(m => a.tone({ midi: m, type: 'triangle', start: t + 0.36, dur: 0.6, gain: 0.07, release: 0.5 }));
    },
    podium: (a, t) => {
        arp(a, t, [67, 72, 76, 79, 84], { type: 'square', gap: 0.11, dur: 0.1, gain: 0.05 });
        [60, 64, 67, 72, 76].forEach(m => a.tone({ midi: m, type: 'triangle', start: t + 0.6, dur: 1.1, gain: 0.06, attack: 0.02, release: 0.8 }));
        a.noise({ start: t + 0.6, dur: 0.8, gain: 0.05, type: 'highpass', freq: 5000 });
    },
    // ---- Player excitement ----
    streak: (a, t) => {
        arp(a, t, [76, 79, 84, 88, 91], { type: 'triangle', gap: 0.04, dur: 0.06, gain: 0.1, release: 0.08 });
        a.noise({ start: t + 0.15, dur: 0.3, gain: 0.04, type: 'highpass', freq: 8000 });
    },
    // ---- Slingshot Siege ----
    launch: (a, t) => {
        a.noise({ start: t, dur: 0.35, gain: 0.1, type: 'bandpass', freq: 600, freqEnd: 2600, q: 1.2 });
        a.tone({ freq: 260, slideTo: 820, type: 'triangle', start: t, dur: 0.22, gain: 0.07, release: 0.06 });
    },
    impact: (a, t) => {
        a.noise({ start: t, dur: 0.5, gain: 0.26, type: 'lowpass', freq: 1600, freqEnd: 90 });
        a.tone({ freq: 140, slideTo: 38, type: 'sine', start: t, dur: 0.35, gain: 0.2, release: 0.12 });
    },
    burn: (a, t) => {
        a.noise({ start: t, dur: 0.6, gain: 0.08, type: 'highpass', freq: 2500, freqEnd: 6000 });
        a.tone({ freq: 90, slideTo: 60, type: 'sawtooth', start: t, dur: 0.4, gain: 0.04, release: 0.15, filter: 400 });
    },
    fizzle: (a, t) => a.tone({ freq: 520, slideTo: 180, type: 'sine', start: t, dur: 0.35, gain: 0.06, release: 0.12 }),
    slingshot: (a, t) => {
        arp(a, t, [72, 79, 84, 88, 91, 96], { type: 'triangle', gap: 0.045, dur: 0.07, gain: 0.09, release: 0.12 });
        a.noise({ start: t + 0.1, dur: 0.5, gain: 0.05, type: 'highpass', freq: 7000 });
    },
    shieldDown: (a, t) => {
        a.tone({ freq: 880, slideTo: 220, type: 'square', start: t, dur: 0.3, gain: 0.05, release: 0.08, filter: 2200 });
        a.tone({ freq: 660, type: 'square', start: t + 0.34, dur: 0.12, gain: 0.05, release: 0.05, filter: 2000 });
        a.tone({ freq: 440, type: 'square', start: t + 0.5, dur: 0.18, gain: 0.05, release: 0.08, filter: 1800 });
    },
    timeUp: (a, t) => {
        a.tone({ freq: 330, type: 'square', start: t, dur: 0.16, gain: 0.07, release: 0.05, filter: 1400 });
        a.tone({ freq: 247, type: 'square', start: t + 0.2, dur: 0.45, gain: 0.08, release: 0.15, filter: 1200 });
        a.noise({ start: t + 0.2, dur: 0.35, gain: 0.04, type: 'lowpass', freq: 900 });
    },
    timeWarning: (a, t) => {
        a.tone({ freq: 880, type: 'square', start: t, dur: 0.06, gain: 0.06, release: 0.03, filter: 2000 });
        a.tone({ freq: 880, type: 'square', start: t + 0.1, dur: 0.06, gain: 0.06, release: 0.03, filter: 2000 });
    },
    fastest: (a, t) => {
        arp(a, t, [84, 88, 91, 96], { type: 'square', gap: 0.05, dur: 0.06, gain: 0.06 });
        a.tone({ midi: 96, type: 'triangle', start: t + 0.22, dur: 0.4, gain: 0.09, release: 0.3 });
        a.noise({ start: t + 0.22, dur: 0.35, gain: 0.04, type: 'highpass', freq: 6000 });
    },
    streakBreak: (a, t) => {
        a.tone({ freq: 440, slideTo: 220, type: 'sawtooth', start: t, dur: 0.2, gain: 0.05, release: 0.1, filter: 800 });
    },
    gameStart: (a, t) => {
        arp(a, t, [60, 64, 67, 72, 76, 79, 84], { type: 'triangle', gap: 0.06, dur: 0.08, gain: 0.08, release: 0.12 });
        a.noise({ start: t + 0.35, dur: 0.5, gain: 0.06, type: 'highpass', freq: 5000 });
    },
    // ----- Star Corsairs -----
    laser: (a, t) => a.tone({ freq: 1400, slideTo: 380, type: 'sawtooth', start: t, dur: 0.12, gain: 0.035, release: 0.04, filter: 4000 }),
    crit: (a, t) => {
        a.tone({ freq: 1900, slideTo: 300, type: 'sawtooth', start: t, dur: 0.18, gain: 0.045, release: 0.05, filter: 5000 });
        arp(a, t + 0.03, [88, 95], { type: 'square', gap: 0.04, dur: 0.05, gain: 0.045 });
    },
    mine: (a, t) => {
        a.noise({ start: t, dur: 0.12, gain: 0.13, type: 'bandpass', freq: 900, freqEnd: 300, q: 1.5 });
        a.tone({ freq: 1900, type: 'sine', start: t + 0.03, dur: 0.06, gain: 0.035, release: 0.05 });
    },
    plunder: (a, t) => {
        arp(a, t, [79, 83, 86, 91, 95], { type: 'square', gap: 0.05, dur: 0.06, gain: 0.045 });
        a.noise({ start: t + 0.2, dur: 0.25, gain: 0.04, type: 'highpass', freq: 6000 });
    },
    raided: (a, t) => {
        a.tone({ freq: 660, slideTo: 220, type: 'square', start: t, dur: 0.3, gain: 0.045, release: 0.08, filter: 1800 });
        a.noise({ start: t, dur: 0.25, gain: 0.1, type: 'lowpass', freq: 900, freqEnd: 200 });
    },
    shieldUp: (a, t) => {
        a.tone({ freq: 400, slideTo: 1200, type: 'sine', start: t, dur: 0.25, gain: 0.06, release: 0.1 });
        arp(a, t + 0.12, [76, 83], { type: 'sine', gap: 0.06, dur: 0.1, gain: 0.05 });
    },
    cloak: (a, t) => {
        a.noise({ start: t, dur: 0.4, gain: 0.07, type: 'bandpass', freq: 3000, freqEnd: 400, q: 2 });
        a.tone({ freq: 900, slideTo: 200, type: 'sine', start: t, dur: 0.4, gain: 0.04, release: 0.1 });
    },
    alarm: (a, t) => [0, 0.45].forEach(o => a.tone({ freq: 520, slideTo: 880, type: 'sawtooth', start: t + o, dur: 0.4, gain: 0.045, release: 0.05, filter: 2000 })),
    bossDown: (a, t) => {
        a.noise({ start: t, dur: 0.9, gain: 0.32, type: 'lowpass', freq: 2200, freqEnd: 80 });
        arp(a, t + 0.25, [67, 72, 76, 79, 84], { gap: 0.09, dur: 0.14, gain: 0.1 });
    },
    jackpot: (a, t) => {
        arp(a, t, [72, 76, 79, 84, 88, 91, 96], { type: 'square', gap: 0.045, dur: 0.07, gain: 0.045 });
        a.noise({ start: t + 0.3, dur: 0.4, gain: 0.05, type: 'highpass', freq: 7000 });
    },
    upgrade: (a, t) => {
        arp(a, t, [60, 67, 72, 79], { type: 'triangle', gap: 0.07, dur: 0.1, gain: 0.09 });
        a.tone({ freq: 300, slideTo: 900, type: 'square', start: t, dur: 0.3, gain: 0.02, release: 0.08, filter: 1500 });
    }
};

Object.assign(TRACKS, STUDIO_TRACKS);
Object.assign(SFX, STUDIO_SFX);

export const audio = new AudioEngine();
