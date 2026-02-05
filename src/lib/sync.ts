import { db } from './db-client';

export interface SyncResult {
    syncedCount: number;
    errors: number;
}

// --- PUSH: Local -> Cloud ---

export async function syncPendingOrders(): Promise<SyncResult> {
    const pendingOrders = await db.orders.where('status').equals('pending').toArray();
    let syncedCount = 0;
    let errors = 0;

    if (pendingOrders.length === 0) return { syncedCount, errors };

    console.log(`[Sync-Push] Found ${pendingOrders.length} pending offline orders.`);

    for (const order of pendingOrders) {
        try {
            const payloadId = order.payload.id || order.payload._id;
            const isUpdate = !!payloadId && !payloadId.startsWith('temp_');

            let url = '/api/tickets';
            let method = 'POST';

            if (isUpdate) {
                url = `/api/tickets/${payloadId}`;
                method = 'PUT';
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(order.payload)
            });

            if (res.ok) {
                await db.orders.update(order.id!, { status: 'synced' });
                syncedCount++;
            } else {
                console.error("[Sync-Push] Failed to sync order", order.id, await res.text());
                errors++;
            }
        } catch (err) {
            console.error("[Sync-Push] Network error syncing order", order.id, err);
            errors++;
        }
    }
    return { syncedCount, errors };
}

export async function syncPendingMutations(): Promise<SyncResult> {
    const pendingMutations = await db.mutations.where('status').equals('pending').toArray();
    let syncedCount = 0;
    let errors = 0;

    if (pendingMutations.length === 0) return { syncedCount, errors };

    console.log(`[Sync-Push] Found ${pendingMutations.length} pending mutations.`);

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
                syncedCount++;
            } else {
                console.error("[Sync-Push] Mutation sync failed", m, await res.text());
                errors++;
            }
        } catch (e) {
            console.error("[Sync-Push] Network error syncing mutation", m, e);
            errors++;
        }
    }
    return { syncedCount, errors };
}


// --- PULL: Cloud -> Local ---

export async function syncEvaluationsIntoLocalDB() {
    try {
        console.log("[Sync-Pull] Starting full DB sync...");

        // 1. Fetch Master Data
        const [products, services, categories, customers, employees, tickets] = await Promise.all([
            fetch('/api/products').then(res => res.ok ? res.json() : []) as Promise<any[]>,
            fetch('/api/services').then(res => res.ok ? res.json() : []) as Promise<any[]>,
            fetch('/api/categories').then(res => res.ok ? res.json() : []) as Promise<any[]>,
            fetch('/api/customers').then(res => res.ok ? res.json() : []) as Promise<any[]>,
            fetch('/api/employees').then(res => res.ok ? res.json() : []) as Promise<any[]>,
            fetch('/api/tickets').then(res => res.ok ? res.json() : []) as Promise<any[]>
        ]);

        // 2. Transactional Update
        await db.transaction('rw', [db.products, db.services, db.categories, db.customers, db.employees, db.orders], async () => {

            // Overwrite Master Data Tables
            // Note: We use bulkPut to update existing items by ID
            if (products.length) await db.products.bulkPut(products);
            if (services.length) await db.services.bulkPut(services);
            if (categories.length) await db.categories.bulkPut(categories);
            if (customers.length) await db.customers.bulkPut(customers);
            if (employees.length) await db.employees.bulkPut(employees);

            // 3. Handle Tickets Merge
            // We do NOT want to overwrite 'pending' changes
            const pendingIds = await db.orders.where('status').equals('pending').primaryKeys(); // these are ID numbers
            // We need to know which Server IDs correspond to pending local changes (if any)
            // But usually pending items have a tempId or a real ID.
            // If they have a real ID, it means we are updating a server ticket.
            // We must NOT overwrite that specific server ticket with old data from server.

            const pendingOrders = await db.orders.where('status').equals('pending').toArray();
            const pendingServerIds = new Set(pendingOrders.map(o => o.payload.id || o.payload._id).filter(Boolean));

            // Map server tickets to OfflineOrder format
            const syncedOrders = tickets.map((t: any) => ({
                tempId: t._id, // Map Server ID to tempId slot for consistency
                ticketNumber: t.ticketNumber,
                items: t.items,
                total: t.total,
                customerId: t.customer?._id,
                status: 'synced' as const,
                createdAt: new Date(t.createdAt).getTime(),
                payload: { ...t, id: t._id }
            }));

            // Filter out tickets that we are currently editing locally
            const toPut = syncedOrders.filter((o: any) => !pendingServerIds.has(o.tempId));

            // We want to remove 'synced' tickets that are no longer on the server?
            // Or just upsert? Let's upsert for safety.
            // Better: Clear all 'synced' first to remove deleted ones, then add new ones.
            await db.orders.where('status').equals('synced').delete();
            await db.orders.bulkPut(toPut);
        });

        console.log("[Sync-Pull] Complete. Local DB is up to date.");
        return true;

    } catch (e) {
        console.error("[Sync-Pull] Failed", e);
        return false;
    }
}
