import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const db = await getDB();
        // Query only the products table (inventory items)
        const { results } = await db.prepare(`
            SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category = CAST(c.id AS TEXT)
        `).all();

        const normalizedResults = results.map((p: any) => ({
            ...p,
            _id: String(p.id),
            // Explicitly cast generic ID
            id: String(p.id),
            // Generic price
            price: p.price,
            // Prefer the joined category name, fallback to the raw value
            category: p.category_name || p.category,
            // Map integer to boolean
            showInPOS: Boolean(p.show_in_pos),
            // Map DB stock_quantity to Frontend stock
            stock: p.stock_quantity ?? 0,
            threshold: p.low_stock_threshold ?? 10
        }));

        if (normalizedResults.length === 0) {
            // Updated Mock Data - Purely Products
            const MOCK_PRODUCT_DATA = [
                { id: 'mock-1', name: 'Car Soap 1L', sku: 'SUP001', price: 50.00, category: 'Cleaning', stock_quantity: 20, show_in_pos: 1 },
                { id: 'mock-2', name: 'Microfiber Cloth', sku: 'SUP002', price: 15.00, category: 'Cleaning', stock_quantity: 100, show_in_pos: 1 },
                { id: 'mock-3', name: 'Air Freshener', sku: 'ACC001', price: 10.00, category: 'Accessories', stock_quantity: 50, show_in_pos: 1 }
            ];

            return NextResponse.json(MOCK_PRODUCT_DATA.map(p => ({
                ...p,
                _id: String(p.id),
                showInPOS: Boolean(p.show_in_pos)
            })));
        }

        return NextResponse.json(normalizedResults);
    } catch (e) {
        console.error("Products API Error:", e);
        // Fallback to mocks on error
        const MOCK_PRODUCT_DATA = [
            { id: 'mock-1', name: 'Car Soap 1L', sku: 'SUP001', price: 50.00, category: 'Cleaning', stock_quantity: 20, show_in_pos: 1 },
            { id: 'mock-2', name: 'Microfiber Cloth', sku: 'SUP002', price: 15.00, category: 'Cleaning', stock_quantity: 100, show_in_pos: 1 },
            { id: 'mock-3', name: 'Air Freshener', sku: 'ACC001', price: 10.00, category: 'Accessories', stock_quantity: 50, show_in_pos: 1 }
        ];

        return NextResponse.json(MOCK_PRODUCT_DATA.map(p => ({
            ...p,
            _id: String(p.id),
            showInPOS: Boolean(p.show_in_pos)
        })));
    }
}

export async function POST(req: Request) {
    try {
        const db = await getDB();
        const body = await req.json() as {
            name: string;
            sku: string;
            category: string;
            price: number;
            volume: string;
            soldBy: string;
            cost: number;
            stock: number;
            threshold?: number;
            showInPOS: boolean;
            image: string;
        };

        console.log("Creating Product - Payload:", JSON.stringify(body, null, 2));
        const { name, sku, category, price, volume, soldBy, cost, stock, threshold, showInPOS, image } = body;

        const numericPrice = parseFloat(String(price));

        // Insert into proper products table with clean schema
        const result = await db.prepare(`
            INSERT INTO products (name, sku, category, price, volume, unit_type, cost, stock_quantity, low_stock_threshold, show_in_pos, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            name,
            sku,
            category,
            numericPrice,
            volume,
            soldBy,
            cost,
            stock,
            threshold ?? 10,
            showInPOS ? 1 : 0,
            image
        ).run();

        if (result.success) {
            return NextResponse.json({ success: true, id: result.meta.last_row_id }, { status: 201 });
        } else {
            return NextResponse.json({ error: 'Failed to insert product' }, { status: 500 });
        }

    } catch (e: any) {
        console.error("Product Creation Error:", e);
        return NextResponse.json({
            message: e.message || 'Failed to create product',
            details: e.toString()
        }, { status: 500 });
    }
}
