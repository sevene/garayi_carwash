'use client';

import React, { useState, useEffect } from 'react';
import {
    CalendarIcon,
    ArrowTrendingUpIcon,
    CurrencyDollarIcon,
    UserGroupIcon,
    CheckCircleIcon,
    CreditCardIcon,
    FunnelIcon,
    ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useSettings } from '@/hooks/useSettings';
import CustomInput from '@/components/ui/CustomInput';
import CustomSelect from '@/components/ui/CustomSelect';

/* -------------------------------------------------------------------------
   Interfaces
   ------------------------------------------------------------------------- */
interface SalesData {
    tickets: any[];
    summary: {
        totalRevenue: number;
        totalTickets: number;
        avgTicketValue: number;
        paymentMethods: Record<string, number>;
        topServices: any[];
        topSpenders: any[];
    };
}

export default function SalesPage() {
    const { formatCurrency } = useSettings();

    /* -------------------------------------------------------------------------
       State
       ------------------------------------------------------------------------- */
    const [isLoading, setIsLoading] = useState(true);
    const [salesData, setSalesData] = useState<SalesData | null>(null);

    // Filter State
    const [dateRange, setDateRange] = useState({
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    });

    const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, COMPLETED, CANCELLED

    /* -------------------------------------------------------------------------
       Effects
       ------------------------------------------------------------------------- */
    useEffect(() => {
        fetchSalesData();
    }, [dateRange, filterStatus]);

    /* -------------------------------------------------------------------------
       Actions
       ------------------------------------------------------------------------- */
    const fetchSalesData = async () => {
        setIsLoading(true);

        try {
            // Build query params
            const params = new URLSearchParams({
                startDate: dateRange.start,
                endDate: dateRange.end,
                status: filterStatus !== 'ALL' ? filterStatus : ''
            });

            // We need a specific endpoint or we process '/api/tickets' with query
            // Assuming we use existing /api/tickets endpoint which might need adjustment to support range filtering fully
            // For now, let's assume we fetch all and filter client side if backend doesn't support range
            // OR ideally, we implement a specific sales endpoint.
            // Let's use the existing tickets endpoint and process it for now.
            const res = await fetch('/api/tickets?all=true'); // Fetching all effectively for now, would optimize later
            if (res.ok) {
                let tickets: any[] = await res.json();

                // CLIENT SIDE FILTERING (Temporary until backend supports sophisticated query)
                // Parse strings manually to ensure Local Time (YYYY-MM-DD input)
                const [sY, sM, sD] = dateRange.start.split('-').map(Number);
                const start = new Date(sY, sM - 1, sD, 0, 0, 0, 0).getTime();

                const [eY, eM, eD] = dateRange.end.split('-').map(Number);
                const end = new Date(eY, eM - 1, eD, 23, 59, 59, 999).getTime();

                tickets = tickets.filter((t: any) => {
                    if (!t.createdAt) return false;
                    const tDate = new Date(t.createdAt).getTime();

                    const dateMatch = tDate >= start && tDate <= end;
                    const statusMatch = filterStatus === 'ALL' ? true : t.status === filterStatus;

                    return dateMatch && statusMatch;
                });

                // Calculate Summary
                const completedTickets = tickets.filter((t: any) => t.status === 'COMPLETED');
                const totalRevenue = completedTickets.reduce((acc: number, t: any) => acc + (t.total || 0), 0);
                const totalTickets = completedTickets.length;
                const avgTicketValue = totalTickets > 0 ? totalRevenue / totalTickets : 0;

                // Payment Methods
                const paymentMethods: Record<string, number> = {};
                completedTickets.forEach((t: any) => {
                    const method = t.paymentMethod || 'Unspecified';
                    paymentMethods[method] = (paymentMethods[method] || 0) + (t.total || 0);
                });

                setSalesData({
                    tickets,
                    summary: {
                        totalRevenue,
                        totalTickets,
                        avgTicketValue,
                        paymentMethods,
                        topServices: [], // Would need item-level aggregation
                        topSpenders: []  // Would need customer-level aggregation
                    }
                });
            }
        } catch (error) {
            console.error('Error fetching sales data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickRange = (range: 'TODAY' | 'THIS_MONTH' | 'LAST_MONTH') => {
        const today = new Date();
        switch (range) {
            case 'TODAY':
                setDateRange({
                    start: format(today, 'yyyy-MM-dd'),
                    end: format(today, 'yyyy-MM-dd')
                });
                break;
            case 'THIS_MONTH':
                setDateRange({
                    start: format(startOfMonth(today), 'yyyy-MM-dd'),
                    end: format(endOfMonth(today), 'yyyy-MM-dd')
                });
                break;
            case 'LAST_MONTH':
                const lastIdx = subMonths(today, 1);
                setDateRange({
                    start: format(startOfMonth(lastIdx), 'yyyy-MM-dd'),
                    end: format(endOfMonth(lastIdx), 'yyyy-MM-dd')
                });
                break;
        }
    };

    /* -------------------------------------------------------------------------
       Render
       ------------------------------------------------------------------------- */
    return (
        <div className="space-y-6 animate-in fade-in duration-700 lg:px-6 lg:pb-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Sales Reports</h1>
                    <p className="text-gray-500 text-sm mt-1">Track revenue, sales trend, and ticket history.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchSalesData} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                        <ArrowDownTrayIcon className="w-5 h-5" />
                    </button>
                    <div className="bg-gray-50 p-1 rounded-lg border border-white shadow-sm flex items-center">
                        <button
                            onClick={() => handleQuickRange('TODAY')}
                            className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                        >
                            Today
                        </button>
                        <div className="w-px h-4 bg-gray-200 mx-1"></div>
                        <button
                            onClick={() => handleQuickRange('THIS_MONTH')}
                            className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                        >
                            Month
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-gray-50 rounded-2xl p-4 shadow-md border border-white flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:w-auto">
                    <CustomInput
                        label="From"
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        name="startDate"
                        className='bg-gray-50'
                    />
                </div>
                <div className="w-full md:w-auto">
                    <CustomInput
                        label="To"
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        name="endDate"
                    />
                </div>
                <div className="w-full md:w-48">
                    <CustomSelect
                        label="Status"
                        value={filterStatus}
                        onChange={(val) => setFilterStatus(val as string)}
                        options={[
                            { label: 'All Statuses', value: 'ALL' },
                            { label: 'Completed', value: 'COMPLETED' },
                            { label: 'Open', value: 'OPEN' },
                            { label: 'Cancelled', value: 'CANCELLED' }
                        ]}
                    />
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Revenue */}
                <div className="bg-gray-50 p-6 rounded-2xl shadow-md border border-white flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-lime-50 text-lime-600 flex items-center justify-center">
                        <CurrencyDollarIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm font-medium">Total Revenue</p>
                        <h3 className="text-2xl font-bold text-gray-900">
                            {salesData ? formatCurrency(salesData.summary.totalRevenue) : '-'}
                        </h3>
                    </div>
                </div>

                {/* Total Tickets */}
                <div className="bg-gray-50 p-6 rounded-2xl shadow-md border border-white flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <CheckCircleIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm font-medium">Total Tickets</p>
                        <h3 className="text-2xl font-bold text-gray-900">
                            {salesData ? salesData.summary.totalTickets : '-'}
                        </h3>
                    </div>
                </div>

                {/* Avg Ticket Value */}
                <div className="bg-gray-50 p-6 rounded-2xl shadow-md border border-white flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                        <ArrowTrendingUpIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm font-medium">Avg. Ticket Value</p>
                        <h3 className="text-2xl font-bold text-gray-900">
                            {salesData ? formatCurrency(salesData.summary.avgTicketValue) : '-'}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Sales Table */}
            <div className="bg-gray-50 rounded-2xl shadow-md border border-white overflow-hidden">
                <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-800">Sales History</h3>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                        {salesData?.tickets.length || 0} Records
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Ticket</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4 text-center">Items</th>
                                <th className="px-6 py-4">Payment</th>
                                <th className="px-6 py-4 text-right">Total</th>
                                <th className="px-6 py-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-10 text-gray-400">Loading sales data...</td>
                                </tr>
                            ) : salesData?.tickets.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-10 text-gray-400">No sales records found for this period.</td>
                                </tr>
                            ) : (
                                salesData?.tickets.map((ticket: any) => (
                                    <tr key={ticket._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                                            {format(new Date(ticket.createdAt), 'MMM dd, HH:mm')}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-800">
                                            {ticket.name || 'Walk-in'}
                                            <div className="text-xs text-gray-400 font-mono font-normal">{ticket.ticketNumber || ticket._id}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-900 font-medium">
                                            {ticket.customer?.name || 'Guest'}
                                        </td>
                                        <td className="px-6 py-4 text-center text-gray-500">
                                            {ticket.items?.length || 0}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-semibold">
                                                <CreditCardIcon className="w-3 h-3" />
                                                {ticket.paymentMethod || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                                            {formatCurrency(ticket.total || 0)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold
                                                ${ticket.status === 'COMPLETED' ? 'bg-lime-100 text-lime-700' :
                                                    ticket.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {ticket.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
