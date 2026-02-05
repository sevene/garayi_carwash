// lib/services.ts
// TypeScript interfaces for Services with product recipes

export interface ServiceProduct {
    productId: string;
    quantity: number;
    productName: string;
    unitCost: number;
    priceBasis?: 'cost' | 'price';
    soldBy?: 'quantity' | 'volume';
}

export interface Service {
    _id: string;
    name: string;
    description?: string;
    category?: string | null;
    products: ServiceProduct[];
    servicePrice: number;
    laborCost: number;
    laborCostType?: 'fixed' | 'percentage';
    durationMinutes?: number;
    active: boolean;
    showInPOS?: boolean;
    createdAt?: string;
    updatedAt?: string;
    soldBy?: string;
    variants?: { name: string; price: number; products?: ServiceProduct[] }[];
}

export interface ServiceWithCosts extends Service {
    costs?: {
        materialCost: number;
        totalCost: number;
        profitMargin: number;
        profitPercentage: string;
    };
}

// Helper to calculate costs client-side
export function calculateServiceCosts(service: Service) {
    const materialCost = (service.products || []).reduce(
        (sum, p) => sum + (p.quantity * p.unitCost),
        0
    );

    let labor = service.laborCost;
    if (service.laborCostType === 'percentage') {
        labor = (service.servicePrice * service.laborCost) / 100;
    }

    const totalCost = materialCost + labor;
    const profitMargin = service.servicePrice - totalCost;
    const profitPercentage = service.servicePrice > 0
        ? ((profitMargin / service.servicePrice) * 100).toFixed(2) + '%'
        : '0%';

    return {
        materialCost,
        laborCost: labor,
        totalCost,
        profitMargin,
        profitPercentage
    };
}


