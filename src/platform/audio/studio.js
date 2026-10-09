// Orbit's studio: richer instruments for the big soundtracks, still all synthesized with the Web Audio
// API (no audio files). Wide detuned synths, a punchy kick that makes the pads and bass "pump"
// (sidechain), layered claps, risers and impacts, all through a generated reverb room and a
// tempo-synced echo. Used by the Star Corsairs lobby, battle and mothership tracks and their stingers.

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Effects for an audio context; `a` is the audio engine (ctx, musicBus already made)
export const buildStudio = (a) => {
    const ctx = a.ctx;
    // The studio tracks sit a little hotter than the older ones; this keeps them balanced with effects
    a.mix = ctx.createGain();
    a.mix.gain.value = 0.6;
    a.mix.connect(a.musicBus);
    // Pads and bass go through here; every kick ducks it for a moment (the "pump")
    a.pumpBus = ctx.createGain();
    a.pumpBus.connect(a.mix);

    // Weak devices (2 cores or less, or 2 GB or less) get thinner synths and no reverb on single notes
    const nav = typeof navigator !== 'undefined' ? navigator : {};
    a.liteDevice = (nav.hardwareConcurrency || 4) <= 2 || (nav.deviceMemory || 4) <= 2;
    a.lite = a.liteDevice;

    // Reverb: a room generated from decaying noise
    const len = Math.floor(ctx.sampleRate * (a.liteDevice ? 1 : 1.6));
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    a.revIn = ctx.createConvolver();
    a.revIn.buffer = ir;
    const revOut = ctx.createGain();
    revOut.gain.value = 0.5;
    a.revIn.connect(revOut);
    revOut.connect(a.mix);

    // Echo: dotted eighths, a little darker every repeat
    a.dlyIn = ctx.createGain();
    a.delay = ctx.createDelay(2);
    a.delay.delayTime.value = 0.35;
    const fb = ctx.createGain();
    fb.gain.value = 0.36;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2600;
    const out = ctx.createGain();
    out.gain.value = 0.45;
    a.dlyIn.connect(a.delay);
    a.delay.connect(tone);
    tone.connect(fb);
    fb.connect(a.delay);
    tone.connect(out);
    out.connect(a.mix);
    const wet = ctx.createGain();
    wet.gain.value = 0.3;
    out.connect(wet);
    wet.connect(a.revIn);
    a.curves = new Map();
};

// The echo follows the tempo
export const setTempo = (a, bpm) => {
    if (a.delay) a.delay.delayTime.setValueAtTime((60 / bpm) * 0.75, a.ctx.currentTime);
};

const curve = (a, amount) => {
    let c = a.curves.get(amount);
    if (!c) {
        c = new Float32Array(1024);
        for (let i = 0; i < 1024; i++) {
            const x = (i / 1023) * 2 - 1;
            c[i] = Math.tanh(x * amount) / Math.tanh(amount);
        }
        a.curves.set(amount, c);
    }
    return c;
};

// Filter sweeps are recalculated once per block instead of every sample: far cheaper, sounds the same
const blockRate = (param) => {
    try {
        param.automationRate = 'k-rate';
    } catch {
        // older browsers: per sample
    }
};

const sends = (a, node, rev, dly) => {
    if (rev) {
        const s = a.ctx.createGain();
        s.gain.value = rev;
        node.connect(s);
        s.connect(a.revIn);
    }
    if (dly) {
        const s = a.ctx.createGain();
        s.gain.value = dly;
        node.connect(s);
        s.connect(a.dlyIn);
    }
};

