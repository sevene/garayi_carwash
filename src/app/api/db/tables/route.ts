import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const db = await getDB();
        // SQLite specific query to list tables
        const { results } = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();

        return NextResponse.json(results.map((r: any) => r.name));
    } catch (e: any) {
        console.error("List Tables Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
