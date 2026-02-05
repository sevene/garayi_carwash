'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/hooks/useCart';
import TicketsListView from './cart-panel/TicketsListView';
import CustomerSelectionView from './cart-panel/CustomerSelectionView';
import CrewSidebar from './cart-panel/CrewSidebar';
import PaymentModal from './cart-panel/PaymentModal';
import CartHeader from './cart-panel/CartHeader';
import CartItemsList from './cart-panel/CartItemsList';
import CartFooter from './cart-panel/CartFooter';

export function CartPanel() {
    const {
        viewMode,
        isProcessing,
        checkout,
        saveTicket,
        currentTicketName,
        isCrewSidebarOpen,
    } = useCart();

    // UI States
    const [activeView, setActiveView] = useState<'MAIN' | 'CUSTOMER_SETUP'>('MAIN');
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    // Local inputs
    const [ticketNameInput, setTicketNameInput] = useState('');

    // Sync ticket name
    useEffect(() => {
        setTicketNameInput(currentTicketName);
    }, [currentTicketName]);

    // Handlers
    const handleSave = async () => {
        await saveTicket(ticketNameInput);
    };

    const handleCheckoutClick = () => {
        setIsPaymentModalOpen(true);
    };

    const confirmCheckout = (method: string) => {
        checkout(method);
        setIsPaymentModalOpen(false);
    };

    // -------------------------------------------------------------------------
    // VIEW: TICKETS LIST
    // -------------------------------------------------------------------------
    if (viewMode === 'TICKETS') {
        return (
            <div className="w-[450px] bg-white flex flex-col h-full border-l border-gray-200">
                <TicketsListView />
            </div>
        );
    }

    // -------------------------------------------------------------------------
    // VIEW: CUSTOMER SETUP
    // -------------------------------------------------------------------------
    if (activeView === 'CUSTOMER_SETUP') {
        return (
            <div className="w-[450px] bg-white flex flex-col h-full border-l border-gray-200 relative">
                <CustomerSelectionView onBack={() => setActiveView('MAIN')} />
            </div>
        );
    }

    // -------------------------------------------------------------------------
    // VIEW: MAIN CART (with optional Crew Sidebar)
    // -------------------------------------------------------------------------
    return (
        <div className="flex h-full">
            {/* Main Cart Panel */}
            <div className={`bg-white flex flex-col h-full border-l border-gray-200 relative transition-all duration-300 w-[450px]`}>
                <PaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    onConfirm={confirmCheckout}
                />

                <CartHeader
                    ticketNameInput={ticketNameInput}
                    setTicketNameInput={setTicketNameInput}
                    onCustomerClick={() => setActiveView('CUSTOMER_SETUP')}
                />

                <CartItemsList />

                <CartFooter
                    onSave={handleSave}
                    onCheckoutClick={handleCheckoutClick}
                    isBusy={isProcessing}
                />
            </div>

            {/* Crew Sidebar - slides in from right */}
            <div className={`bg-white border-l border-gray-200 h-full overflow-hidden transition-all duration-300 ${isCrewSidebarOpen ? 'w-[450px]' : 'w-0'
                }`}>
                {isCrewSidebarOpen && <CrewSidebar />}
            </div>
        </div>
    );
}
