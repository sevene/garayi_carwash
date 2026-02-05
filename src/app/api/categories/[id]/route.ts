import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const db = await getDB();
        const body = await req.json() as {
            name: string;
            description?: string;
            parentId?: string | null;
            active?: boolean;
        };

        const { name, description, parentId, active } = body;

        const result = await db.prepare(`
            UPDATE categories
            SET name = ?, description = ?, parent_id = ?, active = ?
            WHERE id = ?
        `).bind(
            name,
            description || null,
            parentId ? parseInt(parentId) : null,
            active === false ? 0 : 1,
            id
        ).run();

        if (result.success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
        }
    } catch (e: any) {
        console.error("Update Category Error:", e);
        return NextResponse.json({ message: e.message || 'Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const db = await getDB();

        // Optional: Check for children or products using this category before delete?
        // For now, simple delete.

        const result = await db.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();

        if (result.success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
        }
    } catch (e: any) {
        console.error("Delete Category Error:", e);
        return NextResponse.json({ message: e.message || 'Server Error' }, { status: 500 });
    }
}
