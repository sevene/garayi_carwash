import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const db = await getDB();

        const product = await db.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // Normalize ID and map fields for frontend compatibility
        const normalizedProduct = {
            ...product,
            _id: String(product.id),
            price: product.price, // Map price
            soldBy: product.unit_type,  // Map unit_type to soldBy
            showInPOS: Boolean(product.show_in_pos), // Map integer to boolean
            image: product.image_url // Map snake_case to camelCase
        };

        return NextResponse.json(normalizedProduct);
    } catch (e: any) {
        console.error("Product Fetch Error:", e);
        return NextResponse.json({ message: e.message || 'Failed to fetch product' }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const db = await getDB();
        const body = await req.json() as any;

        // Check if we are doing a partial update (e.g. toggle POS) or full update
        const updates: string[] = [];
        const values: any[] = [];

        let stockChange: { new: number, reason?: string } | null = null;

        const { name, sku, category, price, volume, soldBy, cost, stock, threshold, showInPOS, image, reason } = body;

        if (name !== undefined) { updates.push('name = ?'); values.push(name); }
        if (sku !== undefined) { updates.push('sku = ?'); values.push(sku); }
        if (category !== undefined) { updates.push('category = ?'); values.push(category); }

        if (price !== undefined) {
            const numericPrice = parseFloat(String(price));
            updates.push('price = ?');
            values.push(numericPrice);
        }

        if (volume !== undefined) { updates.push('volume = ?'); values.push(volume); }
        if (soldBy !== undefined) { updates.push('unit_type = ?'); values.push(soldBy); }
        if (cost !== undefined) { updates.push('cost = ?'); values.push(cost); }

        if (stock !== undefined) {
            updates.push('stock_quantity = ?');
            values.push(stock);
            stockChange = { new: stock, reason };
        }

        if (threshold !== undefined) {
            updates.push('low_stock_threshold = ?');
            values.push(threshold);
        }

        if (showInPOS !== undefined) {
            updates.push('show_in_pos = ?');
            values.push(showInPOS ? 1 : 0);
        }

        if (image !== undefined) { updates.push('image_url = ?'); values.push(image); }

        if (updates.length > 0) {
            values.push(id); // For WHERE clause

            // If stock is changing, we should log it
            if (stockChange) {
                // Fetch current stock first
                const currentProd = await db.prepare('SELECT stock_quantity FROM products WHERE id = ?').bind(id).first();
                const oldStock = currentProd ? (currentProd.stock_quantity as number) : 0;
                const changeAmount = stockChange.new - oldStock;

                await db.prepare(`
                    INSERT INTO inventory_logs (product_id, previous_stock, new_stock, change_amount, reason)
                    VALUES (?, ?, ?, ?, ?)
                `).bind(id, oldStock, stockChange.new, changeAmount, stockChange.reason || 'Manual Update').run();
            }

            const query = `UPDATE products SET ${updates.join(', ')} WHERE id = ?`;
            await db.prepare(query).bind(...values).run();
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("Product Update Error:", e);
        return NextResponse.json({
            message: e.message || 'Failed to update product',
            details: e.toString()
        }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const db = await getDB();

        await db.prepare('DELETE FROM products WHERE id = ?').bind(id).run();

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("Product Delete Error:", e);
        return NextResponse.json({ message: e.message || 'Failed to delete product' }, { status: 500 });
    }
}
