import { useState, useEffect } from 'react';
import { db } from '@/lib/db-client';
import { toast } from 'sonner';

export function usePosData(initialData: any) {
    const [data, setData] = useState(initialData);
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        // 1. Initial Load Check
        const syncData = async () => {
            console.log("Starting POS Data Sync...");

            try {
                // Try fetching from API with cache busting
                const res = await fetch(`/api/pos/sync?t=${Date.now()}`, {
                    cache: 'no-store',
                    headers: { 'Cache-Control': 'no-cache' }
                });

                if (!res.ok) {
                    throw new Error(`Sync failed: ${res.status} ${res.statusText}`);
                }

                const newData = await res.json();
                console.log("Fetched fresh data from API");

                // Update Local DB
                // Dexie transaction takes an array of tables if more than 5? No, it's variadic but recent versions might prefer array.
                // Let's use the array syntax which is safer for many tables.
                const tables = [db.categories, db.products, db.services, db.customers, db.employees, db.inventory];

                await db.transaction('rw', tables, async () => {
                    const payload = newData as any; // Type assertion

                    await db.categories.clear();
                    await db.categories.bulkAdd(payload.categories);

                    await db.products.clear();
                    await db.products.bulkAdd(payload.products);

                    await db.services.clear();
                    await db.services.bulkAdd(payload.services);

                    await db.customers.clear();
                    await db.customers.bulkAdd(payload.customers);

                    await db.employees.clear();
                    await db.employees.bulkAdd(payload.employees);

                    // Convert inventory map to array for Dexie
                    const invArray = Object.entries(payload.inventory).map(([k, v]) => ({ id: k, stock: v }));
                    await db.inventory.clear();
                    await db.inventory.bulkAdd(invArray);
                });

                // Update State
                setData(newData);
                setIsOffline(false);
                toast.success("POS Data Synced");

            } catch (error) {
                console.warn("Offline or Sync Failed, loading from local DB...", error);
                setIsOffline(true);

                // Load from Dexie
                const dCategories = await db.categories.toArray();
                const dProducts = await db.products.toArray();
                const dServices = await db.services.toArray();
                const dCustomers = await db.customers.toArray();
                const dEmployees = await db.employees.toArray();
                const dInventoryArr = await db.inventory.toArray();

                // Reconstruct inventory map
                const dInventory: Record<string, number> = {};
                dInventoryArr.forEach((item: any) => {
                    dInventory[item.id] = item.stock;
                });

                if (dCategories.length > 0) {
                    setData({
                        categories: dCategories,
                        products: dProducts,
                        services: dServices,
                        customers: dCustomers,
                        employees: dEmployees,
                        inventory: dInventory
                    });
                    toast.info("Loaded Offline Data");
                } else {
                    toast.error("Offline and no local data found!");
                }
            }
        };

        syncData();

        // Listen for online status
        const handleOnline = () => {
            setIsOffline(false);
            syncData(); // Re-sync data download when back online
        };
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        if (!navigator.onLine) {
            handleOffline();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };

    }, []);

    return { data, isOffline };
}
