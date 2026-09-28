import React from 'react';

// Renders **bold** parts of a translated sentence (translations keep their own word order)
const Rich = ({ text, boldClassName = 'font-bold text-gray-900 dark:text-white' }) => {
    const parts = String(text).split(/\*\*(.+?)\*\*/g);
    return parts.map((part, i) => (i % 2 === 1 ? <b key={i} className={boldClassName}>{part}</b> : <React.Fragment key={i}>{part}</React.Fragment>));
};

export default Rich;
