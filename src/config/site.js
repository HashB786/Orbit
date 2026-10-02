// Contact address shown on the Terms and Privacy pages. Set VITE_CONTACT_EMAIL in .env / Netlify.
export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || '';

// Date the Terms/Privacy text last changed (shown on those pages)
export const LEGAL_UPDATED = '2026-09-29';

// Bump this string when deploying a notable update. Signed-in users see a "What's New" modal once.
export const CHANGELOG_VERSION = '2026-09-30-b';

// Bullet points shown in the What's New modal — i18n keys under whatsNew.*
export const CHANGELOG = [
    'whatsNew.sets_for_all',
    'whatsNew.grades',
    'whatsNew.backup_password',
    'whatsNew.i18n',
    'whatsNew.terms_accept',
];
