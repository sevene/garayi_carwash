import React from 'react';
import { useCart } from '@/hooks/useCart';
import { ArrowPathIcon, UserGroupIcon } from '@heroicons/react/24/outline';

const TicketsListView = () => {
    const {
        openTickets,
        fetchOpenTickets,
        loadTicket,
        isTicketsLoading,
        taxRate,
        formatCurrency,
        employees
    } = useCart();

    const formatDateTime = (dateStr: string) => {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'N/A';
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Filter out completed tickets on the client side as a safeguard
    const activeTickets = openTickets.filter((t: any) => t.status !== 'COMPLETED');

    return (
        <div className="flex-1 flex flex-col min-h-0">
            {/* Header / Refresh */}
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-700">Open Tickets ({activeTickets.length})</h3>
                <button
                    onClick={fetchOpenTickets}
                    disabled={isTicketsLoading}
                    className="p-2 text-gray-500 hover:text-lime-700 hover:bg-lime-50 rounded-full transition"
                    title="Refresh Tickets"
                >
                    <ArrowPathIcon className={`w-5 h-5 ${isTicketsLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* List Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isTicketsLoading && activeTickets.length === 0 && (
                    <div className="text-center text-gray-500 py-8">Loading...</div>
                )}

                {!isTicketsLoading && activeTickets.length === 0 && (
                    <div className="text-center bg-gray-100 rounded-lg p-6 text-gray-500">
                        No pending tickets found.
                    </div>
                )}

                {activeTickets.map((ticket: any) => {
                    // Use stored values if available, otherwise calculate with current tax rate
                    const sub = ticket.subtotal ?? ticket.items.reduce((acc: number, item: any) => acc + (item.unitPrice * item.quantity), 0);
                    const tax = ticket.taxAmount ?? (sub * (ticket.taxRate ?? taxRate));
                    const displayTotal = ticket.total || (sub + tax);

                    return (
                        <div
                            key={ticket._id}
                            onClick={() => loadTicket(ticket)}
                            className="group p-3 border border-gray-100 rounded-lg cursor-pointer bg-white transition-all hover:border-gray-300"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex flex-col">
                                    {ticket.ticketNumber && (
                                        <span className="text-[10px] font-mono text-gray-400 tracking-wide">
                                            {ticket.ticketNumber}
                                        </span>
                                    )}
                                    <span className="font-bold text-gray-800 group-hover:text-lime-600 transition-colors">
                                        {ticket.name || 'Unnamed Ticket'}
                                    </span>
                                </div>
                                <span className="font-bold text-lime-600">
                                    {formatCurrency(displayTotal)}
                                </span>
                            </div>

                            <div className="text-xs text-gray-500 flex flex-col gap-1">
                                <span>Created: {formatDateTime(ticket.createdAt)}</span>
                                {ticket.crew && ticket.crew.length > 0 && (
                                    <span className="flex items-center gap-1 text-gray-500 mt-1">
                                        <UserGroupIcon className="w-3 h-3" />
                                        {ticket.crew.map((c: any) => {
                                            const id = typeof c === 'object' ? c._id : c;
                                            const emp = employees.find((e: any) => e._id === id);
                                            return emp ? emp.name : '';
                                        }).filter(Boolean).join(', ')}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TicketsListView;
