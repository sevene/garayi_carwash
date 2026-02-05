import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const db = await getDB();

        // 1. Fetch Categories
        const categoriesRes = await db.prepare('SELECT * FROM categories').all();
        let categories = categoriesRes.results.map((c: any) => ({
            _id: String(c.id),
            name: c.name
        }));

        if (categories.length === 0) {
            categories = [
                { _id: 'cat_wash', name: 'Wash' },
                { _id: 'cat_detail', name: 'Detail' },
                { _id: 'cat_addon', name: 'Addon' }
            ];
        }

        // 2. Fetch Services (filtered by showInPos = 1)
        const servicesRes = await db.prepare(`
            SELECT s.*, c.name as category_name
            FROM services s
            LEFT JOIN categories c ON s.category_id = c.id
            WHERE s.showInPos = 1
        `).all();

        const serviceIds = servicesRes.results.map((s: any) => s.id);

        // Fetch Service Variants
        let allVariants: any[] = [];
        let allVariantIngredients: any[] = [];
        let allServiceIngredients: any[] = [];

        if (serviceIds.length > 0) {
            // Variants
            const variantsRes = await db.prepare(`
                SELECT * FROM service_variants
                WHERE service_id IN (${serviceIds.map(() => '?').join(',')})
            `).bind(...serviceIds).all();
            allVariants = variantsRes.results;

            if (allVariants.length > 0) {
                const variantIds = allVariants.map(v => v.id);
                const varIngredientsRes = await db.prepare(`
                    SELECT svi.*, p.name as product_name
                    FROM service_variant_ingredients svi
                    LEFT JOIN products p ON svi.product_id = p.id
                    WHERE svi.variant_id IN (${variantIds.map(() => '?').join(',')})
                `).bind(...variantIds).all();
                allVariantIngredients = varIngredientsRes.results;
            }

            // Base Service Ingredients
            const svcIngredientsRes = await db.prepare(`
                SELECT si.*, p.name as product_name
                FROM service_ingredients si
                LEFT JOIN products p ON si.product_id = p.id
                WHERE si.service_id IN (${serviceIds.map(() => '?').join(',')})
            `).bind(...serviceIds).all();
            allServiceIngredients = svcIngredientsRes.results;
        }

        const services = servicesRes.results.map((s: any) => {
            const serviceVariants = allVariants
                .filter((v: any) => v.service_id === s.id)
                .map((v: any) => {
                    const ingredients = allVariantIngredients
                        .filter((vi: any) => vi.variant_id === v.id)
                        .map((vi: any) => ({
                            productId: String(vi.product_id),
                            productName: vi.product_name || 'Unknown Ingredient',
                            quantity: vi.quantity || 1,
                            unitCost: 0
                        }));

                    return {
                        id: v.id,
                        name: v.name,
                        price: v.price || 0,
                        products: ingredients
                    };
                });

            const baseProducts = allServiceIngredients
                .filter((si: any) => String(si.service_id) === String(s.id))
                .map((si: any) => ({
                    productId: String(si.product_id),
                    productName: si.product_name || 'Unknown Ingredient',
                    quantity: si.quantity || 1,
                    unitCost: 0
                }));

            return {
                _id: String(s.id),
                name: s.name,
                description: s.description,
                category: s.category_id ? String(s.category_id) : undefined,
                servicePrice: s.servicePrice || 0,
                laborCost: s.laborCost || 0,
                laborCostType: s.laborCostType || 'fixed',
                durationMinutes: s.durationMinutes || 0,
                showInPOS: true,
                image: s.image_url || '',
                variants: serviceVariants,
                products: baseProducts
            };
        });

        // 3. Fetch Products
        const productsRes = await db.prepare(`
            SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category = CAST(c.id AS TEXT)
            WHERE p.show_in_pos = 1
        `).all();

        const products = productsRes.results.map((p: any) => ({
            _id: String(p.id),
            name: p.name,
            sku: p.sku,
            price: p.price || 0,
            category: p.category ? String(p.category) : undefined,
            stock: p.stock_quantity || 0,
            showInPOS: true,
            image: p.image_url || ''
        }));

        // 4. Fetch Customers & Vehicles
        const customersRes = await db.prepare('SELECT * FROM customers').all();
        let customerVehicles: any[] = [];
        try {
            const vehiclesRes = await db.prepare('SELECT * FROM customer_vehicles').all();
            customerVehicles = vehiclesRes.results;
        } catch (err) { }

        const customers = customersRes.results.map((c: any) => {
            const phone = c.phone || '';
            let cars = customerVehicles
                .filter((v: any) => v.customer_id === c.id)
                .map((v: any) => ({
                    id: String(v.id),
                    plateNumber: v.plate_number,
                    vehicleType: v.vehicle_type,
                    color: v.vehicle_color,
                    size: v.vehicle_size,
                    makeModel: v.vehicle_type
                }));

            if (cars.length === 0 && c.plate_number) {
                cars.push({
                    id: 'legacy_' + c.id,
                    plateNumber: c.plate_number,
                    vehicleType: c.vehicle_type || 'SEDAN',
                    makeModel: c.vehicle_type,
                    color: '',
                    size: ''
                });
            }

            const primaryCar = cars.length > 0 ? cars[0] : null;
            const plateNumber = primaryCar ? primaryCar.plateNumber : (c.plate_number || '');
            const vehicleType = primaryCar ? primaryCar.vehicleType : (c.vehicle_type || '');

            let contactInfo = '';
            if (cars.length > 0) {
                if (cars.length === 1) {
                    contactInfo = `${cars[0].plateNumber} • ${cars[0].vehicleType}`;
                } else {
                    contactInfo = `${cars.length} Vehicles • ${cars[0].plateNumber}, ...`;
                }
            } else if (phone) {
                contactInfo = phone;
            } else {
                contactInfo = 'No contact info';
            }

            return {
                _id: String(c.id),
                name: c.name,
                phone,
                plateNumber,
                vehicleType,
                contactInfo,
                cars
            };
        });

        // 5. Fetch Employees
        const employeesRes = await db.prepare('SELECT * FROM employees WHERE status = ?').bind('active').all();
        const employees = employeesRes.results.map((e: any) => ({
            _id: String(e.id),
            name: e.name,
            role: e.role
        }));

        // 6. Inventory Map
        const inventoryRes = await db.prepare('SELECT id, stock_quantity FROM products').all();
        const inventoryMap: Record<string, number> = {};
        inventoryRes.results.forEach((item: any) => {
            inventoryMap[String(item.id)] = item.stock_quantity ?? 0;
        });

        return NextResponse.json({
            categories,
            services,
            products,
            customers,
            employees,
            inventory: inventoryMap,
            timestamp: Date.now()
        });

    } catch (e: any) {
        console.error("Failed to fetch sync data:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
