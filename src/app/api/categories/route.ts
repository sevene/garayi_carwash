import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const db = await getDB();
        const { results } = await db.prepare('SELECT * FROM categories ORDER BY created_at DESC').all();

        return NextResponse.json(results.map((c: any) => ({
            _id: String(c.id),
            name: c.name,
            description: c.description,
            parentId: c.parent_id ? String(c.parent_id) : null,
            active: Boolean(c.active)
        })));
    } catch (e) {
        console.error("Fetch Categories Error:", e);
        return NextResponse.json([], { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const db = await getDB();
        const body = await req.json() as {
            name: string;
            description?: string;
            parentId?: string | null;
            active?: boolean;
        };

        const { name, description, parentId, active } = body;

        const result = await db.prepare(`
            INSERT INTO categories (name, description, parent_id, active)
            VALUES (?, ?, ?, ?)
        `).bind(
            name,
            description || null,
            parentId ? parseInt(parentId) : null,
            active === false ? 0 : 1
        ).run();

        if (result.success) {
            return NextResponse.json({ success: true, id: result.meta.last_row_id }, { status: 201 });
        } else {
            return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
        }
    } catch (e: any) {
        console.error("Create Category Error:", e);
        return NextResponse.json({ message: e.message || 'Server Error' }, { status: 500 });
    }
}
