import { useState, useEffect } from 'react';

/**
 * A hook that checks if the browser is online using the Navigator API.
 * This does not ping the server, so it saves bandwidth/quota, but may report "online"
 * even if the server is unreachable (e.g. valid WiFi but no internet/server down).
 */
export function useOnlineStatus() {
    // Initialize with safe check for SSR
    const [isOnline, setIsOnline] = useState(() => {
        if (typeof navigator !== 'undefined') {
            return navigator.onLine;
        }
        return true; // Assume online on server/check
    });

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Sync on mount in case it changed between init and mount
        if (typeof navigator !== 'undefined') {
            setIsOnline(navigator.onLine);
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}
