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
                // 1. Pull latest data from cloud to local (Full Mirror)
                const pullSuccess = await syncEvaluationsIntoLocalDB();
                if (pullSuccess) {
                    console.log("Full Sync Pull Complete");
                }

                // 2. Push Pending Changes
                const { syncedCount: ordersCount } = await syncOrders();
                const { syncedCount: mutationsCount } = await syncMutations();

                if (pullSuccess || ordersCount > 0 || mutationsCount > 0) {
                    console.log(`Sync Complete. Pull: ${pullSuccess}, Orders: ${ordersCount}, Mutations: ${mutationsCount}`);
                    // Toast only on user-visible changes to avoid spam on background syncs
                    if (ordersCount > 0 || mutationsCount > 0) {
                        toast.success("Cloud Sync Complete");
                    }
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
