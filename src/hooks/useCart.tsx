'use client';

import { useState, useMemo, useContext, createContext, useEffect, useCallback } from 'react';
import { Product } from '../lib/products';
import { toast } from 'sonner';

// =========================================================================
// TYPES
// =========================================================================

export interface CartItem {
    product: Product;
    quantity: number;
    price: number;
    itemTotal: number;
    name: string;
    sku: string;
    _id: string;
}

export interface OpenTicket {
    _id: string;
    name: string;
    total: number;
    cashierId: string;
    timestamp: string;
    items: {
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        sku?: string;
        itemType?: string;
        _id?: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        crew?: { id: string; name: string }[];
    }[];
    createdAt: string;
    updatedAt: string;
    status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customer?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    crew?: any[];
}

type CartViewMode = 'TICKETS' | 'CART';

interface CartContextType {
    // State
    cartItems: CartItem[];
    viewMode: CartViewMode;
    openTickets: OpenTicket[];
    currentTicketId: string | null;
    currentTicketName: string;
    isProcessing: boolean;
    isTicketsLoading: boolean;
    checkoutError: string | null;

    // Totals
    subtotal: number;
    tax: number;
    total: number;
    taxRate: number;
    currency: string;
    formatCurrency: (amount: number) => string;

    // Actions
    addItemToCart: (product: Product) => void;
    updateItemQuantity: (productId: string, quantity: number) => void;
    removeItem: (productId: string) => void;
    clearCart: () => void;
    setCurrentTicketName: (name: string) => void;
    switchToCartView: () => void;
    switchToTicketsView: () => void;

    // API / Tickets
    fetchOpenTickets: () => Promise<void>;
    loadTicket: (ticket: OpenTicket) => void;
    checkout: (paymentMethod: string) => Promise<void>;
    saveTicket: (name: string) => Promise<void>;
    deleteTicket: (ticketId: string) => Promise<void>;
    // Customer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customers: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setCustomer: (customer: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentCustomer: any;

    // Crew - Per Item
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    employees: any[];
    itemCrew: Record<string, string[]>; // { itemId: [crewId1, crewId2] }
    toggleItemCrew: (itemId: string, employeeId: string) => void;
    getItemCrew: (itemId: string) => string[];
    getAllAssignedCrew: () => string[]; // All unique crew across items
    clearItemCrew: (itemId: string) => void;

    // Crew Sidebar State
    isCrewSidebarOpen: boolean;
    activeCrewItemId: string | null;
    openCrewSidebar: (itemId?: string) => void;
    closeCrewSidebar: () => void;
}

// =========================================================================
// HOOK IMPLEMENTATION
// =========================================================================

const CartContext = createContext<CartContextType | undefined>(undefined);