// One note: a stack of detuned oscillators spread across the stereo field → drive → filter → envelope
export const synth = (a, {
    midi, freq, type = 'sawtooth', t, dur = 0.2, attack = 0.005, release = 0.12, gain = 0.05,
    voices = 1, spread = 12, width = 0.7, cutoff = 0, cutoffTo = 0, sweep = 0, q = 0.7, filterType = 'lowpass',
    drive = 0, vibrato = 0, slideTo = 0, wobble = null, dest = null, rev = 0, dly = 0
}) => {
    const ctx = a.ctx;
    const t0 = Math.max(t, ctx.currentTime);
    const f = freq || mtof(midi);
    const hold = t0 + Math.max(attack, dur);
    const stop = hold + release + 0.05;
    const peak = gain / Math.sqrt(a.lite ? Math.min(voices, 2) : voices);
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    amp.gain.setValueAtTime(peak, hold);
    amp.gain.exponentialRampToValueAtTime(0.0001, hold + release);
    let input = amp;
    if (cutoff) {
        const flt = ctx.createBiquadFilter();
        flt.type = filterType;
        flt.Q.value = q;
        if (cutoffTo || wobble) blockRate(flt.frequency);
        flt.frequency.setValueAtTime(cutoff, t0);
        if (cutoffTo) flt.frequency.exponentialRampToValueAtTime(cutoffTo, t0 + (sweep || Math.max(attack, dur)));
        // Wobble: the filter swings open and shut every `period` seconds
        if (wobble) {
            for (let x = t0; x < hold; x += wobble.period) {
                flt.frequency.setValueAtTime(wobble.hi, x);
                flt.frequency.exponentialRampToValueAtTime(wobble.lo, x + wobble.period * 0.92);
            }
        }
        flt.connect(input);
        input = flt;
    }
    if (drive) {
        const sh = ctx.createWaveShaper();
        sh.curve = curve(a, drive);
        sh.connect(input);
        input = sh;
    }
    const count = a.lite ? Math.min(voices, 2) : voices;
    let sides = null;
    if (count > 1 && width && ctx.createStereoPanner) {
        sides = [-width, width].map(pan => {
            const p = ctx.createStereoPanner();
            p.pan.value = pan;
            p.connect(input);
            return p;
        });
    }
    let wobbleDepth = null;
    if (vibrato) {
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 5.2;
        wobbleDepth = ctx.createGain();
        wobbleDepth.gain.setValueAtTime(0, t0);
        wobbleDepth.gain.linearRampToValueAtTime(vibrato, t0 + Math.min(0.3, dur));
        lfo.connect(wobbleDepth);
        lfo.start(t0);
        lfo.stop(stop);
    }
    for (let i = 0; i < count; i++) {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(f, t0);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, hold);
        if (count > 1) osc.detune.value = (i / (count - 1) - 0.5) * 2 * spread;
        if (wobbleDepth) wobbleDepth.connect(osc.detune);
        // Detuned below the middle on the left, above it on the right; the middle voice stays centred
        const middle = count % 2 === 1 && i === (count - 1) / 2;
        osc.connect(!sides || middle ? input : sides[i < count / 2 ? 0 : 1]);
        osc.start(t0);
        osc.stop(stop);
    }
    amp.connect(dest || a.mix);
    sends(a, amp, a.lite ? 0 : rev, dly);
};

export const chord = (a, notes, opts) => notes.forEach(midi => synth(a, { ...opts, midi }));

// Filtered noise: hats, claps, crashes, swooshes
const noise = (a, t, dur, gain, type, freq, { freqEnd = 0, q = 0.7, rev = 0, attack = 0.001, dest = null } = {}) => {
    const ctx = a.ctx;
    const t0 = Math.max(t, ctx.currentTime);
    const src = ctx.createBufferSource();
    src.buffer = a.noiseBuf();
    src.loop = true;
    const flt = ctx.createBiquadFilter();
    flt.type = type;
    if (freqEnd) blockRate(flt.frequency);
    flt.frequency.setValueAtTime(freq, t0);
    if (freqEnd) flt.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    flt.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(flt);
    flt.connect(g);
    g.connect(dest || a.mix);
    sends(a, g, rev, 0);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.05);
};

// ---------- drums ----------

export const pump = (a, t, depth = 0.7, recover = 0.09) => {
    const g = a.pumpBus.gain;
    const t0 = Math.max(t, a.ctx.currentTime);
    g.cancelScheduledValues(t0);
    g.setValueAtTime(1 - depth, t0);
    g.setTargetAtTime(1, t0 + 0.03, recover);
};

