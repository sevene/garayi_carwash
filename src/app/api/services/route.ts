import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const db = await getDB();

        // 1. Fetch Services
        const { results: servicesData } = await db.prepare(`
            SELECT s.*, c.name as category_name
            FROM services s
            LEFT JOIN categories c ON s.category_id = c.id
        `).all();

        // 2. Fetch All Base Ingredients (for all services)
        const { results: allIngredients } = await db.prepare(`
            SELECT si.*, p.name as product_name, p.cost as product_cost, p.price as product_price
            FROM service_ingredients si
            LEFT JOIN products p ON CAST(si.product_id AS TEXT) = CAST(p.id AS TEXT)
        `).all();

        // 3. Fetch All Variants
        const { results: allVariants } = await db.prepare(`
            SELECT * FROM service_variants
        `).all();

        // 4. Fetch All Variant Ingredients
        const { results: allVariantIngredients } = await db.prepare(`
            SELECT svi.*, p.name as product_name, p.cost as product_cost, p.price as product_price
            FROM service_variant_ingredients svi
            LEFT JOIN products p ON CAST(svi.product_id AS TEXT) = CAST(p.id AS TEXT)
        `).all();

        const services = servicesData.map((s: any) => {
            const serviceId = s.id;

            // Map Base Ingredients
            const myIngredients = allIngredients
                .filter((i: any) => i.service_id === serviceId)
                .map((i: any) => ({
                    productId: String(i.product_id),
                    quantity: i.quantity,
                    productName: i.product_name || 'Unknown Product',
                    unitCost: i.product_cost || 0, // Default to cost for calculation
                }));

            // Map Variants
            const myVariants = allVariants
                .filter((v: any) => v.service_id === serviceId)
                .map((v: any) => {
                    const variantId = v.id;
                    const vIngredients = allVariantIngredients
                        .filter((vi: any) => vi.variant_id === variantId)
                        .map((vi: any) => ({
                            productId: String(vi.product_id),
                            quantity: vi.quantity,
                            productName: vi.product_name || 'Unknown Product',
                            unitCost: vi.product_cost || 0
                        }));

                    return {
                        id: String(v.id),
                        name: v.name,
                        price: v.price,
                        products: vIngredients
                    };
                });

            return {
                _id: String(s.id),
                name: s.name,
                description: s.description,
                category: s.category_name || String(s.category_id),
                servicePrice: s.servicePrice || 0,
                laborCost: s.laborCost || 0,
                laborCostType: s.laborCostType || 'fixed',
                durationMinutes: s.durationMinutes || 0,
                products: myIngredients,
                variants: myVariants,
                active: s.active !== 0,
                showInPOS: Boolean(s.showInPos)
            };
        });

        return NextResponse.json(services);

    } catch (e: any) {
        console.error("Services API Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json() as any;
        const db = await getDB();

        console.log("Creating Service:", JSON.stringify(body, null, 2));

        const {
            name,
            description,
            category,
            servicePrice,
            laborCost,
            laborCostType,
            durationMinutes,
            showInPOS,
            image,
            products, // Base ingredients: { id, quantity }[]
            variants  // Variants: { name, price, products: { id, quantity }[] }[]
        } = body;

        // 1. Insert Service
        const res = await db.prepare(`
            INSERT INTO services (name, description, category_id, servicePrice, laborCost, laborCostType, durationMinutes, showInPos, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            name,
            description || '',
            category, // Assuming category ID is passed
            servicePrice || 0,
            laborCost || 0,
            laborCostType || 'fixed',
            durationMinutes || 0,
            showInPOS !== false ? 1 : 0,
            image || ''
        ).run();

        // Get the new ID (better-sqlite3 returns info.lastInsertRowid, D1 returns meta.last_row_id)
        // Our db.ts wrapper maps both to meta.last_row_id in .run() response
        const serviceId = res.meta.last_row_id;

        if (!serviceId) {
            throw new Error("Failed to retrieve new service ID");
        }

        // 2. Insert Base Ingredients (service_ingredients)
        if (products && Array.isArray(products)) {
            console.log(`Processing ${products.length} base ingredients`);
            for (const prod of products) {
                // Fix: Check for productId as well (frontend might send that)
                const pId = prod.id || prod.product_id || prod.productId;
                if (pId) {
                    await db.prepare(`
                        INSERT INTO service_ingredients (service_id, product_id, quantity)
                        VALUES (?, ?, ?)
                    `).bind(serviceId, pId, prod.quantity || 1).run();
                } else {
                    console.warn("Skipping base ingredient with no ID:", prod);
                }
            }
        }

        // 3. Insert Variants
        if (variants && Array.isArray(variants)) {
            console.log(`Processing ${variants.length} variants`);
            for (const variant of variants) {
                const vRes = await db.prepare(`
                    INSERT INTO service_variants (service_id, name, price)
                    VALUES (?, ?, ?)
                `).bind(serviceId, variant.name, variant.price).run();

                const rawId = vRes.meta.last_row_id;
                const variantId = rawId ? Number(rawId) : null;

                console.log(`Created variant '${variant.name}' with ID: ${variantId}`);

                // 4. Insert Variant Ingredients (service_variant_ingredients)
                if (variantId && variant.products && Array.isArray(variant.products)) {
                    console.log(`Processing ${variant.products.length} ingredients for variant ${variantId}`);
                    for (const vProd of variant.products) {
                        // Fix: Check for productId as well
                        const vpId = vProd.id || vProd.product_id || vProd.productId;

                        if (vpId) {
                            await db.prepare(`
                                INSERT INTO service_variant_ingredients (variant_id, product_id, quantity)
                                VALUES (?, ?, ?)
                            `).bind(variantId, vpId, vProd.quantity || 1).run();
                        } else {
                            console.warn("Skipping variant ingredient with no ID:", vProd);
                        }
                    }
                }
            }
        }

        return NextResponse.json({ success: true, id: serviceId });

    } catch (e: any) {
        console.error("Create Service Error:", e);
        return NextResponse.json({ message: e.message || 'Failed to create service' }, { status: 500 });
    }
}
