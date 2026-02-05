import { NextResponse } from 'next/server';
import { hashPassword, createSession } from '@/lib/auth';
import { getDB } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const { username, password } = (await req.json()) as any;

        if (!username || !password) {
            return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
        }

        const db = await getDB();

        // Hash the input password
        const hashedPassword = await hashPassword(password);

        // Verify against DB (using employees table)
        // We use 'username' for matching now
        const { results } = await db.prepare(
            'SELECT * FROM employees WHERE username = ? AND password_hash = ?'
        ).bind(username, hashedPassword).all();

        const user = results[0] as any;

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Create Session
        const token = await createSession({
            userId: user.id || user.ID,
            username: user.username || user.name || 'Unknown', // Prefer username for session identification
            role: user.role || 'staff'
        });

        const response = NextResponse.json({ success: true, redirect: '/admin/dashboard/overview' });

        // Set HTTP-only cookie
        response.cookies.set('session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 // 1 day
        });

        return response;

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