export const kick = (a, t, gain = 0.55, { depth = 0.7, dest = null } = {}) => {
    const ctx = a.ctx;
    const t0 = Math.max(t, ctx.currentTime);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(165, t0);
    osc.frequency.exponentialRampToValueAtTime(52, t0 + 0.07);
    osc.frequency.exponentialRampToValueAtTime(42, t0 + 0.35);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(gain * 0.5, t0 + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
    // A little saturation so it punches through phone and laptop speakers
    const sh = ctx.createWaveShaper();
    sh.curve = curve(a, 2.2);
    osc.connect(sh);
    sh.connect(g);
    g.connect(dest || a.mix);
    osc.start(t0);
    osc.stop(t0 + 0.5);
    noise(a, t0, 0.014, gain * 0.25, 'highpass', 3000, { dest });
    if (depth && !dest) pump(a, t0, depth);
};

export const clap = (a, t, gain = 0.2, rev = 0.3) => {
    [0, 0.009, 0.019].forEach((o, i) => noise(a, t + o, 0.025, gain * (1 - i * 0.15), 'bandpass', 1250, { q: 1.1 }));
    noise(a, t + 0.028, 0.2, gain * 0.7, 'bandpass', 1100, { q: 0.9, rev });
};

export const snare = (a, t, gain = 0.18, rev = 0.25) => {
    noise(a, t, 0.17, gain, 'bandpass', 1900, { q: 0.7, rev });
    synth(a, { freq: 200, slideTo: 150, type: 'triangle', t, dur: 0.05, release: 0.07, gain: gain * 0.7 });
};

export const hat = (a, t, gain = 0.045, open = false) => noise(a, t, open ? 0.24 : 0.035, gain, 'highpass', open ? 7000 : 8800);

export const crash = (a, t, gain = 0.08, dest = null) => noise(a, t, 1.9, gain, 'highpass', 4200, { rev: 0.35, dest });

export const tom = (a, t, midi, gain = 0.25) => synth(a, { midi, slideTo: mtof(midi) * 0.6, type: 'sine', t, dur: 0.18, release: 0.12, gain, rev: 0.2 });

export const riser = (a, t, dur, gain = 0.07, dest = null) => {
    const ctx = a.ctx;
    const t0 = Math.max(t, ctx.currentTime);
    const src = ctx.createBufferSource();
    src.buffer = a.noiseBuf();
    src.loop = true;
    const flt = ctx.createBiquadFilter();
    flt.type = 'bandpass';
    flt.Q.value = 1.6;
    blockRate(flt.frequency);
    flt.frequency.setValueAtTime(350, t0);
    flt.frequency.exponentialRampToValueAtTime(9000, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + dur);
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur + 0.06);
    src.connect(flt);
    flt.connect(g);
    g.connect(dest || a.mix);
    sends(a, g, 0.25, 0);
    src.start(t0);
    src.stop(t0 + dur + 0.1);
    synth(a, { freq: 110, slideTo: 880, type: 'sawtooth', t: t0, dur, attack: dur * 0.9, release: 0.05, gain: gain * 0.4, cutoff: 600, cutoffTo: 5000, voices: 2, spread: 20, dest });
};

export const impact = (a, t, gain = 0.45, dest = null) => {
    synth(a, { freq: 85, slideTo: 28, type: 'sine', t, dur: 1.2, attack: 0.003, release: 0.4, gain, dest });
    noise(a, t, 1.3, gain * 0.45, 'lowpass', 1200, { freqEnd: 90, rev: 0.5, dest });
    crash(a, t, 0.07, dest);
};

// ---------- tracks ----------

// Notes of a phrase: [bar within the phrase, step, midi, length in steps]
const notesAt = (phrase, bar, step) => phrase.filter(n => n[0] === bar && n[1] === step);

// Lobby: a deep, laid-back synth groove in F# minor (F#m - D - A - E) that builds into a melody
const LOBBY_LEAD = [
    [0, 0, 73, 4], [0, 4, 76, 2], [0, 6, 78, 6], [0, 12, 76, 2], [0, 14, 73, 2],
    [1, 0, 71, 4], [1, 4, 73, 2], [1, 6, 69, 6], [1, 14, 68, 2],
    [2, 0, 69, 3], [2, 3, 73, 3], [2, 6, 76, 2], [2, 8, 78, 4], [2, 12, 76, 4],
    [3, 0, 73, 6], [3, 6, 71, 2], [3, 8, 68, 8],
    [4, 0, 81, 4], [4, 4, 80, 2], [4, 6, 78, 6], [4, 12, 76, 2], [4, 14, 78, 2],
    [5, 0, 76, 4], [5, 4, 73, 2], [5, 6, 71, 6], [5, 14, 73, 2],
    [6, 0, 76, 3], [6, 3, 73, 3], [6, 6, 71, 2], [6, 8, 73, 4], [6, 12, 76, 4],
    [7, 0, 73, 8], [7, 8, 71, 4], [7, 12, 68, 4]
];
const ARP = [0, 2, 4, 3, 1, 3, 5, 4, 2, 4, 3, 5, 4, 3, 1, 2];

