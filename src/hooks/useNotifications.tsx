'use client';

import { useState, useEffect } from 'react';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function useNotifications() {
    const [notificationCount, setNotificationCount] = useState(0);
    const isOnline = useOnlineStatus();

    useEffect(() => {
        const fetchNotifications = async () => {
            // Don't fetch if offline
            if (!isOnline) return;

            try {
                // Fetch products to check stock levels
                // We use the same API endpoint as the POS
                const res = await fetch('/api/products');
                if (!res.ok) return;

                const products = await res.json() as any[];

                // Calculate low stock items (threshold <= 5)
                // Handle both 'stock' (interface) and 'stock_quantity' (db/raw) properties
                const lowStockCount = products.filter((p: any) => {
                    const stock = p.stock ?? p.stock_quantity ?? 0;
                    // We interpret 0 as also low stock.
                    return stock <= 5;
                }).length;

                setNotificationCount(lowStockCount);
            } catch (e) {
                // If the fetch fails (e.g. user went offline mid-request), silently ignore or log warning
                // console.warn("Failed to fetch notifications", e);
            }
        };

        // Initial fetch
        fetchNotifications();

        // Poll every 60 seconds to keep updated
        const interval = setInterval(fetchNotifications, 60000);

        return () => clearInterval(interval);
    }, [isOnline]); // Re-run when online status changes

    return { notificationCount };
}
