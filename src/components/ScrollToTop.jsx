import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        // Find the scrollable container and reset it
        const mainContainer = document.querySelector('main > div.overflow-y-auto');
        if (mainContainer) {
            mainContainer.scrollTo(0, 0);
        }
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
};

export default ScrollToTop;
