import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json() as { query: string };
        const { query } = body;

        if (!query) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        const db = await getDB();
        const stmt = db.prepare(query);

        // Determine if it's a SELECT or other statement to decide whether to use .all() or .run()
        // Simple heuristic: check if it starts with SELECT or PRAGMA (case insensitive)
        const upperQuery = query.trim().toUpperCase();
        const isSelect = upperQuery.startsWith('SELECT') || upperQuery.startsWith('PRAGMA');

        let result;
        if (isSelect) {
            result = await stmt.all();
            return NextResponse.json({
                type: 'SELECT',
                data: result.results
            });
        } else {
            result = await stmt.run();
            return NextResponse.json({
                type: 'EXECUTE',
                success: result.success,
                meta: result.meta
            });
        }

    } catch (e: any) {
        console.error("Execute Query Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
