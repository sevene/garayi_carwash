'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { syncPendingOrders, syncPendingMutations, syncEvaluationsIntoLocalDB } from '@/lib/sync';

export default function GlobalSync() {
    useEffect(() => {
        // FORCE SW UPDATE: Unregister old workers to clear 'ReferenceError' crashes
        // This ensures users get the new sw.js with the polyfill.
        const SW_RESET_KEY = 'sw-reset-v3'; // Bump this if we need to force reset again
        if (typeof window !== 'undefined' && !localStorage.getItem(SW_RESET_KEY)) {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                    for (const registration of registrations) {
                        console.log('Force unregistering stale SW:', registration);
                        registration.unregister();
                    }
                    localStorage.setItem(SW_RESET_KEY, 'true');
                    console.log('Service Workers cleared. Reloading next visit will install fresh SW.');
                    // Optional: Force reload immediately to clear state?
                    // window.location.reload();
                    // Better to let them browse, next load fixes it.
                });
            }
        }

        const syncOrders = async () => {
            const { syncedCount } = await syncPendingOrders();
            return { syncedCount };
        };

        const syncMutations = async () => {
            const { syncedCount } = await syncPendingMutations();
            return { syncedCount };
        };

        const runGlobalSync = async (isPolling = false) => {
            if (navigator.onLine) {
                // 1. Push Pending Changes (Priority: Ensure server has our updates)
                const { syncedCount: ordersCount } = await syncOrders();
                const { syncedCount: mutationsCount } = await syncMutations();
                const hasLocalChanges = ordersCount > 0 || mutationsCount > 0;

                // 2. Pull latest data: Only if manual trigger OR we pushed something.
                // This prevents spamming the server with full downloads every 15s.
                let pullSuccess = false;
                if (!isPolling || hasLocalChanges) {
                    pullSuccess = await syncEvaluationsIntoLocalDB();
                }

                if (pullSuccess && hasLocalChanges) {
                    console.log("Sync Complete: Pushed changes and refreshed local DB.");
                    toast.success("Cloud Sync Complete");
                } else if (pullSuccess && !isPolling) {
                    // Only log/toast refresh if it wasn't a silent poll
                    console.log("Data Refresh Complete");
                }
            }
        };

        // Run on mount (Initial Sync)
        runGlobalSync(false);

        // Listen for online status
        const handleOnline = () => {
            console.log("App is back online. Running global sync...");
            runGlobalSync(false);
        };

        window.addEventListener('online', handleOnline);

        // Backup Polling: Check for unsynced changes every 15 seconds
        // This covers cases where the 'online' event is missed or the browser state is flaky
        const intervalId = setInterval(() => {
            if (navigator.onLine) {
                // Background poll - only sync if we have local changes
                runGlobalSync(true);
            }
        }, 15000);

        return () => {
            window.removeEventListener('online', handleOnline);
            clearInterval(intervalId);
        };
    }, []);

    return null; // Headless component
}
