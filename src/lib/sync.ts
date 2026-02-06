import { db } from './db-client';

export interface SyncResult {
    syncedCount: number;
    errors: number;
}

// --- PUSH: Local -> Cloud ---

// Helper function to handle async order sync using raw Promises
function processOrderSync(order: any): Promise<boolean> {
    const payloadId = order.payload.id || order.payload._id;
    const isUpdate = !!payloadId && !payloadId.startsWith('temp_');
    const url = isUpdate ? `/api/tickets/${payloadId}` : '/api/tickets';
    const method = isUpdate ? 'PUT' : 'POST';

    return fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order.payload)
    })
        .then(res => {
            if (!res.ok) {
                return res.text().then(txt => { // check if text returns promise
                    console.error("[Sync-Push] Failed to sync order", order.id, txt);
                    return false;
                });
            }
            return db.orders.update(order.id!, { status: 'synced' })
                .then(() => true);
        })
        .catch(err => {
            console.error("[Sync-Push] Network error syncing order", order.id, err);
            return false;
        });
}

// Rewritten to avoid async/await transpilation issues in SW
export function syncPendingOrders(): Promise<SyncResult> {
    return db.orders.where('status').equals('pending').toArray()
        .then(pendingOrders => {
            if (pendingOrders.length === 0) {
                return { syncedCount: 0, errors: 0 };
            }
            console.log(`[Sync-Push] Found ${pendingOrders.length} pending offline orders.`);

            // Process sequentially or parallel? Parallel is faster.
            const promises = pendingOrders.map(order => processOrderSync(order));

            return Promise.all(promises).then(results => {
                const syncedCount = results.filter(r => r).length;
                const errors = results.filter(r => !r).length;
                return { syncedCount, errors };
            });
        });
}

// Helper for mutations
function processMutationSync(m: any): Promise<boolean> {
    const apiBase = `/api/${m.collection}`;
    let url = '';
    let method = '';

    if (m.type === 'create') {
        method = 'POST';
        url = apiBase;
    } else { // update or delete
        method = m.type === 'update' ? 'PUT' : 'DELETE';
        url = `${apiBase}/${m.payload.id || m.payload._id}`;
    }

    return fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: m.type !== 'delete' ? JSON.stringify(m.payload) : undefined
    })
        .then(res => {
            if (!res.ok) {
                return res.text().then(txt => {
                    console.error("[Sync-Push] Mutation sync failed", m, txt);
                    return false;
                });
            }
            return db.mutations.update(m.id!, { status: 'synced' }).then(() => true);
        })
        .catch(e => {
            console.error("[Sync-Push] Network error syncing mutation", m, e);
            return false;
        });
}

export function syncPendingMutations(): Promise<SyncResult> {
    return db.mutations.where('status').equals('pending').toArray()
        .then(pendingMutations => {
            if (pendingMutations.length === 0) {
                return { syncedCount: 0, errors: 0 };
            }
            console.log(`[Sync-Push] Found ${pendingMutations.length} pending mutations.`);

            const promises = pendingMutations.map(m => processMutationSync(m));
            return Promise.all(promises).then(results => {
                const syncedCount = results.filter(r => r).length;
                const errors = results.filter(r => !r).length;
                return { syncedCount, errors };
            });
        });
}


// --- PULL: Cloud -> Local ---
// This function is MAIN THREAD only so async/await is safer, but consistent style helps.
// However, db.transaction with async/await is tricky if not careful, but Dexie supports it.
// We will keep async/await here if it's not imported by SW.
// WAIT. The worker imports EVERYTHING from this file.
// So even if we don't use this function in SW, its presence might trigger transpilation if the bundler is dumb.
// Safer to use keys.

export function syncEvaluationsIntoLocalDB(): Promise<boolean> {
    console.log("[Sync-Pull] Starting full DB sync...");

    const ts = Date.now();
    const headers = { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' };

    return Promise.all([
        fetch(`/api/products?t=${ts}`, { headers, cache: 'no-store' }).then(res => res.ok ? res.json() : []) as Promise<any[]>,
        fetch(`/api/services?t=${ts}`, { headers, cache: 'no-store' }).then(res => res.ok ? res.json() : []) as Promise<any[]>,
        fetch(`/api/categories?t=${ts}`, { headers, cache: 'no-store' }).then(res => res.ok ? res.json() : []) as Promise<any[]>,
        fetch(`/api/customers?t=${ts}`, { headers, cache: 'no-store' }).then(res => res.ok ? res.json() : []) as Promise<any[]>,
        fetch(`/api/employees?t=${ts}`, { headers, cache: 'no-store' }).then(res => res.ok ? res.json() : []) as Promise<any[]>,
        fetch(`/api/tickets?t=${ts}`, { headers, cache: 'no-store' }).then(res => res.ok ? res.json() : []) as Promise<any[]>
    ])
        .then(([products, services, categories, customers, employees, tickets]) => {
            return db.transaction('rw', [db.products, db.services, db.categories, db.customers, db.employees, db.orders], () => {
                // We use Dexie's transaction Scope.
                // Note: Dexie transactions should return the promise of the chain.

                const p1 = products.length ? db.products.bulkPut(products) : Promise.resolve();
                const p2 = services.length ? db.services.bulkPut(services) : Promise.resolve();
                const p3 = categories.length ? db.categories.bulkPut(categories) : Promise.resolve();
                const p4 = customers.length ? db.customers.bulkPut(customers) : Promise.resolve();
                const p5 = employees.length ? db.employees.bulkPut(employees) : Promise.resolve();

                // Tickets Logic
                // 1. Get pending
                return Promise.all([p1, p2, p3, p4, p5, db.orders.where('status').equals('pending').toArray()])
                    .then(([_1, _2, _3, _4, _5, pendingOrders]) => {
                        const pendingServerIds = new Set(pendingOrders.map(o => o.payload.id || o.payload._id).filter(Boolean));

                        const syncedOrders = tickets.map((t: any) => ({
                            tempId: t._id,
                            ticketNumber: t.ticketNumber,
                            items: t.items,
                            total: t.total,
                            customerId: t.customer?._id,
                            status: 'synced' as const,
                            createdAt: new Date(t.createdAt).getTime(),
                            payload: { ...t, id: t._id }
                        }));

                        const toPut = syncedOrders.filter((o: any) => !pendingServerIds.has(o.tempId));

                        return db.orders.where('status').equals('synced').delete()
                            .then(() => db.orders.bulkPut(toPut));
                    });
            });
        })
        .then(() => {
            console.log("[Sync-Pull] Complete. Local DB is up to date.");
            return true;
        })
        .catch(e => {
            console.error("[Sync-Pull] Failed", e);
            return false;
        });
}
