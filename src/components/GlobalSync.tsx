'use client';

import { useEffect } from 'react';
import { db } from '@/lib/db-client';
import { toast } from 'sonner';
import { useCart } from '@/hooks/useCart';

export default function GlobalSync() {
    // expose fetchOpenTickets to refresh UI after sync
    const { fetchOpenTickets } = useCart();

    useEffect(() => {
        const syncPendingOrders = async () => {
            // 1. Check for pending orders
            // Uses the 'status' index we defined in db-client
            const pendingOrders = await db.orders.where('status').equals('pending').toArray();

            if (pendingOrders.length === 0) return false;

            console.log(`Found ${pendingOrders.length} pending offline orders. Syncing...`);
            let syncedCount = 0;

            for (const order of pendingOrders) {
                try {
                    // Determine URL based on order ID existence?
                    // Usually offline orders are NEW, so POST /api/tickets
                    const res = await fetch('/api/tickets', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(order.payload)
                    });

                    if (res.ok) {
                        // Mark as synced/delete
                        await db.orders.update(order.id!, { status: 'synced' });
                        // Or delete it if we don't want history clutter
                        // await db.orders.delete(order.id!);
                        syncedCount++;
                    } else {
                        console.error("Failed to sync order", order.id, await res.text());
                    }
                } catch (err) {
                    console.error("Network error syncing order", order.id, err);
                }
            }

            if (syncedCount > 0) {
                toast.success(`Synced ${syncedCount} offline orders!`);
                return true;
            }
            return false;
        };

        const syncPendingMutations = async () => {
            const pendingMutations = await db.mutations.where('status').equals('pending').toArray();
            if (pendingMutations.length === 0) return false;

            console.log(`Found ${pendingMutations.length} pending mutations. Syncing...`);
            let mutationCount = 0;

            for (const m of pendingMutations) {
                try {
                    let url = '';
                    let method = '';
                    const apiBase = `/api/${m.collection}`;

                    if (m.type === 'create') {
                        method = 'POST';
                        url = apiBase;
                    } else { // update or delete
                        method = m.type === 'update' ? 'PUT' : 'DELETE';
                        url = `${apiBase}/${m.payload.id || m.payload._id}`;
                    }

                    const res = await fetch(url, {
                        method,
                        headers: { 'Content-Type': 'application/json' },
                        body: m.type !== 'delete' ? JSON.stringify(m.payload) : undefined
                    });

                    if (res.ok) {
                        await db.mutations.update(m.id!, { status: 'synced' });
                        mutationCount++;
                    } else {
                        console.error("Mutation sync failed", m, await res.text());
                    }
                } catch (e) {
                    console.error("Network error syncing mutation", m, e);
                }
            }

            if (mutationCount > 0) {
                toast.success(`Synced ${mutationCount} offline changes`);
                return true;
            }
            return false;
        };

        const runGlobalSync = async () => {
            if (navigator.onLine) {
                const ordersSynced = await syncPendingOrders();
                const mutationsSynced = await syncPendingMutations();

                // If anything changed, refresh the cart view
                if (ordersSynced || mutationsSynced) {
                    console.log("Sync complete, refreshing tickets list...");
                    fetchOpenTickets();
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
    }, [fetchOpenTickets]);

    return null; // Headless component
}