const corsairLobby = {
    tempo: 100,
    bars: Array.from({ length: 16 }, (_, i) => [
        { bass: 42, chord: [54, 57, 61] },
        { bass: 38, chord: [54, 57, 62] },
        { bass: 45, chord: [52, 57, 61] },
        { bass: 40, chord: [52, 56, 59] }
    ][i % 4]),
    play(a, step, bar, t, sd, barIndex) {
        const s = step % 16;
        const barDur = sd * 16;
        const tones = [...bar.chord, ...bar.chord.map(n => n + 12)];
        if (s === 0) {
            // Wide pad and deep bass, both pumping with the kick
            chord(a, bar.chord, { t, dur: barDur * 0.94, attack: 0.35, release: 0.5, gain: 0.032, voices: 4, spread: 16, cutoff: 900, cutoffTo: 1700, dest: a.pumpBus, rev: 0.35 });
            synth(a, { midi: bar.bass, type: 'sine', t, dur: barDur * 0.92, attack: 0.02, release: 0.2, gain: 0.16, dest: a.pumpBus });
            synth(a, { midi: bar.bass + 12, type: 'triangle', t, dur: barDur * 0.92, attack: 0.02, release: 0.2, gain: 0.035, cutoff: 700, dest: a.pumpBus });
            if (barIndex === 8 || barIndex === 0) crash(a, t, 0.05);
        }
        if (barIndex >= 2) {
            if (s === 0 || s === 8 || (s === 11 && barIndex % 2)) kick(a, t, 0.42, { depth: 0.55 });
            if (s === 4 || s === 12) clap(a, t, 0.15, 0.4);
            // Swung hats
            if (s % 2 === 0) hat(a, t + (s % 4 === 2 ? sd * 0.12 : 0), s % 4 === 2 ? 0.035 : 0.018, s === 14 && barIndex % 4 === 3);
        }
        if (barIndex >= 4) {
            synth(a, { midi: tones[ARP[s]] + 12, t, dur: sd * 0.4, release: 0.12, gain: 0.03, cutoff: 2400, cutoffTo: 500, sweep: 0.14, dly: 0.35 });
        }
        if (barIndex >= 8) {
            for (const [, , midi, len] of notesAt(LOBBY_LEAD, barIndex - 8, s)) {
                synth(a, { midi, type: 'triangle', t, dur: sd * len * 0.9, attack: 0.02, release: 0.25, gain: 0.07, vibrato: 14, dly: 0.25, rev: 0.35 });
                synth(a, { midi: midi + 12, type: 'sine', t, dur: sd * len * 0.9, attack: 0.02, release: 0.25, gain: 0.025, rev: 0.3 });
            }
        }
        if ((barIndex === 7 || barIndex === 15) && s === 0) riser(a, t, barDur, 0.05);
    }
};

// Battle: a 128 BPM banger in F minor (Fm - Db - Ab - Eb). Verse, a build with a snare roll and riser,
// then the drop: pumping supersaw chords, a hook, rolling bass
const HOOK = [
    [0, 0, 77, 3], [0, 3, 75, 3], [0, 6, 72, 2], [0, 8, 68, 2], [0, 10, 72, 2], [0, 12, 75, 4],
    [1, 0, 73, 3], [1, 3, 72, 3], [1, 6, 68, 2], [1, 8, 65, 4], [1, 12, 68, 2], [1, 14, 70, 2],
    [2, 0, 72, 3], [2, 3, 75, 3], [2, 6, 77, 2], [2, 8, 75, 2], [2, 10, 72, 2], [2, 12, 70, 4],
    [3, 0, 67, 3], [3, 3, 70, 3], [3, 6, 75, 2], [3, 8, 73, 4], [3, 12, 72, 4]
];
const BATTLE_BARS = [
    { bass: 41, chord: [53, 56, 60] },
    { bass: 37, chord: [53, 56, 61] },
    { bass: 44, chord: [51, 56, 60] },
    { bass: 39, chord: [51, 55, 58] }
];

