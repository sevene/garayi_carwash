'use client';

import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import {
    DocumentArrowDownIcon,
    PrinterIcon,
    TableCellsIcon,
    UserGroupIcon,
    ShoppingBagIcon,
    CurrencyDollarIcon,
    FunnelIcon
} from '@heroicons/react/24/outline';
import { useSettings } from '@/hooks/useSettings';
import { format, subDays, isWithinInterval, startOfDay, endOfDay, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval, isValid } from 'date-fns';

// --- Interfaces ---

interface TicketItem {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    unitCost?: number;
    commission?: number;
}

interface Ticket {
    _id: string;
    name: string;
    status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
    items: TicketItem[];
    total: number;
    createdAt: string;
    ticketDate?: string; // Some versions use this
    paymentMethod?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    crew?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customer?: any;
}

interface Employee {
    _id: string;
    name: string;
    role: string;
}

interface Service {
    _id: string;
    name: string;
    laborCost?: number;
    laborCostType?: 'fixed' | 'percentage';
}

interface Product {
    _id: string;
    name: string;
    cost: number;
}

// --- Component ---

export default function ReportsPage() {
    const { formatCurrency } = useSettings();

    // --- State ---
    const [activeTab, setActiveTab] = useState<'SALES' | 'CREW' | 'ITEMS'>('SALES');
    const [dateRange, setDateRange] = useState({
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    });

    // Data State
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- Fetch Data ---
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetching ALL data for client-side filtering (similar to OverviewPage pattern)
                const [ticketsRes, employeesRes, servicesRes, productsRes] = await Promise.all([
                    fetch('/api/tickets?all=true'),
                    fetch('/api/employees'),
                    fetch('/api/services'),
                    fetch('/api/products?all=true')
                ]);

                if (ticketsRes.ok) setTickets(await ticketsRes.json());
                if (employeesRes.ok) setEmployees(await employeesRes.json());
                if (servicesRes.ok) setServices(await servicesRes.json());
                if (productsRes.ok) setProducts(await productsRes.json());

            } catch (error) {
                console.error("Error fetching report data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    // --- Process Data ---
    const reportData = useMemo(() => {
        const start = startOfDay(parseISO(dateRange.start));
        const end = endOfDay(parseISO(dateRange.end));
        const interval = { start, end };

        // 1. Filter Tickets
        const filteredTickets = tickets.filter(t => {
            if (t.status !== 'COMPLETED') return false;
            const tDate = parseISO(t.createdAt);
            return isWithinInterval(tDate, interval);
        });

        // 2. Aggregations

        // A. Sales Report (Daily Breakdown)
        const salesStats: Record<string, { date: string, revenue: number, count: number, customers: Set<string> }> = {};

        // B. Crew Stats
        const crewStats: Record<string, { name: string, tickets: number, sales: number, commission: number }> = {};
        employees.forEach(e => {
            crewStats[e._id] = { name: e.name, tickets: 0, sales: 0, commission: 0 };
        });

        // C. Item Stats
        const itemStats: Record<string, { name: string, type: string, qty: number, revenue: number, cost: number, profit: number }> = {};

        filteredTickets.forEach(t => {
            const dateKey = format(parseISO(t.createdAt), 'yyyy-MM-dd');
            const total = Number(t.total) || 0;

            // Update Sales Stats
            if (!salesStats[dateKey]) {
                salesStats[dateKey] = { date: dateKey, revenue: 0, count: 0, customers: new Set() };
            }
            salesStats[dateKey].revenue += total;
            salesStats[dateKey].count += 1;
            if (t.customer) {
                const cId = typeof t.customer === 'object' ? t.customer._id : t.customer;
                if (cId) salesStats[dateKey].customers.add(cId);
            }

            // Crew Calculation
            const crewList = Array.isArray(t.crew) ? t.crew : [];
            const crewCount = crewList.length;
            const salesShare = crewCount > 0 ? total / crewCount : 0;

            crewList.forEach((c: any) => {
                const cId = (typeof c === 'object' && c._id) ? c._id : (typeof c === 'string' ? c : null);
                if (!cId) return;

                if (!crewStats[cId]) {
                    crewStats[cId] = { name: c.name || 'Unknown', tickets: 0, sales: 0, commission: 0 };
                }
                crewStats[cId].tickets += 1;
                crewStats[cId].sales += salesShare;
            });

            // Item Calculation
            t.items.forEach(item => {
                const qty = Number(item.quantity) || 0;
                const price = Number(item.unitPrice) || 0;
                const rev = qty * price;

                // Costs
                let unitCost = Number(item.unitCost) || 0;
                let commission = Number(item.commission) || 0;

                // Fallback Logic (same as OverviewPage)
                if (unitCost === 0 && commission === 0) {
                    const service = services.find(s => s._id === item.productId || s.name === item.productName || item.productName.startsWith(s.name));
                    if (service) {
                        if (service.laborCostType === 'percentage') {
                            commission = (price * (Number(service.laborCost) || 0)) / 100;
                        } else {
                            commission = Number(service.laborCost) || 0;
                        }
                    } else {
                        const product = products.find(p => p._id === item.productId || p.name === item.productName);
                        if (product) unitCost = Number(product.cost) || 0;
                    }
                }

                const totalCost = (unitCost + commission) * qty;

                // Update Item Stats
                const key = item.productId || item.productName;
                if (!itemStats[key]) {
                    const isService = commission > 0 || services.some(s => s._id === item.productId);
                    itemStats[key] = {
                        name: item.productName,
                        type: isService ? 'Service' : 'Product',
                        qty: 0,
                        revenue: 0,
                        cost: 0,
                        profit: 0
                    };
                }
                itemStats[key].qty += qty;
                itemStats[key].revenue += rev;
                itemStats[key].cost += totalCost;
                itemStats[key].profit += (rev - totalCost);

                // Update Crew Commission
                if (crewCount > 0 && commission > 0) {
                    const commPerCrew = (commission * qty) / crewCount;
                    crewList.forEach((c: any) => {
                        const cId = (typeof c === 'object' && c._id) ? c._id : (typeof c === 'string' ? c : null);
                        if (cId && crewStats[cId]) {
                            crewStats[cId].commission += commPerCrew;
                        }
                    });
                }
            });
        });

        // Convert to Arrays
        const salesArray = Object.values(salesStats).sort((a, b) => b.date.localeCompare(a.date));
        const crewArray = Object.values(crewStats).filter(c => c.tickets > 0 || c.sales > 0).sort((a, b) => b.sales - a.sales);
        const itemArray = Object.values(itemStats).sort((a, b) => b.revenue - a.revenue);

        // Summaries
        const totalRevenue = filteredTickets.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
        const totalProfit = itemArray.reduce((sum, i) => sum + i.profit, 0);

        return {
            filteredTickets,
            salesArray,
            crewArray,
            itemArray,
            totalRevenue,
            totalProfit
        };

    }, [tickets, employees, services, products, dateRange]);


    // --- Quick Date Handlers ---
    const setQuickDate = (type: 'today' | 'week' | 'month' | 'year') => {
        const today = new Date();
        if (type === 'today') {
            const str = format(today, 'yyyy-MM-dd');
            setDateRange({ start: str, end: str });
        } else if (type === 'week') {
            setDateRange({ start: format(subDays(today, 7), 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') });
        } else if (type === 'month') {
            setDateRange({ start: format(startOfMonth(today), 'yyyy-MM-dd'), end: format(endOfMonth(today), 'yyyy-MM-dd') });
        } else if (type === 'year') {
            setDateRange({ start: format(startOfYear(today), 'yyyy-MM-dd'), end: format(endOfYear(today), 'yyyy-MM-dd') });
        }
    };

    return (
        <div className="relative h-full w-full overflow-hidden text-gray-800 animate-in fade-in duration-700 lg:px-6 lg:pb-6">

            {/* Header */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-8">
                <PageHeader
                    title="Reports Center"
                    description="Detailed analysis of sales, detailed staff performance, and product margins."
                />

                {/* Controls */}
                <div className="flex flex-col md:flex-row items-end gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 w-full xl:w-auto">
                    {/* Date Picker */}
                    <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl w-full md:w-auto">
                        <input
                            type="date"
                            id="start-date"
                            className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 p-2"
                            value={dateRange.start}
                            onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="date"
                            id="end-date"
                            className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 p-2"
                            value={dateRange.end}
                            onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        />
                    </div>

                    {/* Quick Filters */}
                    <div className="flex gap-1 bg-gray-50 p-1.5 rounded-xl">
                        {(['today', 'week', 'month', 'year'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setQuickDate(t)}
                                className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    {/* Print/Export */}
                    <button onClick={() => window.print()} className="p-3 text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-lime-50 rounded-xl transition-colors">
                        <PrinterIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex mb-6 overflow-x-auto pb-2 gap-2">
                <TabButton
                    active={activeTab === 'SALES'}
                    onClick={() => setActiveTab('SALES')}
                    icon={CurrencyDollarIcon}
                    label="Sales Summary"
                />
                <TabButton
                    active={activeTab === 'CREW'}
                    onClick={() => setActiveTab('CREW')}
                    icon={UserGroupIcon}
                    label="Crew Performance"
                />
                <TabButton
                    active={activeTab === 'ITEMS'}
                    onClick={() => setActiveTab('ITEMS')}
                    icon={ShoppingBagIcon}
                    label="Products & Services"
                />
            </div>

            {/* Main Content Area */}
            <div className="bg-gray-50 rounded-3xl shadow-sm border border-white overflow-hidden min-h-[500px]">

                {/* Summary Header */}
                <div className="bg-gray-50 border-b border-gray-200 p-6 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">
                            {activeTab === 'SALES' ? 'Sales Report' : activeTab === 'CREW' ? 'Staff Commission Report' : 'Item Profitability Report'}
                        </h3>
                        <p className="text-sm text-gray-500">
                            {isValid(parseISO(dateRange.start)) ? format(parseISO(dateRange.start), 'MMM dd, yyyy') : 'Invalid Date'} - {isValid(parseISO(dateRange.end)) ? format(parseISO(dateRange.end), 'MMM dd, yyyy') : 'Invalid Date'}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Revenue</p>
                        <p className="text-2xl font-black text-gray-900">{formatCurrency(reportData.totalRevenue)}</p>
                    </div>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="p-20 text-center text-gray-400">Loading Report Data...</div>
                    ) : (
                        <table className="w-full text-left text-sm whitespace-nowrap">

                            {/* --- SALES TABLE --- */}
                            {activeTab === 'SALES' && (
                                <>
                                    <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-wider border-b border-gray-100">
                                        <tr>
                                            <th className="px-8 py-5">Date</th>
                                            <th className="px-8 py-5 text-center">Orders</th>
                                            <th className="px-8 py-5 text-center">Customers</th>
                                            <th className="px-8 py-5 text-right">Avg. Ticket</th>
                                            <th className="px-8 py-5 text-right">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {reportData.salesArray.map((row) => (
                                            <tr key={row.date} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-8 py-4 font-bold text-gray-800">{format(parseISO(row.date), 'MMM dd, yyyy')}</td>
                                                <td className="px-8 py-4 text-center text-gray-600">{row.count}</td>
                                                <td className="px-8 py-4 text-center text-gray-600">{row.customers.size}</td>
                                                <td className="px-8 py-4 text-right text-gray-600">{formatCurrency(row.revenue / row.count)}</td>
                                                <td className="px-8 py-4 text-right font-bold text-lime-700">{formatCurrency(row.revenue)}</td>
                                            </tr>
                                        ))}
                                        {reportData.salesArray.length === 0 && (
                                            <tr><td colSpan={5} className="px-8 py-10 text-center text-gray-400">No sales in this period</td></tr>
                                        )}
                                    </tbody>
                                </>
                            )}

                            {/* --- CREW TABLE --- */}
                            {activeTab === 'CREW' && (
                                <>
                                    <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-wider border-b border-gray-100">
                                        <tr>
                                            <th className="px-8 py-5">Staff Member</th>
                                            <th className="px-8 py-5 text-center">Tickets Served</th>
                                            <th className="px-8 py-5 text-right">Sales Volume</th>
                                            <th className="px-8 py-5 text-right text-lime-700">Commission Earned</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {reportData.crewArray.map((row) => (
                                            <tr key={row.name} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-8 py-4 font-bold text-gray-800">{row.name}</td>
                                                <td className="px-8 py-4 text-center text-gray-600">{row.tickets}</td>
                                                <td className="px-8 py-4 text-right text-gray-600">{formatCurrency(row.sales)}</td>
                                                <td className="px-8 py-4 text-right font-bold text-lime-700 text-lg">{formatCurrency(row.commission)}</td>
                                            </tr>
                                        ))}
                                        {reportData.crewArray.length === 0 && (
                                            <tr><td colSpan={4} className="px-8 py-10 text-center text-gray-400">No active staff in this period</td></tr>
                                        )}
                                    </tbody>
                                </>
                            )}

                            {/* --- ITEMS TABLE --- */}
                            {activeTab === 'ITEMS' && (
                                <>
                                    <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-wider border-b border-gray-100">
                                        <tr>
                                            <th className="px-8 py-5">Item Name</th>
                                            <th className="px-8 py-5">Type</th>
                                            <th className="px-8 py-5 text-center">Qty Sold</th>
                                            <th className="px-8 py-5 text-right">Revenue</th>
                                            <th className="px-8 py-5 text-right">Cost (COGS + Labor)</th>
                                            <th className="px-8 py-5 text-right text-lime-700">Net Profit</th>
                                            <th className="px-8 py-5 text-right">Margin</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {reportData.itemArray.map((row, idx) => {
                                            const margin = row.revenue > 0 ? (row.profit / row.revenue) * 100 : 0;
                                            return (
                                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-8 py-4 font-bold text-gray-800">{row.name}</td>
                                                    <td className="px-8 py-4 text-xs font-bold uppercase text-gray-400">{row.type}</td>
                                                    <td className="px-8 py-4 text-center text-gray-600">{row.qty}</td>
                                                    <td className="px-8 py-4 text-right text-gray-600">{formatCurrency(row.revenue)}</td>
                                                    <td className="px-8 py-4 text-right text-red-400">{formatCurrency(row.cost)}</td>
                                                    <td className="px-8 py-4 text-right font-bold text-lime-700">{formatCurrency(row.profit)}</td>
                                                    <td className="px-8 py-4 text-right text-gray-500 text-xs font-bold">{margin.toFixed(1)}%</td>
                                                </tr>
                                            );
                                        })}
                                        {reportData.itemArray.length === 0 && (
                                            <tr><td colSpan={7} className="px-8 py-10 text-center text-gray-400">No items sold in this period</td></tr>
                                        )}
                                    </tbody>
                                </>
                            )}

                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- Subcomponents ---

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all duration-300 border
                ${active
                    ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                    : 'bg-white text-gray-500 border-white hover:bg-gray-50 hover:text-gray-900'
                }`}
        >
            <Icon className={`w-5 h-5 ${active ? 'text-lime-400' : 'text-gray-400'}`} />
            {label}
        </button>
    );
}
