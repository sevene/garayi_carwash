import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

// export const runtime = 'edge';
// export const runtime = 'nodejs';

export async function GET() {
    try {
        const db = await getDB();

        try {
            const { results } = await db.prepare('SELECT * FROM roles').all();
            return NextResponse.json(results.map((r: any) => ({
                ...r,
                _id: String(r.id),
                permissions: r.permissions ? JSON.parse(r.permissions) : [],
                assignments: r.assignments ? JSON.parse(r.assignments) : []
            })));
        } catch (e: any) {
            // If table doesn't exist, return empty array
            if (e.message && e.message.includes('no such table')) {
                return NextResponse.json([]);
            }
            throw e;
        }
    } catch (e) {
        console.error('Failed to fetch roles:', e);
        return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const db = await getDB();
        const body = await req.json() as {
            name: string;
            displayName: string;
            permissions: string[];
            description: string;
            assignments?: string[];
        };
        const { name, displayName, permissions, description, assignments } = body;

        // Ensure table exists (dirty dev hack, but useful if migrations aren't managed)
        await db.prepare(`
            CREATE TABLE IF NOT EXISTS roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                displayName TEXT,
                permissions TEXT,
                description TEXT,
                assignments TEXT
            )
        `).run();

        const res = await db.prepare(
            'INSERT INTO roles (name, displayName, permissions, description, assignments) VALUES (?, ?, ?, ?, ?) RETURNING *'
        ).bind(name, displayName, JSON.stringify(permissions || []), description, JSON.stringify(assignments || [])).first();

        // Check if res is valid (SQLite adapter might return slightly different if not careful, but first() logic seems fine)
        if (!res) throw new Error('Failed to insert role');

        return NextResponse.json({
            ...res,
            _id: String(res.id),
            permissions: res.permissions ? JSON.parse(res.permissions as string) : [],
            assignments: res.assignments ? JSON.parse(res.assignments as string) : []
        });
    } catch (e) {
        console.error('Failed to create role:', e);
        return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
    }
}