const corsairs = {
    tempo: 128,
    bars: Array.from({ length: 32 }, (_, i) => BATTLE_BARS[i % 4]),
    play(a, step, bar, t, sd, barIndex) {
        const s = step % 16;
        const barDur = sd * 16;
        const drop = barIndex >= 16;
        const build = barIndex >= 8 && barIndex < 16;
        const tones = [...bar.chord, ...bar.chord.map(n => n + 12)];

        // Drums
        const kickOff = barIndex === 15;
        if (s % 4 === 0 && !kickOff) kick(a, t, drop ? 0.55 : 0.45, { depth: drop ? 0.8 : 0.5 });
        if ((s === 4 || s === 12) && !kickOff) clap(a, t, drop ? 0.2 : 0.15, 0.3);
        if (drop && (s === 4 || s === 12)) snare(a, t, 0.08, 0.2);
        if (s % 2 === 0) hat(a, t, s % 4 === 2 ? (drop ? 0.05 : 0.04) : 0.015, drop && s % 4 === 2);
        else if (!build || barIndex < 12) hat(a, t, 0.008);
        if (s === 0 && (barIndex === 0 || barIndex === 16 || barIndex === 24)) crash(a, t, barIndex === 16 ? 0.1 : 0.06);
        if (s === 0 && barIndex === 16) impact(a, t, 0.4);

        // The build: snare roll speeding up, a riser, everything opening up
        if (build && barIndex >= 12) {
            const every = barIndex < 14 ? 4 : barIndex === 14 ? 2 : 1;
            if (s % every === 0) snare(a, t, 0.05 + 0.1 * ((barIndex - 12) * 16 + s) / 64, 0.15);
        }
        if (barIndex === 14 && s === 0) riser(a, t, barDur * 2, 0.08);
        if (barIndex === 31 && s === 8) riser(a, t, sd * 8, 0.05);
        if (barIndex === 31 && s >= 12) snare(a, t, 0.1, 0.15);

        // Bass: rolling eighths with octave pops; the drop adds a pumping sub under it
        if (s % 2 === 0 && !kickOff) {
            const up = s === 6 || s === 14;
            const open = build ? 500 + (barIndex - 8) * 260 : drop ? 1400 : 650;
            synth(a, { midi: bar.bass + (up ? 12 : 0), voices: 2, spread: 14, width: 0, t, dur: sd * 1.5, release: 0.06, gain: drop ? 0.075 : 0.065, cutoff: open, q: 2, drive: drop ? 2 : 0, dest: a.pumpBus });
        }
        if (drop && s === 0) synth(a, { midi: bar.bass - 12, type: 'sine', t, dur: barDur * 0.95, attack: 0.01, release: 0.1, gain: 0.17, dest: a.pumpBus });

        // Verse and build: a plucked arpeggio through the echo
        if (!drop) {
            const bright = build ? 1800 + (barIndex - 8) * 500 : 1800;
            synth(a, { midi: tones[ARP[s]] + 12, t, dur: sd * 0.45, release: 0.1, gain: 0.032, cutoff: bright, cutoffTo: 450, sweep: 0.13, dly: 0.3 });
            if (s === 0) chord(a, bar.chord, { t, dur: barDur * 0.9, attack: 0.3, release: 0.3, gain: 0.018, voices: 3, cutoff: 1100, dest: a.pumpBus, rev: 0.3 });
        }

        // The drop: big pumping supersaw chords, offbeat stabs and the hook
        if (drop) {
            if (s === 0) chord(a, [...bar.chord, bar.chord[0] + 12], { t, dur: barDur * 0.96, attack: 0.01, release: 0.2, gain: 0.042, voices: 4, spread: 22, cutoff: 3600, dest: a.pumpBus, rev: 0.25 });
            const phrase = (barIndex - 16) % 4;
            const lift = barIndex >= 24 ? 12 : 0;
            for (const [, , midi, len] of notesAt(HOOK, phrase, s)) {
                synth(a, { midi: midi + lift, type: 'square', voices: 2, spread: 8, width: 0.4, t, dur: sd * len * 0.85, attack: 0.008, release: 0.15, gain: 0.05, cutoff: 3200, vibrato: 10, dly: 0.22, rev: 0.25 });
                synth(a, { midi: midi + lift - 12, type: 'sawtooth', t, dur: sd * len * 0.85, attack: 0.008, release: 0.15, gain: 0.025 });
            }
        }
    }
};

