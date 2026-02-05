import Dexie, { Table } from 'dexie';

export interface OfflineOrder {
    id?: number;
    tempId: string; // UUID for local identification
    ticketNumber?: string;
    items: any[];
    total: number;
    customerId?: string;
    vehicleId?: string;
    status: 'pending' | 'synced' | 'error';
    createdAt: number;
    payload: any; // The full JSON payload we would send to the API
}

export class POSDatabase extends Dexie {
    // Master Data
    categories!: Table<any>;
    products!: Table<any>;
    services!: Table<any>;
    customers!: Table<any>;
    employees!: Table<any>;
    inventory!: Table<any>; // Map structure stored as key-value items or single object? Dexie likes arrays.
    // We can store { id: productId, stock: number }

    // Transactions
    orders!: Table<OfflineOrder>;

    constructor() {
        super('GarayiPOS_DB');
        this.version(1).stores({
            categories: '_id',
            products: '_id, category', // Indexed by id and category
            services: '_id, category',
            customers: '_id, name, phone', // searchable by name/phone
            employees: '_id',
            inventory: 'id', // productId
            orders: '++id, tempId, status, createdAt' // 'status' index for finding pending orders
        });

        // Version 2: Add mutations table for global offline CRUD
        this.version(2).stores({
            mutations: '++id, type, collection, status, createdAt' // type: 'create'|'update'|'delete', status: 'pending'
        });
    }

    mutations!: Table<{
        id?: number;
        type: 'create' | 'update' | 'delete';
        collection: 'categories' | 'services' | 'products' | 'customers' | 'employees' | 'tickets';
        payload: any;
        status: 'pending' | 'synced' | 'error';
        createdAt: number;
        tempId?: string; // For updates/deletes of locally created items
    }>;
}

export const db = new POSDatabase();
