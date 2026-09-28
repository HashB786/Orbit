// Client-side search over sets (title, description, subject, author and question text).
// Fine for a few hundred public sets; a search service can replace it when the library grows.

const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

export const matchesSearch = (set, query) => {
    const words = norm(query).split(/\s+/).filter(Boolean);
    if (!words.length) return true;
    const haystack = norm([
        set.title, set.description, set.subject, set.author,
        ...set.questions.slice(0, 60).map(q => q.prompt)
    ].join(' '));
    return words.every(w => haystack.includes(w));
};

export const SUBJECTS = [
    'Math', 'Science', 'Physics', 'Chemistry', 'Biology', 'Geography', 'History',
    'English', 'Languages', 'Computer Science', 'Art', 'Music', 'Other'
];