const safeFloat = (val: string | number | undefined | null): number => {
    const num = parseFloat(String(val));
    return isNaN(num) ? 0 : num;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useCartState = (initialCustomers: any[] = [], initialEmployees: any[] = []) => {
    // --- State ---
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [taxRate, setTaxRate] = useState(0);
    const [currency, setCurrency] = useState('PHP');

    // Status Flags
    const [isProcessing, setIsProcessing] = useState(false);
    const [isTicketsLoading, setIsTicketsLoading] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);

    // Ticket / View Management
    const [currentTicketId, setCurrentTicketId] = useState<string | null>(null);
    const [currentTicketName, setCurrentTicketName] = useState('New Order');
    const [viewMode, setViewMode] = useState<CartViewMode>('TICKETS');
    const [openTickets, setOpenTickets] = useState<OpenTicket[]>([]);

    // Customer Management
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    const [customers, setCustomers] = useState<any[]>(initialCustomers);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [currentCustomer, setCurrentCustomer] = useState<any | null>(null);

    // Crew Management - Per Item
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [employees] = useState<any[]>(initialEmployees);
    const [itemCrew, setItemCrew] = useState<Record<string, string[]>>({}); // { itemId: [crewId1, crewId2] }

    // Crew Sidebar State
    const [isCrewSidebarOpen, setIsCrewSidebarOpen] = useState(false);
    const [activeCrewItemId, setActiveCrewItemId] = useState<string | null>(null);

    // --- Fetch Settings (Tax Rate) ---
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/settings');
                if (res.ok) {
                    const data = await res.json() as { tax_rate?: number; currency?: string };
                    if (data.tax_rate !== undefined) {
                        setTaxRate(data.tax_rate);
                    }
                    if (data.currency) {
                        setCurrency(data.currency);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch settings:", error);
            }
        };
        fetchSettings();
    }, []);

    // --- Computed Totals (Memoized) ---
    const { subtotal, tax, total } = useMemo(() => {
        const sub = cartItems.reduce((sum, item) => sum + item.itemTotal, 0);
        const t = sub * taxRate;
        return {
            subtotal: sub,
            tax: t,
            total: sub + t
        };
    }, [cartItems, taxRate]);

    const formatCurrency = useCallback((amount: number) => {
        const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₱';
        return `${symbol}${amount.toFixed(2)}`;
    }, [currency]);

    // --- Actions ---

    const addItemToCart = useCallback((product: Product) => {
        const price = safeFloat(product.price);



        setViewMode('CART');

        setCartItems(prev => {
            const existing = prev.find(item => item._id === product._id);

            if (existing) {
                return prev.map(item => item._id === product._id
                    ? { ...item, quantity: item.quantity + 1, itemTotal: (item.quantity + 1) * price }
                    : item
                );
            }

            return [...prev, {
                product,
                quantity: 1,
                price,
                itemTotal: price,
                name: product.name,
                sku: product.sku,
                _id: product._id
            }];
        });
    }, [cartItems.length]);

    const updateItemQuantity = useCallback((productId: string, quantity: number) => {
        const safeQty = Math.max(1, quantity);
        setCartItems(prev => prev.map(item => {
            if (item._id === productId) {
                return { ...item, quantity: safeQty, itemTotal: safeQty * item.price };
            }
            return item;
        }));
    }, []);

    const removeItem = useCallback((productId: string) => {
        setCartItems(prev => prev.filter(item => item._id !== productId));
    }, []);

    const clearCart = useCallback(() => {
        setCartItems([]);
        setCurrentTicketId(null);
        setCurrentTicketName('New Order');
        setCurrentCustomer(null);
        setItemCrew({});
        setIsCrewSidebarOpen(false);
        setActiveCrewItemId(null);
        setCheckoutError(null);
    }, []);

    // --- View Switching ---
    const switchToCartView = useCallback(() => setViewMode('CART'), []);
    const switchToTicketsView = useCallback(() => setViewMode('TICKETS'), []);

    // --- Per-Item Crew Functions ---
    const toggleItemCrew = useCallback((itemId: string, employeeId: string) => {
        setItemCrew(prev => {
            const current = prev[itemId] || [];
            if (current.includes(employeeId)) {
                const updated = current.filter(id => id !== employeeId);
                if (updated.length === 0) {
                    const { [itemId]: _, ...rest } = prev;
                    return rest;
                }
                return { ...prev, [itemId]: updated };
            } else {
                return { ...prev, [itemId]: [...current, employeeId] };
            }
        });
    }, []);

    const getItemCrew = useCallback((itemId: string): string[] => {
        return itemCrew[itemId] || [];
    }, [itemCrew]);

    const getAllAssignedCrew = useCallback((): string[] => {
        const allCrew = Object.values(itemCrew).flat();
        return [...new Set(allCrew)]; // Unique crew IDs
    }, [itemCrew]);

    const clearItemCrew = useCallback((itemId: string) => {
        setItemCrew(prev => {
            const { [itemId]: _, ...rest } = prev;
            return rest;
        });
    }, []);

    // --- Crew Sidebar Control ---
    const openCrewSidebar = useCallback((itemId?: string) => {
        setIsCrewSidebarOpen(true);
        setActiveCrewItemId(itemId || null);
    }, []);

    const closeCrewSidebar = useCallback(() => {
        setIsCrewSidebarOpen(false);
        setActiveCrewItemId(null);
    }, []);

    // --- API Helpers ---

    const fetchOpenTickets = useCallback(async () => {
        setIsTicketsLoading(true);
        try {
            let tickets: OpenTicket[] = [];

            // 1. Try Online Fetch
            if (navigator.onLine) {
                try {
                    const res = await fetch('/api/tickets', { cache: 'no-store' });
                    if (res.ok) {
                        tickets = await res.json();
                    }
                } catch (e) {
                    console.warn("Fetch tickets failed", e);
                }
            }

            // 2. Merge with Offline Tickets (db.orders with status='pending')
            if (typeof window !== 'undefined') {
                const { db } = await import('@/lib/db-client');
                const localOrders = await db.orders.where('status').equals('pending').toArray();

                const localTickets = localOrders.map(o => ({
                    _id: o.tempId,
                    name: o.payload.name || 'Offline Ticket',
                    total: o.total,
                    cashierId: o.payload.cashierId || 'POS-Offline',
                    timestamp: new Date(o.createdAt).toISOString(),
                    items: o.items.map((i: any) => ({
                        ...i,
                        // Ensure items have necessary display fields
                        productName: i.productName || 'Item'
                    })),
                    createdAt: new Date(o.createdAt).toISOString(),
                    updatedAt: new Date(o.createdAt).toISOString(),
                    status: 'PENDING' as const,
                    customer: o.customerId,
                    crew: o.payload.crew
                }));

                // Basic protection against duplicates if server has synced but local hasn't updated yet (rare with proper sync)
                const existingIds = new Set(tickets.map(t => t._id));
                const uniqueLocal = localTickets.filter(t => !existingIds.has(t._id));

                tickets = [...tickets, ...uniqueLocal];
            }

            setOpenTickets(tickets);
        } catch (err) {
            console.error("Error in fetchOpenTickets", err);
        } finally {
            setIsTicketsLoading(false);
        }
    }, []);

    // Load tickets on mount
    useEffect(() => {
        fetchOpenTickets();
    }, [fetchOpenTickets]);

    const loadTicket = useCallback((ticket: OpenTicket) => {
        const loadedCrew: Record<string, string[]> = {};

        const loadedItems: CartItem[] = ticket.items.map(item => {
            const displayName = item.productName || `Item ${item.productId.slice(0, 4)}`;

            // Use the specific line-item ID from the DB if available, otherwise fallback to product ID
            // This ensures we map crew to the specific line item, not the generic product
            const uniqueItemId = item._id || item.productId;

            // Populate crew
            if (item.crew && Array.isArray(item.crew)) {
                loadedCrew[uniqueItemId] = item.crew.map((c: any) => c.id);
            }

            const sku = item.sku || (item.itemType === 'service' ? 'SRV' : 'TICKET');

            return {
                product: {
                    _id: item.productId,
                    name: displayName,
                    sku: sku,
                    price: item.unitPrice,
                    cost: 0,
                    volume: 0,
                    showInPOS: true
                },
                quantity: item.quantity,
                price: item.unitPrice,
                itemTotal: item.unitPrice * item.quantity,
                _id: uniqueItemId,
                name: displayName,
                sku: sku
            };
        });

        setCartItems(loadedItems);
        setItemCrew(loadedCrew);
        setCurrentTicketName(ticket.name);
        setCurrentTicketId(ticket._id);

        // Find and set customer if exists
        if (ticket.customer) {
            if (typeof ticket.customer === 'object' && ticket.customer._id) {
                // Populated customer object
                setCurrentCustomer(ticket.customer);
            } else if (typeof ticket.customer === 'string') {
                // ID Reference (Fallback)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const found = customers.find((c: any) => c._id === ticket.customer);
                setCurrentCustomer(found || null);
            } else {
                setCurrentCustomer(null);
            }
        } else {
            setCurrentCustomer(null);
        }

        // Set Crew
        // setItemCrew({}); // Removed clear, we set it above now
        setIsCrewSidebarOpen(false);
        setActiveCrewItemId(null);

        setViewMode('CART');
    }, [customers]);

    const buildPayload = useCallback((status: 'PENDING' | 'COMPLETED', nameOverride?: string, paymentMethod?: string) => ({
        status,
        items: cartItems.map(i => ({
            productId: i.product._id,
            productName: i.name,
            quantity: i.quantity,
            unitPrice: i.price,
            crew: itemCrew[i._id] || []
        })),
        subtotal,
        tax,
        taxRate, // Include tax rate for historical accuracy
        total,
        cashierId: 'POS-T1',
        paymentMethod: paymentMethod || 'Cash',
        timestamp: new Date().toISOString(),
        name: nameOverride || currentTicketName,
        customer: currentCustomer?._id,
        crew: getAllAssignedCrew()
    }), [cartItems, subtotal, tax, taxRate, total, currentTicketName, currentCustomer, getAllAssignedCrew, itemCrew]);

    const saveTicket = useCallback(async (nameToSave: string) => {
        if (cartItems.length === 0 || isProcessing) return;

        setIsProcessing(true);
        setCheckoutError(null);

        const isNew = !currentTicketId;
        const payload = buildPayload('PENDING', nameToSave);

        try {
            let onlineSuccess = false;

            // 1. Try Online
            if (navigator.onLine) {
                try {
                    const method = isNew ? 'POST' : 'PUT';
                    const url = isNew ? '/api/tickets' : `/api/tickets/${currentTicketId}`;

                    const res = await fetch(url, {
                        method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (res.ok) {
                        const data = await res.json() as { _id: string; name: string };
                        setCurrentTicketId(data._id);
                        setCurrentTicketName(data.name);
                        toast.success(`Ticket ${isNew ? 'Created' : 'Updated'}`);
                        onlineSuccess = true;
                    }
                } catch (error) {
                    console.warn("Online save failed, using offline fallback", error);
                }
            }

            // 2. Offline Fallback
            if (!onlineSuccess) {
                const { db } = await import('@/lib/db-client');
                const tempId = isNew ? `temp_${self.crypto.randomUUID()}` : currentTicketId!;

                if (isNew) {
                    await db.orders.add({
                        tempId,
                        items: payload.items,
                        total: payload.total,
                        customerId: payload.customer,
                        status: 'pending',
                        createdAt: Date.now(),
                        payload: { ...payload, name: nameToSave }
                    });
                    toast.info("Offline: Ticket Saved Locally");
                } else {
                    // Check if updating a local ticket or server ticket
                    const existingLocal = await db.orders.where('tempId').equals(tempId).first();

                    if (existingLocal) {
                        // Update local record
                        await db.orders.update(existingLocal.id!, {
                            items: payload.items,
                            total: payload.total,
                            customerId: payload.customer,
                            payload: { ...payload, name: nameToSave }
                        });
                        toast.info("Offline: Local Ticket Updated");
                    } else {
                        // Server ticket -> Queue Mutation
                        await db.mutations.add({
                            type: 'update',
                            collection: 'tickets',
                            payload: { ...payload, id: currentTicketId },
                            status: 'pending',
                            createdAt: Date.now()
                        });
                        toast.info("Offline: Update Queued for Sync");
                    }
                }
            }

            await fetchOpenTickets();
            switchToTicketsView();
            clearCart();

        } catch (error: unknown) {
            let message = "Error saving ticket";
            if (error instanceof Error) message = error.message;
            setCheckoutError(message);
            toast.error(message);
        } finally {
            setIsProcessing(false);
        }
    }, [cartItems.length, isProcessing, currentTicketId, buildPayload, fetchOpenTickets, switchToTicketsView, clearCart]);

    const deleteTicket = useCallback(async (ticketId: string) => {
        setIsProcessing(true);
        try {
            const res = await fetch(`/api/tickets/${ticketId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Failed to delete ticket");

            // If we deleted the currently open ticket, clear the cart
            if (currentTicketId === ticketId) {
                clearCart();
            }

            await fetchOpenTickets();
            toast.success("Ticket deleted");
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete ticket");
        } finally {
            setIsProcessing(false);
        }
    }, [currentTicketId, clearCart, fetchOpenTickets]);

    const checkout = useCallback(async (paymentMethod: string) => {
        if (cartItems.length === 0 || isProcessing) return;

        setIsProcessing(true);
        setCheckoutError(null);

        try {
            const isNew = !currentTicketId;
            // Payload
            const payload = buildPayload('COMPLETED', undefined, paymentMethod);

            // 1. Try Online Checkout
            if (navigator.onLine) {
                try {
                    const method = isNew ? 'POST' : 'PUT';
                    const url = isNew ? '/api/tickets' : `/api/tickets/${currentTicketId}`;
                    const res = await fetch(url, {
                        method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (!res.ok) throw new Error("Checkout failed");

                    toast.success(`Checkout Complete (${paymentMethod}): ${formatCurrency(total)}`);
                    // Clear state
                    setCurrentTicketId(null);
                    setCurrentTicketName('New Order');
                    clearCart();
                    await fetchOpenTickets();
                    switchToTicketsView();
                    return; // Success!

                } catch (apiError) {
                    console.warn("Online checkout failed, falling back to offline", apiError);
                    // Fallthrough to offline handling
                }
            }

            // 2. Offline Checkout
            const { db } = await import('@/lib/db-client'); // Dynamic import to be safe

            await db.orders.add({
                tempId: self.crypto.randomUUID(),
                items: payload.items,
                total: payload.total,
                customerId: payload.customer,
                status: 'pending',
                createdAt: Date.now(),
                payload: payload
            });

            toast.warning(`Offline Mode: Order Saved Locally! (${formatCurrency(total)})`);

            setCurrentTicketId(null);
            setCurrentTicketName('New Order');
            clearCart();
            switchToTicketsView();

        } catch (error: unknown) {
            let message = "Checkout Error";
            if (error instanceof Error) message = error.message;
            setCheckoutError(message);
            toast.error(message);
        } finally {
            setIsProcessing(false);
        }
    }, [cartItems.length, isProcessing, currentTicketId, buildPayload, total, clearCart, fetchOpenTickets, switchToTicketsView, formatCurrency]);


    // --- Final Context Value (Memoized) ---
    const contextValue = useMemo<CartContextType>(() => ({
        cartItems,
        viewMode,
        openTickets,
        currentTicketId,
        currentTicketName,
        isProcessing,
        isTicketsLoading,
        checkoutError,
        subtotal,
        tax,
        total,
        taxRate,
        currency,
        formatCurrency,
        addItemToCart,
        updateItemQuantity,
        removeItem,
        clearCart,
        setCurrentTicketName,
        switchToCartView,
        switchToTicketsView,
        fetchOpenTickets,
        loadTicket,
        checkout,
        saveTicket,
        deleteTicket,
        customers,
        setCustomer: setCurrentCustomer,
        currentCustomer,
        employees,
        itemCrew,
        toggleItemCrew,
        getItemCrew,
        getAllAssignedCrew,
        clearItemCrew,
        isCrewSidebarOpen,
        activeCrewItemId,
        openCrewSidebar,
        closeCrewSidebar
    }), [
        cartItems, viewMode, openTickets, currentTicketId, currentTicketName,
        isProcessing, isTicketsLoading, checkoutError, subtotal, tax, total, taxRate, currency, formatCurrency,
        addItemToCart, updateItemQuantity, removeItem, clearCart, setCurrentTicketName,
        switchToCartView, switchToTicketsView,
        fetchOpenTickets, loadTicket, checkout, saveTicket, deleteTicket,
        customers, currentCustomer, employees, itemCrew, toggleItemCrew, getItemCrew, getAllAssignedCrew, clearItemCrew,
        isCrewSidebarOpen, activeCrewItemId, openCrewSidebar, closeCrewSidebar
    ]);

    return contextValue;
};

export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}

export function CartProvider({ children, initialCustomers, initialEmployees }: { children: React.ReactNode, initialCustomers: any[], initialEmployees: any[] }) {
    const cart = useCartState(initialCustomers, initialEmployees);
    return <CartContext.Provider value={cart}>{children}</CartContext.Provider>;
}