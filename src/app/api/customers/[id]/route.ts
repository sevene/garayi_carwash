import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const db = await getDB();

        const result = await db.prepare('SELECT * FROM customers WHERE id = ?').bind(id).first<any>();

        if (!result) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        // Fetch Vehicles
        let vehicles: any[] = [];
        try {
            const vehicleRes = await db.prepare('SELECT * FROM customer_vehicles WHERE customer_id = ?').bind(id).all();
            vehicles = vehicleRes.results;
        } catch (e) {
            console.warn("Could not fetch customer vehicles", e);
        }

        // Map Vehicles
        let cars: any[] = [];
        if (vehicles.length > 0) {
            cars = vehicles.map((v: any) => ({
                id: v.id,
                plateNumber: v.plate_number,
                makeModel: v.vehicle_type, // map as makeModel for frontend
                color: v.vehicle_color || '',
                size: v.vehicle_size || ''
            }));
        }

        // Map DB Record to Frontend Interface
        const customer = {
            _id: result.id.toString(),
            name: result.name,
            email: result.email || '',
            phone: result.phone || '',
            address: {
                street: result.address_street || '',
                city: result.address_city || '',
                zip: result.address_zip || ''
            },
            notes: result.notes || '',
            cars,
            loyaltyPoints: result.loyalty_points || 0,
            createdAt: result.last_visit
        };

        return NextResponse.json(customer);

    } catch (e: any) {
        console.error("Fetch Customer Error:", e);
        return NextResponse.json({ error: e.message || 'Failed to fetch customer' }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json() as any;
        const db = await getDB();

        console.log(`Updating Customer ${id}:`, body);

        const { name, email, phone, address, notes, cars, loyaltyPoints } = body;

        // 1. Update Customer Record
        const result = await db.prepare(`
            UPDATE customers SET
                name = ?,
                email = ?,
                phone = ?,
                address_street = ?,
                address_city = ?,
                address_zip = ?,
                notes = ?,
                loyalty_points = ?,
                last_visit = CURRENT_TIMESTAMP
            WHERE id = ?
        `).bind(
            name,
            email || '',
            phone || '',
            address?.street || '',
            address?.city || '',
            address?.zip || '',
            notes || '',
            loyaltyPoints || 0,
            id
        ).run();

        if (!result.success) {
            throw new Error("Failed to update customer");
        }

        // 2. Sync Vehicles (Delete all and Re-insert)
        // This is safer than trying to diff the lists given the simple UI
        await db.prepare('DELETE FROM customer_vehicles WHERE customer_id = ?').bind(id).run();

        if (cars && Array.isArray(cars) && cars.length > 0) {
            for (const car of cars) {
                await db.prepare(`
                    INSERT INTO customer_vehicles (customer_id, plate_number, vehicle_type, vehicle_color, vehicle_size)
                    VALUES (?, ?, ?, ?, ?)
                `).bind(
                    id,
                    car.plateNumber,
                    car.makeModel || 'SEDAN',
                    car.color || null,
                    car.size || null
                ).run();
            }
        }

        // Return updated object
        return NextResponse.json({
            _id: id,
            name,
            email,
            phone,
            address: address || { street: '', city: '', zip: '' },
            notes,
            cars: cars || [],
            loyaltyPoints,
            createdAt: new Date().toISOString()
        });

    } catch (e: any) {
        console.error("Customer PUT Error:", e);
        return NextResponse.json({ error: e.message || 'Failed to update customer' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const db = await getDB();

        // Check if customer exists
        const exists = await db.prepare('SELECT id FROM customers WHERE id = ?').bind(id).first();
        if (!exists) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        // 1. Unlink Tickets (Set customer_id to NULL so we keep sales history)
        try {
            await db.prepare('UPDATE tickets SET customer_id = NULL WHERE customer_id = ?').bind(id).run();
        } catch (e) {
            console.warn("Failed to unlink tickets", e);
        }

        // 2. Delete Vehicles (Manually delete to be safe)
        try {
            await db.prepare('DELETE FROM customer_vehicles WHERE customer_id = ?').bind(id).run();
        } catch (e) {
            console.warn("Failed to delete derived vehicles", e);
        }

        // 3. Delete Customer
        await db.prepare('DELETE FROM customers WHERE id = ?').bind(id).run();

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("Customer DELETE Error:", e);
        return NextResponse.json({ error: e.message || 'Failed to delete customer' }, { status: 500 });
    }
}
