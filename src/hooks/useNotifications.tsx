'use client';

import { useState, useEffect } from 'react';

export function useNotifications() {
    const [notificationCount, setNotificationCount] = useState(0);

    useEffect(() => {
        const fetchNotifications = async () => {
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
                    // Depending on business logic, we might exclude untracked items if stock is null,
                    // but here we used ?? 0 so it defaults to 0.
                    // We assume all fetched products track stock.
                    return stock <= 5;
                }).length;

                setNotificationCount(lowStockCount);
            } catch (e) {
                console.error("Failed to fetch notifications", e);
            }
        };

        // Initial fetch
        fetchNotifications();

        // Poll every 60 seconds to keep updated
        const interval = setInterval(fetchNotifications, 60000);

        return () => clearInterval(interval);
    }, []);

    return { notificationCount };
}
