'use client';

import { useState, useEffect } from 'react';

/**
 * A custom hook that tracks scroll position within a specific container.
 * Returns a boolean indicating if the user has scrolled past a threshold.
 *
 * @param containerId The ID of the scrollable container element (default: 'admin-main-content')
 * @param threshold The scroll position in pixels to trigger the state change (default: 50)
 * @returns boolean true if scrolled past threshold, false otherwise
 */
export function useScrollState(containerId: string = 'admin-main-content', threshold: number = 50) {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const scrollContainer = document.getElementById(containerId);
        if (!scrollContainer) return;

        const handleScroll = () => {
            const scrollTop = scrollContainer.scrollTop;
            if (scrollTop > threshold) {
                setIsScrolled(true);
            } else if (scrollTop < (threshold / 2)) { // Add some hysteresis
                setIsScrolled(false);
            }
        };

        scrollContainer.addEventListener('scroll', handleScroll);
        // Check initial scroll position
        handleScroll();

        return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }, [containerId, threshold]);

    return isScrolled;
}
