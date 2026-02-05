import { db } from '@/lib/db-client';
import { toast } from 'sonner';

type Collection = 'categories' | 'services' | 'products' | 'customers' | 'employees';

export function useOfflineMutation() {

    const performMutation = async (
        collection: Collection,
        type: 'create' | 'update' | 'delete',
        payload: any,
        apiPath: string
    ) => {
        // 1. Try Online
        if (navigator.onLine) {
            try {
                let url = apiPath;
                let method = 'POST';

                if (type === 'create') method = 'POST';
                if (type === 'update') {
                    method = 'PUT';
                    url = `${apiPath}/${payload.id || payload._id}`;
                }
                if (type === 'delete') {
                    method = 'DELETE';
                    url = `${apiPath}/${payload.id || payload._id}`;
                }

                const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: type !== 'delete' ? JSON.stringify(payload) : undefined
                });

                if (!res.ok) {
                    throw new Error(`API Error: ${res.statusText}`);
                }

                const data = await res.json();
                toast.success(`${collection} ${type}d successfully!`);

                // Return server response (often includes generated ID)
                return { success: true, data };

            } catch (error) {
                console.warn("Online mutation failed, falling back to offline", error);
                // Fallthrough to offline
            }
        }

        // 2. Offline Fallback
        toast.message(`Offline: Saving ${type} to pending queue...`);

        const tempId = payload.id || payload._id || `temp_${self.crypto.randomUUID()}`;
        const offlinePayload = { ...payload, _id: tempId, id: tempId };

        // Save to Mutation Queue
        await db.mutations.add({
            type,
            collection,
            payload: offlinePayload,
            status: 'pending',
            createdAt: Date.now(),
            tempId
        });

        // Optimistic UI Update: Save to Local DB immediately so it appears in the list
        const table = db[collection];
        if (table) {
            if (type === 'create') {
                await table.add(offlinePayload);
            } else if (type === 'update') {
                // Use put for update/insert
                await table.put(offlinePayload);
            } else if (type === 'delete') {
                // Determine ID key (dexie tables are indexed by _id mostly)
                await table.delete(offlinePayload._id);
            }
        }

        return { success: true, data: offlinePayload, offline: true };
    };

    return { performMutation };
}
