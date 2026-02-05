import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

// export const runtime = 'edge';
// export const runtime = 'nodejs';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const db = await getDB();
        const { id } = params;
        const body = await req.json() as {
            name: string;
            displayName: string;
            permissions: string[];
            description: string;
            assignments?: string[];
        };
        const { name, displayName, permissions, description, assignments } = body;

        const res = await db.prepare(
            'UPDATE roles SET name = ?, displayName = ?, permissions = ?, description = ?, assignments = ? WHERE id = ? RETURNING *'
        ).bind(name, displayName, JSON.stringify(permissions || []), description, JSON.stringify(assignments || []), id).first();

        if (!res) {
            return NextResponse.json({ error: 'Role not found' }, { status: 404 });
        }

        return NextResponse.json({
            ...res,
            _id: String(res.id),
            permissions: res.permissions ? JSON.parse(res.permissions as string) : [],
            assignments: res.assignments ? JSON.parse(res.assignments as string) : []
        });
    } catch (e) {
        console.error('Failed to update role:', e);
        return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const db = await getDB();
        const { id } = params;

        const res = await db.prepare('DELETE FROM roles WHERE id = ?').bind(id).run();

        // D1 run() returns { success, meta }
        if (!res.success) {
            throw new Error('Failed to delete from DB');
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Failed to delete role:', e);
        return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
    }
}
