'use client';

import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import {
    CurrencyDollarIcon,
    UserGroupIcon,
    ChartBarIcon,
    BanknotesIcon,
    UsersIcon,
    ArrowTrendingDownIcon,
    ArrowTrendingUpIcon,
    ShoppingBagIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';

import { useSettings } from '@/hooks/useSettings';
import RevenueAreaChart from '@/components/ui/RevenueAreaChart';
import { format, subDays, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

// --- Interfaces ---

interface TicketItem {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    // Snapshot Fields
    unitCost?: number;
    commission?: number;
}

interface Ticket {
    _id: string;
    name: string;
    status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
    items: TicketItem[];
    subtotal?: number; // Stored subtotal at time of order
    taxRate?: number; // Stored tax rate at time of order
    taxAmount?: number; // Stored tax amount at time of order
    total: number;
    createdAt: string;
    // Financial Snapshots
    totalCost?: number;
    totalProfit?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    crew?: any[]; // Array of crew IDs or Objects
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
    variants?: any[];
}

interface Product {
    _id: string;
    name: string;
    cost: number;
}

interface Expense {
    _id: string;
    amount: number;
    date: string;
    category: string;
}


// --- Dashboard Component ---

export default function OverviewPage() {
    const { formatCurrency } = useSettings();

    // --- State ---
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('week');

    // --- Fetch Data ---
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [ticketsRes, employeesRes, servicesRes, productsRes, expensesRes] = await Promise.all([
                    fetch('/api/tickets?all=true'),
                    fetch('/api/employees'),
                    fetch('/api/services'),
                    fetch('/api/products?all=true'),
                    fetch('/api/expenses')
                ]);

                const ticketsData = ticketsRes.ok ? await ticketsRes.json() : [];
                const employeesData = employeesRes.ok ? await employeesRes.json() : [];
                const servicesData = servicesRes.ok ? await servicesRes.json() : [];
                const productsData = productsRes.ok ? await productsRes.json() : [];
                const expensesData = expensesRes.ok ? await expensesRes.json() : [];

                setTickets(Array.isArray(ticketsData) ? ticketsData : []);
                setEmployees(Array.isArray(employeesData) ? employeesData : []);
                setServices(Array.isArray(servicesData) ? servicesData : []);
                setProducts(Array.isArray(productsData) ? productsData : []);
                setExpenses(Array.isArray(expensesData) ? expensesData : []);

            } catch (error) {
                console.error("Reports Fetch Error:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        setIsMounted(true);
    }, []);


    // --- Calculations ---
    const dashboardData = useMemo(() => {
        const now = new Date();
        const startOfToday = startOfDay(now);
        const endOfToday = endOfDay(now);

        // Define Intervals
        let currentInterval: { start: Date, end: Date } | null = null;
        let previousInterval: { start: Date, end: Date } | null = null;

        if (dateRange === 'today') {
            currentInterval = { start: startOfToday, end: endOfToday };
            previousInterval = { start: subDays(startOfToday, 1), end: subDays(endOfToday, 1) };
        } else if (dateRange === 'week') {
            currentInterval = { start: subDays(now, 7), end: endOfToday };
            previousInterval = { start: subDays(now, 14), end: subDays(endOfToday, 7) };
        } else if (dateRange === 'month') {
            currentInterval = { start: subDays(now, 30), end: endOfToday };
            previousInterval = { start: subDays(now, 60), end: subDays(endOfToday, 30) };
        } else if (dateRange === 'year') {
            currentInterval = { start: subDays(now, 365), end: endOfToday };
            previousInterval = { start: subDays(now, 730), end: subDays(endOfToday, 365) };
        }

        // 1. Filter Tickets by Date (Current Period)
        const filteredTickets = tickets.filter(t => {
            if (t.status !== 'COMPLETED') return false;
            if (!currentInterval) return true; // 'all'
            return isWithinInterval(parseISO(t.createdAt), currentInterval);
        });

        // 1.1 Calculate Previous Period Revenue
        let previousRevenue = 0;
        if (previousInterval) {
            const previousTickets = tickets.filter(t => {
                if (t.status !== 'COMPLETED') return false;
                return isWithinInterval(parseISO(t.createdAt), previousInterval!);
            });

            previousTickets.forEach(ticket => {
                let ticketTotal = Number(ticket.total) || 0;
                if (ticketTotal === 0 && ticket.items && ticket.items.length > 0) {
                    ticketTotal = ticket.items.reduce((sum, item) => sum + (Number(item.unitPrice || 0) * Number(item.quantity || 0)), 0);
                }
                previousRevenue += ticketTotal;
            });
        }

        // 2. Metrics
        let totalRevenue = 0;
        let totalCost = 0;
        let totalLaborCost = 0; // Total Commission

        // Stats Maps
        const crewStats: Record<string, {
            name: string,
            tickets: number,
            sales: number,
            commission: number
        }> = {};

        const itemStats: Record<string, {
            name: string,
            qty: number,
            revenue: number,
            profit: number,
            type: 'Service' | 'Product'
        }> = {};

        // Chart Data Map (Key: yyyy-MM-dd)
        const chartDataMap: Record<string, number> = {};

        // Initialize Crew Stats
        employees.forEach(e => {
            crewStats[e._id] = { name: e.name, tickets: 0, sales: 0, commission: 0 };
        });

        filteredTickets.forEach(ticket => {
            let ticketTotal = Number(ticket.total) || 0;

            // Fallback: If total is 0/missing, calculate from items (Legacy Data Fix)
            if (ticketTotal === 0 && ticket.items && ticket.items.length > 0) {
                ticketTotal = ticket.items.reduce((sum, item) => sum + (Number(item.unitPrice || 0) * Number(item.quantity || 0)), 0);
            }

            totalRevenue += ticketTotal;

            // Chart Data Accumulation
            const dateKey = format(parseISO(ticket.createdAt), 'yyyy-MM-dd');
            chartDataMap[dateKey] = (chartDataMap[dateKey] || 0) + ticketTotal;

            // (Removed: top-level totalCost reading. We calculate from items to allow fallback)

            const crewList = Array.isArray(ticket.crew) ? ticket.crew : [];
            const crewCount = crewList.length;
            const salesShare = crewCount > 0 ? ticketTotal / crewCount : 0;

            // Update Crew Ticket Count & Sales Share
            crewList.forEach((c: any) => {
                const cId = (typeof c === 'object' && c._id) ? c._id : (typeof c === 'string' ? c : null);
                if (!cId) return;

                // Dynamic Init if missing
                if (!crewStats[cId]) {
                    const cName = (typeof c === 'object' && c.name) ? c.name : 'Unknown Crew';
                    crewStats[cId] = { name: cName, tickets: 0, sales: 0, commission: 0 };
                }

                crewStats[cId].tickets += 1;
                crewStats[cId].sales += salesShare;
            });

            // Process Items for Commission and Item Stats
            ticket.items.forEach(item => {
                const itemQty = Number(item.quantity) || 0;
                const itemPrice = Number(item.unitPrice) || 0;

                // Use Snapshot Data OR Fallback to Master Data
                let itemUnitCost = Number(item.unitCost) || 0;
                let itemCommission = Number(item.commission) || 0;

                // FALLBACK for Legacy Data (Missing Snapshots)
                if (itemUnitCost === 0 && itemCommission === 0) {
                    // Try Service Lookup (Handle "Service Name - Variant" format)
                    const service = services.find(s =>
                        s._id === item.productId ||
                        s.name === item.productName ||
                        item.productName.startsWith(s.name)
                    );

                    if (service) {
                        const price = Number(item.unitPrice) || 0;
                        if (service.laborCostType === 'percentage') {
                            itemCommission = (price * (Number(service.laborCost) || 0)) / 100;
                        } else {
                            itemCommission = Number(service.laborCost) || 0;
                        }
                    } else {
                        // Try Product Lookup
                        const product = products.find(p => p._id === item.productId || p.name === item.productName);
                        if (product) {
                            itemUnitCost = Number(product.cost) || 0;
                        }
                    }
                }

                const itemTotalCost = (itemUnitCost + itemCommission) * itemQty;
                totalCost += itemTotalCost;

                // Accumulate Global Labor
                totalLaborCost += itemCommission * itemQty;

                // Update Item Stats
                const key = item.productId || item.productName;
                if (!itemStats[key]) {
                    // Try to guess type based on commission logic or fallback
                    const isService = services.some(s => s._id === item.productId) || itemCommission > 0;
                    itemStats[key] = {
                        name: item.productName,
                        qty: 0,
                        revenue: 0,
                        profit: 0,
                        type: isService ? 'Service' : 'Product'
                    };
                }
                itemStats[key].qty += itemQty;
                itemStats[key].revenue += itemPrice * itemQty;
                itemStats[key].profit += (itemPrice * itemQty) - itemTotalCost;

                // Assign Commission to Crew
                if (crewCount > 0 && itemCommission > 0) {
                    const commissionPerCrew = (itemCommission * itemQty) / crewCount;
                    crewList.forEach((c: any) => {
                        const cId = (typeof c === 'object' && c._id) ? c._id : (typeof c === 'string' ? c : null);
                        if (cId && crewStats[cId]) {
                            crewStats[cId].commission += commissionPerCrew;
                        }
                    });
                }
            });
        });

        // Filter Expenses
        const filteredExpenses = expenses.filter(e => {
            const eDate = parseISO(e.date);
            if (!currentInterval) return true;
            return isWithinInterval(eDate, currentInterval);
        });

        const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const grossProfit = totalRevenue - totalCost;
        const netProfit = totalRevenue - totalCost - totalExpenses;
        const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        // Calculate Revenue Trend
        let revenueTrend = 0;
        if (previousRevenue > 0) {
            revenueTrend = ((totalRevenue - previousRevenue) / previousRevenue) * 100;
        } else if (totalRevenue > 0) {
            revenueTrend = 100;
        }

        const uniqueCustomerIds = new Set();
        filteredTickets.forEach(t => {
            // Handle populated object, fallback to name, or simple string ID
            let cId = null;
            if (typeof t.customer === 'object' && t.customer) {
                cId = t.customer._id || t.customer.name;
            } else {
                cId = t.customer;
            }

            if (cId) uniqueCustomerIds.add(cId);
        });

        // 3. Prepare Chart Data (Revenue by Date)
        const chartData = Object.keys(chartDataMap).sort().map(key => ({
            name: format(parseISO(key), 'MMM dd'),
            revenue: chartDataMap[key]
        }));

        return {
            totalRevenue,
            revenueTrend,
            totalOrders: filteredTickets.length,
            grossProfit,
            grossMargin,
            netProfit,
            totalLaborCost,
            totalExpenses,
            totalCustomers: uniqueCustomerIds.size,
            crewStats: Object.values(crewStats).filter(c => c.tickets > 0 || c.sales > 0), // Only active crew
            itemStats: Object.values(itemStats).sort((a, b) => b.revenue - a.revenue),
            chartData
        };

    }, [tickets, employees, services, products, expenses, dateRange]);

    const getTrendLabel = () => {
        if (dateRange === 'all') return 'total';
        if (dateRange === 'today') return 'vs yesterday';
        if (dateRange === 'week') return 'vs last week';
        if (dateRange === 'month') return 'vs last month';
        if (dateRange === 'year') return 'vs last year';
        return '';
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden text-gray-800">

            <div className="relative z-10 space-y-8 animate-in fade-in duration-1000 lg:px-6 lg:pb-6">

                {/* Header & Filters */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-6 pb-2">
                    <PageHeader
                        title="Overview"
                        description="Detailed breakdown of sales, profits, and expenses."
                    />
                    {/* Simple Toggle */}
                    <div className="bg-white p-1.5 rounded-2xl shadow-sm flex text-sm font-bold gap-1">
                        {(['today', 'week', 'month', 'year', 'all'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={`px-6 py-2.5 rounded-xl transition-all duration-300 ${dateRange === range
                                    ? 'bg-blue-800 text-white shadow-md'
                                    : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                {range.charAt(0).toUpperCase() + range.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <SummaryCard
                        title="Net Revenue"
                        value={formatCurrency(dashboardData.totalRevenue)}
                        icon={CurrencyDollarIcon}
                        desc={getTrendLabel()}
                        trend={dateRange !== 'all' ? dashboardData.revenueTrend : undefined}
                        variant="primary"
                        helperText="Total revenue from all completed orders within the selected period."
                    />

                    {/* Gross Profit */}
                    <SummaryCard
                        title="Gross Profit"
                        value={formatCurrency(dashboardData.grossProfit)}
                        icon={ChartBarIcon}
                        desc={`${dashboardData.grossMargin.toFixed(1)}% margin`}
                        helperText="Net Revenue minus total cost of items (COGS)."
                    />

                    <SummaryCard
                        title="Total Commissions"
                        value={formatCurrency(dashboardData.totalLaborCost)}
                        icon={UserGroupIcon}
                        desc="Crew payouts"
                        helperText="Accumulated commissions for services and products assigned to crew members."
                    />

                    <SummaryCard
                        title="Total Orders"
                        value={dashboardData.totalOrders.toString()}
                        icon={ShoppingBagIcon}
                        desc={`${dashboardData.totalCustomers} ${dashboardData.totalCustomers === 1 ? 'Customer' : 'Customers'}`}
                        helperText="Total number of completed orders and the count of unique customers who placed them."
                    />
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Revenue Chart - Simple Container */}
                    <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-md relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-xl font-bold text-gray-900">Revenue Trend</h3>
                                <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                                    <span className="w-2 h-2 rounded-full bg-lime-500"></span>
                                    <span>Sales Volume</span>
                                </div>
                            </div>
                            <div className="h-96 w-full">
                                <RevenueAreaChart data={dashboardData.chartData} />
                            </div>
                        </div>
                    </div>

                    {/* Top Performance Leaderboard - Simple Container */}
                    <div className="bg-white p-8 rounded-3xl shadow-md flex flex-col relative overflow-hidden">
                        <div className="relative z-10 flex flex-col h-full">
                            <h3 className="text-xl font-bold text-gray-900 mb-8">Top Performance</h3>
                            <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                                {dashboardData.itemStats.slice(0, 6).map((item, idx) => {
                                    const margin = item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0;
                                    return (
                                        <div key={idx} className="group">
                                            <div className="flex justify-between items-end mb-2">
                                                <p className="font-bold text-gray-800 text-sm truncate">{item.name}</p>
                                                <p className="font-bold text-gray-900 text-sm">{formatCurrency(item.revenue)}</p>
                                            </div>
                                            <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                                                <div
                                                    className="absolute top-0 left-0 h-full bg-lime-500 rounded-full transition-all duration-1000"
                                                    style={{ width: `${Math.max(5, Math.min(100, margin))}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between mt-1 text-xs text-gray-500 font-medium">
                                                <span>{item.qty} units sold</span>
                                                <span className="text-lime-700 font-bold">{margin.toFixed(0)}% margin</span>
                                            </div>
                                        </div>
                                    )
                                })}
                                {dashboardData.itemStats.length === 0 && <p className="text-center text-gray-500 mt-10">No visible performance data</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tables Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Crew Table - Simple Container */}
                    <div className="bg-white rounded-3xl shadow-md overflow-hidden relative">
                        <div className="relative z-10">
                            <div className="p-8 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                                <h3 className="text-xl font-bold text-gray-900">Crew Performance</h3>
                                <button className="text-xs font-bold text-lime-700 uppercase tracking-widest hover:text-lime-800 hover:underline decoration-2 underline-offset-4">View All</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="text-gray-500 font-bold text-xs uppercase tracking-wider border-b border-gray-200">
                                        <tr>
                                            <th className="px-8 py-6">Member</th>
                                            <th className="px-8 py-6 text-center">Tickets</th>
                                            <th className="px-8 py-6 text-right">Sales</th>
                                            <th className="px-8 py-6 text-right text-lime-700">Comm.</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {dashboardData.crewStats.map((crew, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                                                <td className="px-8 py-5 font-bold text-gray-800">{crew.name}</td>
                                                <td className="px-8 py-5 text-center text-gray-600 font-medium">{crew.tickets}</td>
                                                <td className="px-8 py-5 text-right text-gray-600 font-medium">{formatCurrency(crew.sales)}</td>
                                                <td className="px-8 py-5 text-right font-bold text-gray-900 group-hover:text-lime-700 transition-colors">
                                                    {formatCurrency(crew.commission)}
                                                </td>
                                            </tr>
                                        ))}
                                        {dashboardData.crewStats.length === 0 && (
                                            <tr><td colSpan={4} className="px-8 py-10 text-center text-gray-500">No active crew</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Breakdown Table - Simple Container */}
                    <div className="bg-white rounded-3xl shadow-md overflow-hidden relative">
                        <div className="relative z-10">
                            <div className="p-8 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                                <h3 className="text-xl font-bold text-gray-900">Breakdown</h3>
                                <button className="text-xs font-bold text-lime-700 uppercase tracking-widest hover:text-lime-800 hover:underline decoration-2 underline-offset-4">Export</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="text-gray-500 font-bold text-xs uppercase tracking-wider border-b border-gray-200">
                                        <tr>
                                            <th className="px-8 py-6">Item</th>
                                            <th className="px-8 py-6 text-center">Qty</th>
                                            <th className="px-8 py-6 text-right">Rev</th>
                                            <th className="px-8 py-6 text-right">Profit</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {dashboardData.itemStats.slice(0, 8).map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-8 py-5 font-bold text-gray-800">
                                                    {item.name}
                                                    <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">{item.type}</span>
                                                </td>
                                                <td className="px-8 py-5 text-center text-gray-600 font-medium">{item.qty}</td>
                                                <td className="px-8 py-5 text-right text-gray-600 font-medium">{formatCurrency(item.revenue)}</td>
                                                <td className="px-8 py-5 text-right font-bold text-lime-700">
                                                    {formatCurrency(item.profit)}
                                                </td>
                                            </tr>
                                        ))}
                                        {dashboardData.itemStats.length === 0 && (
                                            <tr><td colSpan={4} className="px-8 py-10 text-center text-gray-500">No data available</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

// --- Subcomponents ---

interface SummaryCardProps {
    title: string;
    value: string;
    icon: any;
    desc: string;
    variant?: 'default' | 'primary';
    trend?: number;
    helperText?: string;
}

function SummaryCard({ title, value, icon: Icon, desc, variant = 'default', trend, helperText }: SummaryCardProps) {
    const isPrimary = variant === 'primary';

    // Styles
    const containerClasses = isPrimary
        ? "bg-gradient-to-br from-lime-500 to-green-600 text-white border border-lime-500 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02]"
        : "bg-neutral-50 border-2 border-white shadow-sm hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] text-gray-900";

    const iconBoxClasses = isPrimary
        ? "bg-white/20 text-white border-white/10"
        : "bg-gray-50 text-gray-500 border-gray-100 group-hover:text-lime-600";

    const titleClasses = isPrimary
        ? "text-lime-100"
        : "text-gray-500";

    const valueClasses = isPrimary
        ? "text-white drop-shadow-sm"
        : "text-gray-900";

    const descClasses = isPrimary
        ? "text-lime-100"
        : "text-gray-500";

    const TrendIcon = trend !== undefined ? (trend >= 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon) : null;
    const trendColor = trend !== undefined
        ? (trend >= 0 ? (isPrimary ? 'text-white' : 'text-lime-600') : (isPrimary ? 'text-white' : 'text-red-500'))
        : '';

    return (
        <div className={`p-4 rounded-3xl transition-all duration-300 group relative overflow-visible ${containerClasses}`}>
            {isPrimary && (
                <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
            )}

            {/* Helper Tooltip */}
            {helperText && (
                <div className="absolute top-4 right-4 z-20 flex flex-col items-end group/tooltip">
                    <InformationCircleIcon className={`w-5 h-5 transition-colors duration-300 cursor-help ${isPrimary ? 'text-lime-200 group-hover/tooltip:text-white' : 'text-gray-300 group-hover/tooltip:text-gray-500'}`} />

                    {/* Tooltip Content */}
                    <div className="absolute top-6 right-0 w-48 opacity-0 group-hover/tooltip:opacity-100 transition-all duration-300 ease-in-out delay-500 translate-y-2 group-hover/tooltip:translate-y-0 pointer-events-none z-50">
                        <div className="bg-gray-900/90 backdrop-blur-sm text-white text-xs p-3 rounded-xl shadow-xl border border-white/10 leading-relaxed mt-2 relative">
                            {/* Arrow Pointer */}
                            <div className="absolute -top-1 right-1 w-2 h-2 bg-gray-900/90 rotate-45 border-l border-t border-white/10"></div>
                            {helperText}
                        </div>
                    </div>
                </div>
            )}

            {/* Background Trend Icon */}
            {TrendIcon && (
                <div className={`absolute -top-16 -right-3 pointer-events-none opacity-15 group-hover:scale-110 transition-all duration-500 ease-in-out ${isPrimary ? 'text-white' : (trend! >= 0 ? 'text-lime-500' : 'text-red-500')}`}>
                    <TrendIcon className="w-72 h-72" />
                </div>
            )}

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`p-3 rounded-2xl shadow-sm border transition-colors duration-300 ${iconBoxClasses}`}>
                            <Icon className="w-6 h-6" />
                        </div>
                        <p className={`text-xs font-bold uppercase tracking-wider ${titleClasses}`}>{title}</p>
                    </div>
                </div>
                <div>
                    <p className={`text-3xl font-bold tracking-tight ${valueClasses}`}>{value}</p>
                    <div className="flex items-center gap-2 mt-2">
                        {trend !== undefined && (
                            <div className={`flex items-center gap-1 text-sm font-bold ${trendColor}`}>
                                <span>{Math.abs(trend).toFixed(0)}%</span>
                            </div>
                        )}
                        <p className={`text-sm font-medium tracking-wide ${descClasses}`}>{desc}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

