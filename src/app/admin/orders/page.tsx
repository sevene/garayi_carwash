'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { TrashIcon, ArrowPathIcon, FunnelIcon, ChevronDownIcon, ChevronUpIcon, BanknotesIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import CustomSelect from '@/components/ui/CustomSelect';
import { useSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';
import PageHeader from '@/components/admin/PageHeader';

interface TicketItem {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    crew?: any[];
}

interface Ticket {
    _id: string;
    ticketNumber?: string; // Formatted ticket ID (e.g., GCW-2602011853001)
    name: string;
    status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
    items: TicketItem[];
    subtotal?: number; // Stored subtotal at time of order
    taxRate?: number; // Stored tax rate at time of order
    taxAmount?: number; // Stored tax amount at time of order
    total: number;
    paymentMethod?: string;
    createdAt: string;
    updatedAt: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customer?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    crew?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customerSnapshot?: any;
}

export default function AdminOrdersPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter States
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [dateFilter, setDateFilter] = useState<string>('');

    // Expanded State
    const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());

    const { formatCurrency } = useSettings();

    const fetchTickets = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/tickets?all=true');
            if (!res.ok) throw new Error('Failed to fetch orders');
            const data = await res.json() as Ticket[];
            setTickets(data);
        } catch (err) {
            console.error(err);
            setError('Failed to load orders');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) return;

        try {
            const res = await fetch(`/api/tickets/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete order');

            // Remove from local state
            setTickets(prev => prev.filter(t => t._id !== id));
            toast.success('Order deleted successfully');
        } catch (err) {
            console.error(err);
            toast.error('Failed to delete order');
        }
    };

    const toggleRow = (id: string) => {
        setExpandedTickets(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Use stored total, or calculate from stored values, falling back to items calculation
    const calculateTotal = (ticket: Ticket) => {
        if (ticket.total) return ticket.total;
        // Fallback for legacy tickets without stored total
        const subtotal = ticket.subtotal ?? ticket.items.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
        const tax = ticket.taxAmount ?? (subtotal * (ticket.taxRate ?? 0));
        return subtotal + tax;
    };

    // Get tax rate for display from the ticket's stored value
    const getTicketTaxRate = (ticket: Ticket) => {
        return ticket.taxRate ?? 0;
    };

    // Get tax amount for display from the ticket's stored value or calculate
    const getTicketTaxAmount = (ticket: Ticket) => {
        if (ticket.taxAmount !== undefined) return ticket.taxAmount;
        const subtotal = ticket.subtotal ?? ticket.items.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
        return subtotal * (ticket.taxRate ?? 0);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-green-50 text-green-800';
            case 'CANCELLED': return 'bg-red-50 text-red-800';
            default: return 'bg-yellow-50 text-yellow-800';
        }
    };

    const getDuration = (start: string, end?: string) => {
        if (!end) return null;
        const diff = new Date(end).getTime() - new Date(start).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 0) return null; // Should not happen
        if (mins < 60) return `${mins}m`;
        const hrs = Math.floor(mins / 60);
        return `${hrs}h ${mins % 60}m`;
    };

    // Filter Logic
    const filteredTickets = useMemo(() => {
        return tickets.filter(ticket => {
            // Status Filter
            if (statusFilter !== 'ALL' && (ticket.status || 'PENDING') !== statusFilter) {
                return false;
            }

            // Date Filter (Matches YYYY-MM-DD)
            if (dateFilter) {
                const ticketDate = new Date(ticket.createdAt).toISOString().split('T')[0];
                if (ticketDate !== dateFilter) {
                    return false;
                }
            }

            return true;
        });
    }, [tickets, statusFilter, dateFilter]);

    return (
        <div>
            <div className="space-y-6 animate-in fade-in duration-1000 lg:px-6 lg:pb-6 flex flex-row justify-between items-center">
                <PageHeader
                    title="Orders Management"
                    description="View and manage all customer orders"
                />
                <button
                    onClick={fetchTickets}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-white rounded-lg text-gray-700 hover:bg-gray-100 transition-colors shadow-sm"
                >
                    <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                    {error}
                </div>
            )}

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-xl shadow-md mb-6 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 text-gray-500 mr-2">
                    <FunnelIcon className="w-5 h-5" />
                    <span className="font-medium">Filters:</span>
                </div>

                {/* Status Filter */}
                <div className="w-48">
                    <CustomSelect
                        options={[
                            { label: 'All Statuses', value: 'ALL' },
                            { label: 'Pending', value: 'PENDING' },
                            { label: 'Completed', value: 'COMPLETED' },
                            { label: 'Cancelled', value: 'CANCELLED' }
                        ]}
                        value={statusFilter}
                        onChange={(val) => setStatusFilter(val as string)}
                        placeholder="Filter by Status"
                    />
                </div>

                {/* Date Filter */}
                <input
                    id="dateFilter"
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 outline-none"
                />

                {/* Clear Filters */}
                {(statusFilter !== 'ALL' || dateFilter) && (
                    <button
                        onClick={() => {
                            setStatusFilter('ALL');
                            setDateFilter('');
                        }}
                        className="text-sm text-red-500 hover:text-red-700 font-medium"
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 border-b border-gray-200 font-medium text-gray-900 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Name / Order ID</th>
                                <th className="px-6 py-4 text-center">Date</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Payment</th>
                                <th className="px-6 py-4 text-center">Items</th>
                                <th className="px-6 py-4 text-right">Total</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {isLoading && tickets.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        Loading orders...
                                    </td>
                                </tr>
                            ) : filteredTickets.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        No orders found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredTickets.map((ticket) => {
                                    const isExpanded = expandedTickets.has(ticket._id);
                                    return (
                                        <React.Fragment key={ticket._id}>
                                            <tr
                                                onClick={() => toggleRow(ticket._id)}
                                                className={`hover:bg-gray-50 transition-colors cursor-pointer ${isExpanded ? 'bg-gray-50' : ''}`}
                                            >
                                                <td className="px-6 py-4 flex flex-row gap-6 items-center">
                                                    {isExpanded ? (
                                                        <ChevronUpIcon className="w-4 h-4 text-gray-500" />
                                                    ) : (
                                                        <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                                                    )}
                                                    <div>
                                                        <div className="font-bold text-gray-900">{ticket.name || 'Unnamed Order'}</div>
                                                        <div className="text-xs text-gray-500 font-medium">
                                                            {ticket.customer ? (typeof ticket.customer === 'object' ? ticket.customer.name : 'Unknown Customer') : 'No Customer'}
                                                        </div>
                                                        <div className="text-xs text-gray-400 mt-0.5 font-mono">{ticket.ticketNumber || ticket._id}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    {formatDate(ticket.createdAt)}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(ticket.status || 'PENDING')}`}>
                                                            {ticket.status || 'PENDING'}
                                                        </span>
                                                        {ticket.status === 'COMPLETED' && ticket.updatedAt && (
                                                            <span className="text-[10px] text-gray-400 font-mono flex items-center gap-0.5" title="Service Duration">
                                                                ⏱️ {getDuration(ticket.createdAt, ticket.updatedAt) || 'N/A'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm font-medium text-gray-700 align-middle">
                                                    {ticket.paymentMethod === 'Cash' ? (
                                                        <span className="inline-flex items-center justify-center gap-1.5 text-green-800 bg-green-50 px-2.5 py-1 border-green-50 rounded-md border text-xs font-semibold">
                                                            <BanknotesIcon className="w-3.5 h-3.5" />
                                                            Cash
                                                        </span>
                                                    ) : (
                                                        ticket.paymentMethod || '-'
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="max-w-xs truncate">
                                                        {ticket.items.length} items
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-gray-900">
                                                    {formatCurrency(calculateTotal(ticket))}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={(e) => handleDelete(ticket._id, e)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete Order"
                                                    >
                                                        <TrashIcon className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* Expanded Details Row */}
                                            {isExpanded && (
                                                <tr className="bg-gray-50">
                                                    <td colSpan={7} className="px-6 py-4 border-t border-gray-100">
                                                        <div className="bg-white rounded-lg border border-gray-200 p-4">

                                                            {/* Customer & Crew Details */}
                                                            {(ticket.customer || (ticket.crew && ticket.crew.length > 0)) && (
                                                                <div className="mb-6 grid grid-cols-2 gap-6 pb-6 border-b border-gray-100">
                                                                    {/* Customer Info */}
                                                                    {ticket.customer && (
                                                                        <div>
                                                                            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Customer</h5>
                                                                            <div className="text-sm font-semibold text-gray-800">
                                                                                {typeof ticket.customer === 'object' ? ticket.customer.name : 'Unknown'}
                                                                            </div>
                                                                            {typeof ticket.customer === 'object' && ticket.customer.contactInfo && (
                                                                                <div className="text-xs text-gray-500 mt-0.5">
                                                                                    {ticket.customer.contactInfo}
                                                                                </div>
                                                                            )}

                                                                            {/* Car Details Priority: Snapshot -> First Car */}
                                                                            {(() => {
                                                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                                                const car = ticket.customerSnapshot?.carDetails ||
                                                                                    (typeof ticket.customer === 'object' && ticket.customer.cars && ticket.customer.cars.length > 0 ? ticket.customer.cars[0] : null);

                                                                                if (car) {
                                                                                    return (
                                                                                        <div className="mt-2 inline-flex items-center gap-2 p-1.5 pr-3 rounded-lg border border-gray-200 bg-white shadow-sm">
                                                                                            {/* Color/Icon Swatch - Compact */}
                                                                                            <div
                                                                                                className="w-8 h-8 rounded border border-gray-200 flex items-center justify-center shrink-0 shadow-sm"
                                                                                                style={{ backgroundColor: car.color?.toLowerCase() || '#f9fafb' }}
                                                                                            >
                                                                                                {!car.color && <span className="text-[10px] text-gray-400">🚗</span>}
                                                                                            </div>

                                                                                            {/* Details */}
                                                                                            <div className="flex flex-col">
                                                                                                <span className="font-bold text-gray-900 text-xs tracking-tight leading-tight">
                                                                                                    {car.plateNumber || 'NO PLATE'}
                                                                                                </span>
                                                                                                <span className="text-[10px] text-gray-500 font-medium capitalize leading-tight">
                                                                                                    {car.makeModel || 'Unknown'}
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                }
                                                                                return null;
                                                                            })()}
                                                                        </div>
                                                                    )}

                                                                    {/* Crew Info */}
                                                                    {ticket.crew && ticket.crew.length > 0 && (
                                                                        <div>
                                                                            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Assigned Crew ({ticket.crew.length})</h5>
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {ticket.crew.map((c: any, i: number) => (
                                                                                    <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
                                                                                        {typeof c === 'object' ? c.name : 'ID: ' + c}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            <h4 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">Order Details</h4>
                                                            <table className="w-full text-sm">
                                                                <thead className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                                                                    <tr>
                                                                        <th className="py-2 px-3 text-left">Product</th>
                                                                        <th className="py-2 px-3 text-left">Assigned</th>
                                                                        <th className="py-2 px-3 text-center">Qty</th>
                                                                        <th className="py-2 px-3 text-right">Unit Price</th>
                                                                        <th className="py-2 px-3 text-right">Total</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-100">
                                                                    {ticket.items.map((item, idx) => (
                                                                        <tr key={idx}>
                                                                            <td className="py-2 px-3 text-gray-800 font-medium">
                                                                                {item.productName}
                                                                            </td>
                                                                            <td className="py-2 px-3">
                                                                                {item.crew && item.crew.length > 0 ? (
                                                                                    <div className="flex flex-wrap gap-1">
                                                                                        {item.crew.map((c: any, i: number) => (
                                                                                            <span key={i} className="text-[10px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded border border-sky-100 font-medium whitespace-nowrap">
                                                                                                {c.name}
                                                                                            </span>
                                                                                        ))}
                                                                                    </div>
                                                                                ) : (
                                                                                    <span className="text-xs text-gray-300 italic">-</span>
                                                                                )}
                                                                            </td>
                                                                            <td className="py-2 px-3 text-center text-gray-600">{item.quantity}</td>
                                                                            <td className="py-2 px-3 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                                                                            <td className="py-2 px-3 text-right font-medium text-gray-900">
                                                                                {formatCurrency(item.unitPrice * item.quantity)}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                                <tfoot className="border-t border-gray-200">
                                                                    {ticket.paymentMethod && (
                                                                        <tr>
                                                                            <td colSpan={4} className="py-2 px-3 text-right font-bold text-gray-600">Payment Method</td>
                                                                            <td className="py-2 px-3 text-right font-bold text-lime-600">
                                                                                {ticket.paymentMethod === 'Cash' ? '💵 Cash' : ticket.paymentMethod}
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                    <tr>
                                                                        <td colSpan={4} className="py-2 px-3 text-right font-bold text-gray-600">Subtotal</td>
                                                                        <td className="py-2 px-3 text-right font-bold text-gray-800">
                                                                            {formatCurrency(ticket.subtotal ?? ticket.items.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0))}
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td colSpan={4} className="py-1 px-3 text-right text-gray-500 text-xs">Tax ({Number((getTicketTaxRate(ticket) * 100).toFixed(2))}%)</td>
                                                                        <td className="py-1 px-3 text-right text-gray-500 text-xs">
                                                                            {formatCurrency(getTicketTaxAmount(ticket))}
                                                                        </td>
                                                                    </tr>
                                                                    <tr className="border-t border-gray-100">
                                                                        <td colSpan={4} className="py-3 px-3 text-right font-extrabold text-gray-900 text-base">Total</td>
                                                                        <td className="py-3 px-3 text-right font-extrabold text-gray-900 text-base">
                                                                            {formatCurrency(calculateTotal(ticket))}
                                                                        </td>
                                                                    </tr>
                                                                </tfoot>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
