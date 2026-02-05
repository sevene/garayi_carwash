import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

interface SettingsPayload {
    storeName?: string;
    storeAddress?: string;
    currency?: string;
    taxRate?: number;
    enableNotifications?: boolean;
    receiptHeader?: string;
    receiptFooter?: string;
    printerName?: string;
    theme?: string;
}

export async function GET() {
    try {
        const db = await getDB();

        // Fetch settings (singleton row id=1)
        const result = await db.prepare('SELECT * FROM settings WHERE id = 1').first<any>();

        if (!result) {
            // Return default structure if no row found (though schema seed should prevent this)
            return NextResponse.json({
                name: 'Garayi Carwash',
                currency: 'PHP',
                tax_rate: 0.08,
                settings: { enableNotifications: true, theme: 'light' },
                address: { street: '' },
                receipt: { header: '', footer: '', printerName: '' }
            });
        }

        // Map flat DB columns to nested API response expected by frontend
        const response = {
            name: result.name,
            address: {
                street: result.address_street
            },
            currency: result.currency,
            tax_rate: result.tax_rate,
            settings: {
                enableNotifications: Boolean(result.enable_notifications),
                theme: result.theme
            },
            receipt: {
                header: result.receipt_header,
                footer: result.receipt_footer,
                printerName: result.printer_name
            }
        };

        return NextResponse.json(response);

    } catch (e: any) {
        console.error("Settings GET Error:", e);
        return NextResponse.json({ error: e.message || 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        console.log("Settings PUT: Request received");
        const body = await req.json() as SettingsPayload;
        console.log("Settings PUT: Body parsed", body);

        const db = await getDB();
        console.log("Settings PUT: DB Connection Acquired");

        console.log("Saving settings to DB...");

        // Map payload keys to DB columns
        const result = await db.prepare(`
            INSERT OR REPLACE INTO settings (
                id,
                name,
                address_street,
                currency,
                tax_rate,
                enable_notifications,
                theme,
                receipt_header,
                receipt_footer,
                printer_name,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(
            1, // Singleton ID
            body.storeName || 'Garayi Carwash',
            body.storeAddress || '',
            body.currency || 'PHP',
            body.taxRate !== undefined ? body.taxRate : 0.08,
            body.enableNotifications === false ? 0 : 1, // Default true
            body.theme || 'light',
            body.receiptHeader || '',
            body.receiptFooter || '',
            body.printerName || ''
        ).run();

        if (!result.success) {
            throw new Error(result.error || "Database operation failed");
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error("Settings PUT Error:", e);
        return NextResponse.json({ error: e.message || 'Failed to save settings' }, { status: 500 });
    }
}