// Mothership invasion: dark, heavy half-time in C phrygian (Cm Cm Db Db Cm Cm Ab G), wobbling bass,
// alarm stabs, a choir pad and a nervous arpeggio
const BOSS_BARS = [
    { bass: 36, chord: [60, 63, 67] },
    { bass: 36, chord: [60, 63, 67] },
    { bass: 37, chord: [61, 65, 68] },
    { bass: 37, chord: [61, 65, 68] },
    { bass: 36, chord: [60, 63, 67] },
    { bass: 36, chord: [60, 63, 67] },
    { bass: 32, chord: [60, 63, 68] },
    { bass: 31, chord: [59, 62, 67] }
];
const NERVES = [67, 68, 67, 65, 63, 65, 67, 70, 67, 68, 67, 65, 63, 62, 63, 65];

const corsairBoss = {
    tempo: 140,
    bars: Array.from({ length: 16 }, (_, i) => BOSS_BARS[i % 8]),
    play(a, step, bar, t, sd, barIndex) {
        const s = step % 16;
        const barDur = sd * 16;
        const inPhrase = barIndex % 8;

        // Half-time drums: heavy kick, huge snare on beat 3, rolling hats
        if (s === 0 || s === 10 || (s === 3 && inPhrase % 2)) kick(a, t, s === 3 ? 0.35 : 0.55, { depth: 0.65 });
        if (s === 8) {
            snare(a, t, 0.2, 0.45);
            clap(a, t, 0.16, 0.45);
        }
        const roll = (inPhrase === 3 || inPhrase === 7) && s >= 12;
        hat(a, t, s % 2 === 0 ? 0.04 : 0.018);
        if (roll) hat(a, t + sd / 2, 0.03);
        if (barIndex === 15 && s >= 8 && s % 2 === 0) tom(a, t, 52 - (s - 8) * 2, 0.22);
        if (s === 0 && inPhrase === 0) impact(a, t, 0.35);
        if (s === 0 && inPhrase === 7) riser(a, t, barDur, 0.07);

        // Wobble bass and a sub under it
        if (s === 0) {
            synth(a, { midi: bar.bass, voices: 2, spread: 18, width: 0, t, dur: barDur * 0.96, attack: 0.01, release: 0.08, gain: 0.08, cutoff: 1500, q: 4, drive: 3, wobble: { period: sd * 2, lo: 170, hi: 1700 }, dest: a.pumpBus });
            synth(a, { midi: bar.bass - 12, type: 'sine', t, dur: barDur * 0.96, attack: 0.01, release: 0.1, gain: 0.16, dest: a.pumpBus });
            // Choir-like pad
            chord(a, bar.chord, { t, dur: barDur * 0.95, attack: 0.5, release: 0.6, gain: 0.03, voices: 4, spread: 14, cutoff: 950, filterType: 'bandpass', q: 2.5, rev: 0.55 });
        }
        // Alarm stabs when the chord changes: a clashing minor second
        if (s === 0 && inPhrase % 2 === 0) {
            chord(a, [bar.bass + 36, bar.bass + 37], { t, dur: sd * 3, release: 0.25, gain: 0.04, voices: 3, spread: 20, drive: 2, cutoff: 2600, rev: 0.4 });
        }
        if (s === 6 && (inPhrase === 3 || inPhrase === 7)) {
            chord(a, [bar.bass + 36, bar.bass + 37], { t, dur: sd * 2, release: 0.2, gain: 0.035, voices: 3, spread: 20, drive: 2, cutoff: 2600, rev: 0.4 });
        }
        // Nervous arpeggio
        if (barIndex >= 4) synth(a, { midi: NERVES[s] + (inPhrase >= 6 ? 12 : 0), type: 'square', t, dur: sd * 0.4, release: 0.05, gain: 0.018, cutoff: 2800, dly: 0.25 });
    }
};


// Moonshot: an uplifting climb in A major (A - E - F#m - D). A rolling arpeggio carries it, the drums
// and bass come in, and a soaring lead takes over for the last half: music for going higher.
const CLIMB_BARS = [
    { bass: 45, chord: [69, 73, 76] },
    { bass: 40, chord: [71, 76, 80] },
    { bass: 42, chord: [66, 69, 73] },
    { bass: 38, chord: [62, 66, 69] }
];
const CLIMB_ARP = [0, 1, 2, 3, 2, 1, 0, 2, 1, 3, 2, 4, 3, 2, 1, 2];
const CLIMB_LEAD = [
    [0, 0, 81, 4], [0, 4, 83, 2], [0, 6, 85, 6], [0, 12, 83, 4],
    [1, 0, 80, 4], [1, 4, 83, 2], [1, 6, 88, 8], [1, 14, 85, 2],
    [2, 0, 83, 3], [2, 3, 85, 3], [2, 6, 88, 2], [2, 8, 90, 4], [2, 12, 88, 4],
    [3, 0, 85, 6], [3, 6, 83, 2], [3, 8, 81, 8]
];

