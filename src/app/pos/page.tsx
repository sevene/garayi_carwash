import { getCloudflareContext } from '@opennextjs/cloudflare';
import { POSContent } from '@/components/pos/POSContent';

export const dynamic = 'force-dynamic';

export default async function POSPage() {
    let services: any[] = [];
    let products: any[] = [];
    let categories: any[] = [];
    let customers: any[] = [];
    let employees: any[] = [];
    let inventoryMap: Record<string, number> = {};

    try {
        const { env } = await getCloudflareContext({ async: true });
        const db = (env as any).DB as D1Database;

        // 1. Fetch Categories
        const categoriesRes = await db.prepare('SELECT * FROM categories').all();
        categories = categoriesRes.results.map((c: any) => ({
            _id: String(c.id),
            name: c.name
        }));

        // If no categories, use defaults
        if (categories.length === 0) {
            categories = [
                { _id: 'cat_wash', name: 'Wash' },
                { _id: 'cat_detail', name: 'Detail' },
                { _id: 'cat_addon', name: 'Addon' }
            ];
        }

        // 2. Fetch Services (filtered by showInPos = 1)
        // Note: DB column is showInPos, API returns showInPOS
        const servicesRes = await db.prepare(`
            SELECT s.*, c.name as category_name
            FROM services s
            LEFT JOIN categories c ON s.category_id = c.id
            WHERE s.showInPos = 1
        `).all();

        // Fetch all variants for visible services
        const serviceIds = servicesRes.results.map((s: any) => s.id);
        let allVariants: any[] = [];
        let allVariantIngredients: any[] = [];

        if (serviceIds.length > 0) {
            const variantsRes = await db.prepare(`
                SELECT * FROM service_variants
                WHERE service_id IN (${serviceIds.map(() => '?').join(',')})
            `).bind(...serviceIds).all();
            allVariants = variantsRes.results;

            // Fetch ingredients for these variants
            if (allVariants.length > 0) {
                const variantIds = allVariants.map(v => v.id);
                // We join products to get the name for display purposes (tooltip)
                const varIngredientsRes = await db.prepare(`
                    SELECT svi.*, p.name as product_name
                    FROM service_variant_ingredients svi
                    LEFT JOIN products p ON svi.product_id = p.id
                    WHERE svi.variant_id IN (${variantIds.map(() => '?').join(',')})
                `).bind(...variantIds).all();
                allVariantIngredients = varIngredientsRes.results;
            }
        }

        services = servicesRes.results.map((s: any) => {
            // Get variants for this service
            const serviceVariants = allVariants
                .filter((v: any) => v.service_id === s.id)
                .map((v: any) => {
                    // Get ingredients for this variant
                    const ingredients = allVariantIngredients
                        .filter((vi: any) => vi.variant_id === v.id)
                        .map((vi: any) => ({
                            productId: String(vi.product_id),
                            productName: vi.product_name || 'Unknown Ingredient',
                            quantity: vi.quantity || 1,
                            unitCost: 0 // Not strictly needed for availability check
                        }));

                    return {
                        id: v.id,
                        name: v.name,
                        price: v.price || 0,
                        products: ingredients
                    };
                });

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
                // We must also fetch base service ingredients if they exist (table service_ingredients)
                // The current code didn't seem to fetch BASE ingredients for the service itself?
                // Wait, looking at lines 36-41 in original file, it selects from `services`.
                // It does NOT seem to fetch `service_ingredients`.
                // The user's prompt implies "service Basic Wash... rely on the product".
                // If it's a base service ingredient, we need that too.
                products: [] // Placeholder, we need to fetch base ingredients too!
            };
        });

        // 2a. Fetch Base Service Ingredients (CRITICAL MISSING PIECE)
        // If the service ITSELF has ingredients (not just variants)
        let allServiceIngredients: any[] = [];
        if (serviceIds.length > 0) {
            const svcIngredientsRes = await db.prepare(`
                SELECT si.*, p.name as product_name
                FROM service_ingredients si
                LEFT JOIN products p ON si.product_id = p.id
                WHERE si.service_id IN (${serviceIds.map(() => '?').join(',')})
            `).bind(...serviceIds).all();
            allServiceIngredients = svcIngredientsRes.results;
        }

        // Re-map services to include base products
        services = services.map(s => ({
            ...s,
            products: allServiceIngredients
                .filter((si: any) => String(si.service_id) === s._id)
                .map((si: any) => ({
                    productId: String(si.product_id),
                    productName: si.product_name || 'Unknown Ingredient',
                    quantity: si.quantity || 1,
                    unitCost: 0
                }))
        }));

        // 3. Fetch Products (filtered by show_in_pos = 1)
        const productsRes = await db.prepare(`
            SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category = CAST(c.id AS TEXT)
            WHERE p.show_in_pos = 1
        `).all();

        products = productsRes.results.map((p: any) => ({
            _id: String(p.id),
            name: p.name,
            sku: p.sku,
            price: p.price || 0,
            category: p.category ? String(p.category) : undefined,
            stock: p.stock_quantity || 0,
            showInPOS: true,
            image: p.image_url || ''
        }));

        // 4. Fetch Customers
        const customersRes = await db.prepare('SELECT * FROM customers').all();

        // Fetch All Customer Vehicles
        let customerVehicles: any[] = [];
        try {
            // We use a try-catch because the table might not exist yet if migration failed manually,
            // but we assume it does based on previous tool execution.
            const vehiclesRes = await db.prepare('SELECT * FROM customer_vehicles').all();
            customerVehicles = vehiclesRes.results;
        } catch (err) {
            console.warn("Could not fetch customer_vehicles, possibly table missing", err);
        }

        customers = customersRes.results.map((c: any) => {
            const phone = c.phone || '';

            // Get vehicles for this customer
            let cars = customerVehicles
                .filter((v: any) => v.customer_id === c.id)
                .map((v: any) => ({
                    id: v.id,
                    plateNumber: v.plate_number,
                    vehicleType: v.vehicle_type,
                    color: v.vehicle_color,
                    size: v.vehicle_size,
                    makeModel: v.vehicle_type // Using type as make/model for now or if we add that column later
                }));

            // If no cars in new table, use legacy columns if present
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

            // Determine primary display info
            const primaryCar = cars.length > 0 ? cars[0] : null;
            const plateNumber = primaryCar ? primaryCar.plateNumber : (c.plate_number || '');
            const vehicleType = primaryCar ? primaryCar.vehicleType : (c.vehicle_type || '');

            // Build contact info display string
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
                plateNumber, // Main/First one for backward compat
                vehicleType,
                contactInfo,
                cars // Array of all vehicles
            };
        });

        // 5. Fetch Employees
        const employeesRes = await db.prepare('SELECT * FROM employees WHERE status = ?').bind('active').all();
        employees = employeesRes.results.map((e: any) => ({
            _id: String(e.id),
            name: e.name,
            role: e.role
        }));


        // 6. Fetch ALL Inventory (for stock tracking)
        // We select all products regardless of show_in_pos status to get comprehensive stock levels
        const inventoryRes = await db.prepare('SELECT id, stock_quantity FROM products').all();
        // Use the outer scope variable, do not redeclare
        inventoryRes.results.forEach((item: any) => {
            inventoryMap[String(item.id)] = item.stock_quantity ?? 0;
        });

    } catch (e) {
        console.error("Failed to load POS data", e);
    }

    return (
        <div className="flex flex-col flex-1 w-full overflow-hidden">
            <POSContent
                initialServices={services}
                initialProducts={products}
                initialCategories={categories}
                initialCustomers={customers}
                initialEmployees={employees}
                initialInventory={inventoryMap}
            />
        </div>
    );
}
