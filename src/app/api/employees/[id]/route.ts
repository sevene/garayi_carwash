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
            username: string;
            password?: string;
            role: string;
            pin: string;
            contactInfo: any;
            address: string;
            status: string;
            compensation: any;
        };
        const { name, username, password, role, pin, contactInfo, address, status, compensation } = body;

        // Hash the password if provided
        let hashedPassword: string | null = null;
        if (password && password.trim() !== '') {
            const { hashPassword } = await import('@/lib/auth');
            hashedPassword = await hashPassword(password);
        }

        // Build update query - only update password if a new one was provided
        let query: string;
        let bindings: any[];

        if (hashedPassword) {
            query = `UPDATE employees SET
                name = ?,
                username = ?,
                role = ?,
                pin = ?,
                password_hash = ?,
                contactInfo = ?,
                address = ?,
                status = ?,
                compensation = ?
             WHERE id = ? RETURNING *`;
            bindings = [
                name,
                username || name,
                role,
                pin,
                hashedPassword,
                JSON.stringify(contactInfo || {}),
                address,
                status,
                JSON.stringify(compensation || {}),
                id
            ];
        } else {
            query = `UPDATE employees SET
                name = ?,
                username = ?,
                role = ?,
                pin = ?,
                contactInfo = ?,
                address = ?,
                status = ?,
                compensation = ?
             WHERE id = ? RETURNING *`;
            bindings = [
                name,
                username || name,
                role,
                pin,
                JSON.stringify(contactInfo || {}),
                address,
                status,
                JSON.stringify(compensation || {}),
                id
            ];
        }

        const res = await db.prepare(query).bind(...bindings).first();

        if (!res) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        return NextResponse.json({
            ...res,
            _id: String(res.id),
            contactInfo: res.contactInfo ? JSON.parse(res.contactInfo as string) : {},
            compensation: res.compensation ? JSON.parse(res.compensation as string) : {}
        });
    } catch (e) {
        console.error('Failed to update employee:', e);
        return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const db = await getDB();
        const { id } = params;

        const res = await db.prepare('DELETE FROM employees WHERE id = ?').bind(id).run();

        if (!res.success) {
            throw new Error('Failed to delete from DB');
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Failed to delete employee:', e);
        return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
    }
}
