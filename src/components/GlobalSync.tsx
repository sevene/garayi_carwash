'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { syncPendingOrders, syncPendingMutations, syncEvaluationsIntoLocalDB } from '@/lib/sync';

export default function GlobalSync() {
    useEffect(() => {
        const syncOrders = async () => {
            const { syncedCount } = await syncPendingOrders();
            return { syncedCount };
        };

        const syncMutations = async () => {
            const { syncedCount } = await syncPendingMutations();
            return { syncedCount };
        };

        const runGlobalSync = async () => {
            if (navigator.onLine) {
                // 1. Push Pending Changes (Priority: Ensure server has our updates)
                const { syncedCount: ordersCount } = await syncOrders();
                const { syncedCount: mutationsCount } = await syncMutations();

                // 2. Pull latest data from cloud to local (Full Mirror)
                // We do this AFTER pushing so we get the canonical version of what we just uploaded
                const pullSuccess = await syncEvaluationsIntoLocalDB();

                if (pullSuccess && (ordersCount > 0 || mutationsCount > 0)) {
                    console.log("Sync Complete: Pushed changes and refreshed local DB.");
                    toast.success("Cloud Sync Complete - Refreshing UI...");
                    // Force reload to ensure absolutely pristine state after offline edits
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else if (pullSuccess) {
                    console.log("Data Refresh Complete");
                }
            }
        };

        // Run on mount
        runGlobalSync();

        // Listen for online status
        const handleOnline = () => {
            console.log("App is back online. Running global sync...");
            runGlobalSync();
        };

        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    return null; // Headless component
}
