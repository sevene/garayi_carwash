import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const { env } = await getCloudflareContext({ async: true });
        const db = env.DB;
        const { results } = await db.prepare('SELECT * FROM expenses ORDER BY date DESC').all();

        return NextResponse.json(results.map((e: any) => ({
            ...e,
            _id: String(e.id)
        })));
    } catch (e) {
        return NextResponse.json([]);
    }
}
