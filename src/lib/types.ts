export interface Product {
    _id: string; // D1 uses numeric IDs usually, but we keep string for compatibility with UI
    name: string;
    sku: string;
    price: number;
    cost?: number;
    volume?: number | string;
    category?: string | Category;
    showInPOS?: boolean;
    image?: string;
    stock?: number;
}


export interface Ingredient {
    id: string | number; // Product ID
    name?: string;       // Denormalized name
    quantity: number;
    unitCost?: number;
    priceBasis?: 'cost' | 'price';
    soldBy?: 'quantity' | 'volume';
}

export interface ServiceVariant {
    id?: string | number;
    name: string;
    price: number;
    products?: Ingredient[]; // Variant specific ingredients
}

export interface CarwashService {
    _id: string; // or id
    name: string;
    description?: string;
    category?: string | Category;
    image?: string;

    // Pricing & Cost
    servicePrice: number;
    laborCost: number;
    laborCostType: 'fixed' | 'percentage';

    durationMinutes: number;

    // Complex structures
    products?: Ingredient[]; // Base ingredients
    variants?: ServiceVariant[];

    active?: boolean;
    showInPOS?: boolean;
}

export interface Category {
    _id: string;
    name: string;
}

// Helper guard
export function isCarwashService(item: Product | CarwashService): item is CarwashService {
    return 'servicePrice' in item;
}