const moonshot = {
    tempo: 142,
    bars: Array.from({ length: 16 }, (_, i) => CLIMB_BARS[i % 4]),
    play(a, step, bar, t, sd, barIndex) {
        const s = step % 16;
        const barDur = sd * 16;
        const tones = [...bar.chord, bar.chord[0] + 12, bar.chord[1] + 12];
        const full = barIndex >= 4;
        const lead = barIndex >= 8;
        const huge = barIndex >= 12;

        // Drums come in after the intro
        if (full) {
            if (s % 4 === 0) kick(a, t, huge ? 0.55 : 0.46, { depth: huge ? 0.75 : 0.6 });
            if (s === 4 || s === 12) clap(a, t, huge ? 0.19 : 0.14, 0.35);
            if (s % 2 === 0) hat(a, t, s % 4 === 2 ? 0.042 : 0.016, huge && s === 14);
            else if (huge) hat(a, t, 0.01);
        } else if (s === 0 || s === 8) {
            kick(a, t, 0.3, { depth: 0.45 });
        }
        if (s === 0 && (barIndex === 0 || barIndex === 8 || barIndex === 12)) crash(a, t, 0.055);
        if (barIndex === 7 && s === 0) riser(a, t, barDur, 0.055);
        if (barIndex === 11 && s === 12) snare(a, t, 0.1, 0.2);

        // Plucky bass in eighths, with an octave lift before the bar turns over
        if (s % 2 === 0) {
            const up = s === 6 || s === 14;
            synth(a, {
                midi: bar.bass + (up ? 12 : 0), voices: 2, spread: 12, width: 0, t, dur: sd * 1.4,
                release: 0.06, gain: full ? 0.07 : 0.05, cutoff: full ? 1200 : 700, q: 2, dest: a.pumpBus
            });
        }
        if (s === 0) {
            // Wide pad under everything
            chord(a, bar.chord, {
                t, dur: barDur * 0.95, attack: full ? 0.05 : 0.4, release: 0.4, gain: full ? 0.03 : 0.024,
                voices: 4, spread: 16, cutoff: full ? 2600 : 1200, dest: a.pumpBus, rev: 0.3
            });
            if (huge) synth(a, { midi: bar.bass - 12, type: 'sine', t, dur: barDur * 0.95, attack: 0.01, release: 0.1, gain: 0.15, dest: a.pumpBus });
        }

        // The arpeggio: the sound of climbing
        synth(a, {
            midi: tones[CLIMB_ARP[s] % tones.length] + 12, t, dur: sd * 0.42, release: 0.1,
            gain: full ? 0.034 : 0.026, cutoff: lead ? 3400 : 2000, cutoffTo: 600, sweep: 0.12, dly: 0.3
        });

        // The lead, soaring over the top
        if (lead) {
            const phrase = (barIndex - 8) % 4;
            for (const [, , midi, len] of notesAt(CLIMB_LEAD, phrase, s)) {
                synth(a, {
                    midi: huge ? midi : midi - 12, type: 'triangle', voices: 2, spread: 9, width: 0.4, t,
                    dur: sd * len * 0.9, attack: 0.012, release: 0.22, gain: 0.055, cutoff: 3600, vibrato: 12, dly: 0.25, rev: 0.3
                });
            }
        }
    }
};

export const STUDIO_TRACKS = { corsairLobby, corsairs, corsairBoss, moonshot };

// ---------- stingers (sound effects, on the effects volume) ----------

