// Client-side search over sets (title, description, subject, author and question text).
// Fine for a few hundred public sets; a search service can replace it when the library grows.

const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

export const matchesSearch = (set, query) => {
    const words = norm(query).split(/\s+/).filter(Boolean);
    if (!words.length) return true;
    const haystack = norm([
        set.title, set.description, set.subject, set.grade, set.author,
        ...set.questions.slice(0, 60).map(q => q.prompt)
    ].join(' '));
    return words.every(w => haystack.includes(w));
};

export const SUBJECTS = [
    'Math', 'Science', 'Physics', 'Chemistry', 'Biology', 'Geography', 'History',
    'English', 'Languages', 'Computer Science', 'Art', 'Music', 'Other'
];

// Grade levels — stored in English, translated via t('grades.*')
export const GRADES = [
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
    'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
    'University', 'Teachers'
];

export const gradeName = (t, grade) => (GRADES.includes(grade) ? t(`grades.${grade}`) : (grade || ''));
