// Small seeded random generator (mulberry32): both duelists get the identical asteroid field.
export const createRng = (seed) => {
    let a = (Number(seed) >>> 0) || 1;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

export const randomSeed = () => Math.floor(Math.random() * 2 ** 31);
