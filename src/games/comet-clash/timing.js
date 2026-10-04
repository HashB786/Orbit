// How long a question is shown on its own before its asteroids appear (the last moments show 3-2-1).
// Longer questions get more reading time.
export const READ_TIMES = { readMin: 3000, readMax: 7000 };

export const readingMs = (prompt, { readMin, readMax } = READ_TIMES) =>
    Math.round(Math.min(readMax, Math.max(readMin, 1500 + String(prompt || '').length * 50)));