export const STUDIO_SFX = {
    // ----- Moonshot -----
    jump: (a, t) => synth(a, { freq: 340, slideTo: 760, type: 'triangle', t, dur: 0.1, release: 0.05, gain: 0.05, dest: a.sfxBus }),
    spring: (a, t) => {
        synth(a, { freq: 260, slideTo: 1250, type: 'square', t, dur: 0.17, release: 0.07, gain: 0.05, cutoff: 2600, dest: a.sfxBus });
        synth(a, { freq: 1250, slideTo: 700, type: 'sine', t: t + 0.16, dur: 0.1, release: 0.08, gain: 0.03, dest: a.sfxBus });
    },
    checkpoint: (a, t) => {
        synth(a, { freq: 520, slideTo: 880, type: 'sine', t, dur: 0.14, release: 0.12, gain: 0.05, dest: a.sfxBus });
        synth(a, { midi: 76, type: 'triangle', t: t + 0.08, dur: 0.1, release: 0.2, gain: 0.04, dest: a.sfxBus, rev: 0.3 });
    },
    crack: (a, t) => noise(a, t, 0.05, 0.12, 'highpass', 4200, { dest: a.sfxBus }),
    crumble: (a, t) => {
        noise(a, t, 0.45, 0.16, 'lowpass', 2200, { freqEnd: 300, dest: a.sfxBus });
        [0, 0.07, 0.15, 0.24].forEach(o => noise(a, t + o, 0.08, 0.07, 'bandpass', 900 + Math.random() * 700, { q: 1.4, dest: a.sfxBus }));
    },
    bump: (a, t) => {
        synth(a, { freq: 190, slideTo: 70, type: 'sine', t, dur: 0.16, release: 0.08, gain: 0.14, dest: a.sfxBus });
        noise(a, t, 0.12, 0.1, 'lowpass', 1400, { freqEnd: 300, dest: a.sfxBus });
    },
    caught: (a, t) => {
        synth(a, { freq: 620, slideTo: 90, type: 'sawtooth', t, dur: 0.75, release: 0.2, gain: 0.07, cutoff: 2200, cutoffTo: 300, sweep: 0.7, voices: 3, spread: 22, dest: a.sfxBus, rev: 0.4 });
        noise(a, t, 0.8, 0.13, 'bandpass', 2600, { freqEnd: 220, q: 1.2, dest: a.sfxBus, rev: 0.3 });
    },
    shieldBreak: (a, t) => {
        [92, 87, 95, 84].forEach((m, i) => synth(a, { midi: m, type: 'triangle', t: t + i * 0.035, dur: 0.06, release: 0.18, gain: 0.04, dest: a.sfxBus, rev: 0.35 }));
        noise(a, t, 0.3, 0.07, 'highpass', 5200, { dest: a.sfxBus });
    },
    zoneUp: (a, t) => {
        [76, 81, 85, 88, 93].forEach((m, i) => synth(a, { midi: m, type: 'triangle', t: t + i * 0.055, dur: 0.1, release: 0.3, gain: 0.05, dest: a.sfxBus, dly: 0.3, rev: 0.35 }));
        riser(a, t, 0.5, 0.025, a.sfxBus);
    }
,
    // The mothership arrives: a cinematic BRAAAM and a siren sweep
    bossIntro: (a, t) => {
        impact(a, t, 0.4, a.sfxBus);
        chord(a, [36, 43, 48], { t, dur: 1.6, attack: 0.04, release: 0.6, gain: 0.09, voices: 3, spread: 14, drive: 2.5, cutoff: 260, cutoffTo: 1400, sweep: 1.4, dest: a.sfxBus, rev: 0.5 });
        [0.2, 0.75].forEach(o => synth(a, { freq: 480, slideTo: 960, t: t + o, dur: 0.5, release: 0.08, gain: 0.04, voices: 2, spread: 25, cutoff: 2600, dest: a.sfxBus, rev: 0.3 }));
    },
    // The class beat it: a bright, wide fanfare chord with sparkles
    victory: (a, t) => {
        crash(a, t, 0.09, a.sfxBus);
        chord(a, [65, 69, 72, 77], { t, dur: 1.3, attack: 0.03, release: 0.8, gain: 0.07, voices: 5, spread: 18, cutoff: 1800, cutoffTo: 6000, sweep: 0.6, dest: a.sfxBus, rev: 0.45 });
        [84, 88, 91, 96].forEach((m, i) => synth(a, { midi: m, type: 'triangle', t: t + 0.15 + i * 0.08, dur: 0.12, release: 0.3, gain: 0.05, dest: a.sfxBus, dly: 0.3, rev: 0.3 }));
    },
    // A golden comet: shimmering sparkles going up
    goldRush: (a, t) => {
        [84, 88, 91, 96, 100].forEach((m, i) => synth(a, { midi: m, type: 'triangle', t: t + i * 0.06, dur: 0.1, release: 0.35, gain: 0.05, dest: a.sfxBus, dly: 0.35, rev: 0.4 }));
        riser(a, t, 0.6, 0.03, a.sfxBus);
    }
};
