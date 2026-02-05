import React from 'react';
import { POSGrid } from '@/components/pos/POSGrid';
import { CartPanel } from '@/components/pos/CartPanel';
import { CartProvider } from '@/hooks/useCart';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const dynamic = 'force-dynamic';



// We can fetch data server-side here
async function getData() {
    try {
        const { env } = await getCloudflareContext({ async: true });
        const db = (env as any).DB as D1Database;
        const { results } = await db.prepare(`
            SELECT
                id as _id,
                name,
                sku,
                price_sedan,
                price_suv,
                price_truck,
                category,
                duration_minutes
            FROM products
            ORDER BY name ASC
        `).all();
        return results as any[];
    } catch (e) {
        console.error(e);
        return [];
    }
}

export default async function Page() {
    const data = await getData();

    // In our new schema, anything with 'category'='Wash' or 'Detail' is a Service
    const services = data.filter(i => ['Wash', 'Detail'].includes(i.category))
        .map(i => ({
            ...i,
            _id: String(i._id),
            // Ensure numeric types
            price_sedan: Number(i.price_sedan),
            price_suv: Number(i.price_suv),
            price_truck: Number(i.price_truck),
            duration_minutes: Number(i.duration_minutes)
        }));

    const products = data.filter(i => !['Wash', 'Detail'].includes(i.category))
        .map(i => ({
            ...i,
            _id: String(i._id),
            price: Number(i.price_sedan) // Fallback for simple products
        }));

    return (
        <CartProvider initialCustomers={[]} initialEmployees={[]}>
            <main className="flex h-screen w-screen overflow-hidden bg-white text-gray-900 font-sans">
                {/* Left: POS Grid */}
                <div className="flex-1 h-full overflow-hidden">
                    <POSGrid
                        initialProducts={products}
                        initialServices={services}
                        initialCategories={[
                            { _id: '1', name: 'Wash', active: true },
                            { _id: '2', name: 'Detail', active: true },
                            { _id: '3', name: 'Addon', active: true }
                        ]}
                    />
                </div>

                {/* Right: Cart */}
                <CartPanel />
            </main>
        </CartProvider>
    );
}
