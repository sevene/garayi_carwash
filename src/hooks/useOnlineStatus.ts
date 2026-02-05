import { useState, useEffect } from 'react';

/**
 * A robust hook that checks if the browser is online AND if the server is reachable.
 * Uses navigator.onLine for immediate feedback and active polling for "dead" connections.
 */
export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        // Function to verify actual connectivity by pinging the server
        const verifyConnection = async () => {
            // If browser explicitly says offline, we are offline.
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                setIsOnline(false);
                return;
            }

            try {
                // Ping the health endpoint with a short timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

                // Add timestamp to bypass Service Worker cache
                const res = await fetch(`/api/health?_t=${Date.now()}`, {
                    method: 'GET',
                    signal: controller.signal,
                    cache: 'no-store',
                    headers: { 'Cache-Control': 'no-cache' }
                });

                clearTimeout(timeoutId);

                if (res.ok) {
                    setIsOnline(true);
                } else {
                    // Server responded with error (e.g. 500), but technically "connected" to something.
                    // However, for the app's purpose, we are "offline" if api is down.
                    setIsOnline(false);
                }
            } catch (error) {
                // Network error or timeout -> Offline
                setIsOnline(false);
            }
        };

        const handleOnline = () => {
            // Browser thinks we are online, verify it
            verifyConnection();
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Periodically check connection (every 20 seconds) to catch silent failures
        const intervalId = setInterval(verifyConnection, 20000);

        // Initial check
        verifyConnection();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(intervalId);
        };
    }, []);

    return isOnline;
}
