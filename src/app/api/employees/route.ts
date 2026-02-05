import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const db = await getDB();

        const { results } = await db.prepare('SELECT * FROM employees ORDER BY created_at DESC').all();
        return NextResponse.json(results.map((e: any) => ({
            ...e,
            _id: String(e.id),
            contactInfo: e.contactInfo ? (typeof e.contactInfo === 'string' ? JSON.parse(e.contactInfo) : e.contactInfo) : { phone: '', email: '' },
            compensation: e.compensation ? (typeof e.compensation === 'string' ? JSON.parse(e.compensation) : e.compensation) : { payType: 'hourly', rate: 0, commission: 0 }
        })));
    } catch (e) {
        console.error('Failed to fetch employees:', e);
        return NextResponse.json({ error: 'Failed to fetch employees', details: String(e) }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const db = await getDB();
        const body = await req.json() as any;
        const { name, username, password, role, pin, contactInfo, address, status, compensation } = body;

        // Hash the password if provided
        let hashedPassword = null;
        if (password && password.trim() !== '') {
            const { hashPassword } = await import('@/lib/auth');
            hashedPassword = await hashPassword(password);
        }

        const res = await db.prepare(
            `INSERT INTO employees (name, username, role, pin, password_hash, contactInfo, address, status, compensation)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
        ).bind(
            name,
            username || name,
            role || 'staff',
            pin || null,
            hashedPassword,
            JSON.stringify(contactInfo || {}),
            address || null,
            status || 'active',
            JSON.stringify(compensation || {})
        ).first();

        if (!res) throw new Error('Failed to insert employee');

        return NextResponse.json({
            ...res,
            _id: String(res.id),
            contactInfo: res.contactInfo ? (typeof res.contactInfo === 'string' ? JSON.parse(res.contactInfo) : res.contactInfo) : {},
            compensation: res.compensation ? (typeof res.compensation === 'string' ? JSON.parse(res.compensation) : res.compensation) : {}
        });
    } catch (e) {
        console.error('Failed to create employee:', e);
        return NextResponse.json({ error: 'Failed to create employee', details: String(e) }, { status: 500 });
    }
}
