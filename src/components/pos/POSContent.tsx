// components/pos/POSContent.tsx
'use client';

import React from 'react';
import { Service } from '@/lib/services';
import { Product } from '@/lib/products';
import { Category } from '@/lib/categories';
import { CartProvider, useCart } from '@/hooks/useCart';
import { POSGrid } from './POSGrid';
import { CartPanel } from './CartPanel';
import GlobalSync from '@/components/GlobalSync';

interface POSContentProps {
    initialServices: Service[];
    initialProducts: Product[];
    initialCategories: Category[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialCustomers: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialEmployees: any[];
    initialInventory?: Record<string, number>;
}

/**
 * Inner component that uses the cart context
 */
function POSLayout({ initialServices, initialProducts, initialCategories, initialInventory = {} }: {
    initialServices: Service[];
    initialProducts: Product[];
    initialCategories: Category[];
    initialInventory?: Record<string, number>;
}) {
    const { isCrewSidebarOpen, closeCrewSidebar } = useCart();

    // We can't easily update CartProvider's internal state unless we re-mount it when customers/employees change.
    // Or we pass the fresh data to CartProvider if it accepts it in a reactive way.
    // For now, let's assume the POSGrid needs the live data most.

    return (
        <div className="flex flex-col flex-1 w-full bg-gray-200 antialiased overflow-hidden">
            {/* Main Content Area: Products + Cart. Uses flex-1 to fill horizontal space. */}
            <div className="flex flex-1 overflow-hidden shrink-0 relative">
                {/* Product/Service Area (Grid, fills remaining width) */}
                <div className={`flex-1 overflow-hidden h-full bg-white flex flex-col scrollbar-hide transition-all duration-300 relative ${isCrewSidebarOpen ? 'opacity-50 pointer-events-none' : ''
                    }`}>
                    {/* POSGrid reads products and uses the cart context to add items */}
                    <POSGrid
                        initialServices={initialServices}
                        initialProducts={initialProducts}
                        initialCategories={initialCategories}
                        initialInventory={initialInventory}
                    />

                    {/* Dimming Overlay - Clicking it closes the crew sidebar */}
                    {isCrewSidebarOpen && (
                        <div
                            className="absolute inset-0 bg-black/20 z-10 transition-opacity duration-300"
                            onClick={closeCrewSidebar}
                        />
                    )}
                </div>

                <CartPanel />
            </div>
        </div>
    );
}

/**
 * POSContent serves as the client-side root for the POS terminal.
 * It initializes the CartProvider (state) and lays out the ProductGrid and CartPanel.
 */
import { usePosData } from '@/hooks/usePosData';
import { WifiIcon } from '@heroicons/react/24/solid';

export function POSContent(props: POSContentProps) {
    const { initialServices, initialProducts, initialCategories, initialCustomers, initialEmployees, initialInventory } = props;

    // Use the custom hook to sync data
    const { data, isOffline } = usePosData({
        categories: initialCategories,
        services: initialServices,
        products: initialProducts,
        customers: initialCustomers,
        employees: initialEmployees,
        inventory: initialInventory
    });

    // We use a key on CartProvider to force re-render if customers/employees significantly change (rare during a session but helpful for sync)
    // Actually, forcing re-render blows away the cart state, which is bad if you are in the middle of an order.
    // Better to just pass the live data to POSLayout for the Grid.
    // CartProvider might be stale on customers if offline update happens, but that's acceptable for now.

    const activeServices = data.services || initialServices;
    const activeProducts = data.products || initialProducts;
    const activeCategories = data.categories || initialCategories;
    const activeInventory = data.inventory || initialInventory;
    // Customers/Employees update is tricky without blowing away Cart State. Let's keep initial for Provider for now.

    // Customers/Employees update is tricky without blowing away Cart State. Let's keep initial for Provider for now.

    return (
        <CartProvider initialCustomers={initialCustomers} initialEmployees={initialEmployees}>
            <GlobalSync />
            {/* Offline Indicator */}
            {isOffline && (
                <div className="bg-amber-500 text-white text-xs font-bold text-center py-1 flex items-center justify-center gap-2">
                    <WifiIcon className="h-3 w-3" />
                    Offline Mode - Transactions Saved Locally
                </div>
            )}
            <POSLayout
                initialServices={activeServices}
                initialProducts={activeProducts}
                initialCategories={activeCategories}
                initialInventory={activeInventory}
            />
        </CartProvider>
    );
}
