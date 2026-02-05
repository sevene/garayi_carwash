import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET: Fetch single service with all details (ingredients, variants)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const db = await getDB();

        // 1. Fetch Service basic info
        const service = await db.prepare('SELECT * FROM services WHERE id = ?').bind(id).first();

        if (!service) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 });
        }

        // 2. Fetch Base Ingredients
        console.log(`Fetching ingredients for service ${id}`);
        const { results: ingredients } = await db.prepare(`
            SELECT si.*, p.name as product_name
            FROM service_ingredients si
            LEFT JOIN products p ON CAST(si.product_id AS TEXT) = CAST(p.id AS TEXT)
            WHERE si.service_id = ?
        `).bind(id).all();

        // 3. Fetch Variants
        console.log(`Fetching variants for service ${id}`);
        const { results: variants } = await db.prepare(`
            SELECT * FROM service_variants WHERE service_id = ?
        `).bind(id).all();

        // 4. Fetch Variant Ingredients
        console.log(`Fetching variant ingredients for service ${id}`);
        const { results: variantIngredients } = await db.prepare(`
            SELECT svi.*, p.name as product_name, p.cost as product_cost, p.price as product_price
            FROM service_variant_ingredients svi
            JOIN service_variants sv ON svi.variant_id = sv.id
            LEFT JOIN products p ON CAST(svi.product_id AS TEXT) = CAST(p.id AS TEXT)
            WHERE sv.service_id = ?
        `).bind(id).all();

        console.log(`Found ${ingredients.length} base ingredients, ${variants.length} variants, ${variantIngredients.length} variant ingredients`);

        // Assemble Response
        const response = {
            ...service,
            _id: String(service.id),
            // Map ingredients
            products: ingredients.map((i: any) => ({
                id: String(i.product_id),
                productId: String(i.product_id),
                name: i.product_name || 'Unknown Product',
                productName: i.product_name || 'Unknown Product',
                quantity: i.quantity,
                unitCost: i.unit_cost || 0,
            })),
            // Map variants and their ingredients
            variants: variants.map((v: any) => ({
                id: v.id,
                name: v.name,
                price: v.price,
                products: variantIngredients
                    .filter((vi: any) => String(vi.variant_id) === String(v.id))
                    .map((vi: any) => ({
                        id: String(vi.product_id),
                        productId: String(vi.product_id),
                        name: vi.product_name || 'Unknown Product',
                        productName: vi.product_name || 'Unknown Product',
                        quantity: vi.quantity,
                        unitCost: vi.product_cost || 0
                    }))
            })),
            active: service.active !== 0,
            showInPOS: Boolean(service.showInPos)
        };

        return NextResponse.json(response);

    } catch (e: any) {
        console.error("Fetch Service Error:", e);
        return NextResponse.json({ message: e.message || 'Failed to fetch service' }, { status: 500 });
    }
}

// PUT: Update Service (Full Replace of nested items for simplicity)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json() as any;
        const db = await getDB();

        console.log(`Updating Service ${id}:`, JSON.stringify(body, null, 2));

        const {
            name,
            description,
            category,
            category_id, // Alt
            servicePrice,
            laborCost,
            laborCostType,
            durationMinutes,
            showInPOS,
            image,
            image_url, // Alt
            products,
            variants
        } = body;

        const finalCategory = category !== undefined ? category : (category_id !== undefined ? category_id : null);
        const finalImage = image !== undefined ? image : (image_url !== undefined ? image_url : '');

        // 1. Update Service Record
        await db.prepare(`
            UPDATE services
            SET name=?, description=?, category_id=?, servicePrice=?, laborCost=?, laborCostType=?, durationMinutes=?, showInPos=?, image_url=?
            WHERE id=?
        `).bind(
            name,
            description || '',
            finalCategory,
            servicePrice || 0,
            laborCost || 0,
            laborCostType || 'fixed',
            durationMinutes || 0,
            showInPOS ? 1 : 0,
            finalImage,
            id
        ).run();

        // 2. Replace Base Ingredients
        // (Transaction support in D1 via batch is possible but better-sqlite3 differs, handling sequentially is fine for this app)
        await db.prepare('DELETE FROM service_ingredients WHERE service_id = ?').bind(id).run();

        if (products && Array.isArray(products)) {
            for (const prod of products) {
                // Check if valid product (handle id, product_id, productId)
                const pId = prod.id || prod.product_id || prod.productId;
                if (pId) {
                    await db.prepare(`
                        INSERT INTO service_ingredients (service_id, product_id, quantity)
                        VALUES (?, ?, ?)
                    `).bind(id, pId, prod.quantity || 1).run();
                }
            }
        }

        // 3. Replace Variants
        // Explicitly delete ingredients first to ensure no orphans if FK cascade fails/is off
        await db.prepare(`
            DELETE FROM service_variant_ingredients
            WHERE variant_id IN (SELECT id FROM service_variants WHERE service_id = ?)
        `).bind(id).run();

        await db.prepare('DELETE FROM service_variants WHERE service_id = ?').bind(id).run();

        if (variants && Array.isArray(variants)) {
            console.log(`Processing ${variants.length} variants`);
            for (const variant of variants) {
                console.log("Inserting variant:", variant.name);
                const vRes = await db.prepare(`
                    INSERT INTO service_variants (service_id, name, price)
                    VALUES (?, ?, ?)
                `).bind(id, variant.name, variant.price).run();

                // Ensure we get a valid ID (handle BigInt or Number)
                const rawId = vRes.meta.last_row_id;
                const variantId = rawId ? Number(rawId) : null;

                console.log("Variant inserted, ID:", variantId);

                if (variantId && variant.products && Array.isArray(variant.products)) {
                    console.log(`Processing ${variant.products.length} ingredients for variant ${variantId}`);
                    for (const vProd of variant.products) {
                        const vpId = vProd.id || vProd.product_id || vProd.productId;

                        console.log("Variant ingredient ID check:", vpId);

                        if (vpId) {
                            await db.prepare(`
                                INSERT INTO service_variant_ingredients (variant_id, product_id, quantity)
                                VALUES (?, ?, ?)
                            `).bind(variantId, vpId, vProd.quantity || 1).run();
                        } else {
                            console.warn("Skipping variant ingredient with no product ID:", vProd);
                        }
                    }
                }
            }
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error("Update Service Error:", e);
        return NextResponse.json({ message: e.message || 'Failed to update service' }, { status: 500 });
    }
}

// DELETE: Remove Service
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const db = await getDB();

        // Cascading delete handles children
        await db.prepare('DELETE FROM services WHERE id = ?').bind(id).run();

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("Delete Service Error:", e);
        return NextResponse.json({ message: e.message || 'Failed to delete service' }, { status: 500 });
    }
}
