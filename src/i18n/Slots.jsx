import React from 'react';

// Puts React elements (links, buttons) into the {slots} of a translated sentence:
// <Slots text={t('auth.consent.terms')} slots={{ terms: <a/>, privacy: <a/> }} />
const Slots = ({ text, slots }) => String(text).split(/\{(\w+)\}/g).map((part, i) => (
    i % 2 === 1 ? <React.Fragment key={i}>{slots[part] ?? `{${part}}`}</React.Fragment> : <React.Fragment key={i}>{part}</React.Fragment>
));

export default Slots;
