import { useState, useEffect } from 'react';

/**
 * A hook that checks if the browser is online using the Navigator API.
 * This does not ping the server, so it saves bandwidth/quota, but may report "online"
 * even if the server is unreachable (e.g. valid WiFi but no internet/server down).
 */
export function useOnlineStatus() {
    // Initialize with true to match SSR and avoid Hydration Mismatch (Error #418)
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Sync on mount - now safe to access window/navigator
        setIsOnline(navigator.onLine);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}
