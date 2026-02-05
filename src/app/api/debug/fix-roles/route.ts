import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

// Fixes Employee Roles to use IDs consistently, instead of mix of Names and IDs.
export async function GET() {
    try {
        const db = await getDB();

        // 1. Get all roles to map Name -> ID
        const roles = await db.prepare('SELECT * FROM roles').all();
        const roleMap = new Map();
        roles.results.forEach((r: any) => {
            roleMap.set(r.name, String(r.id));
            roleMap.set(String(r.id), String(r.id)); // Map ID to ID
        });

        const employees = await db.prepare('SELECT id, name, role FROM employees').all();

        let updates = 0;
        const details = [];

        // 2. Iterate employees and fix roles
        for (const emp of employees.results as any[]) {
            const currentRole = emp.role;
            // If role is a name (e.g. 'admin'), find the ID (e.g. '1')
            // If role is an ID (e.g. '2'), it maps to '2'.
            // Explicitly handle 'admin' -> '1' case if map works

            // Check if currentRole is a key in our map (which keys are names and ids)
            // But we specifically want to convert Name -> ID.
            // If currentRole is 'admin', we want '1'.

            // Let's find the role by name
            const roleByName = roles.results.find((r: any) => r.name === currentRole);

            if (roleByName) {
                const correctId = String(roleByName.id);
                if (currentRole !== correctId) {
                    await db.prepare('UPDATE employees SET role = ? WHERE id = ?').bind(correctId, emp.id).run();
                    updates++;
                    details.push(`Updated ${emp.name}: '${currentRole}' -> '${correctId}'`);
                }
            }
        }

        return NextResponse.json({
            success: true,
            updates,
            details,
            message: "Standardized employee roles to use IDs."
        });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
