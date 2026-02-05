import React, { useState } from 'react';
import { useCart } from '@/hooks/useCart';
import { UserPlusIcon, UserGroupIcon, ChevronRightIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface CartHeaderProps {
    ticketNameInput: string;
    setTicketNameInput: (val: string) => void;
    onCustomerClick: () => void;
}

const CartHeader: React.FC<CartHeaderProps> = ({ ticketNameInput, setTicketNameInput, onCustomerClick }) => {
    const { cartItems, currentCustomer, getAllAssignedCrew, employees, openCrewSidebar, isCrewSidebarOpen } = useCart();
    const isEmpty = cartItems.length === 0;

    // Collapse state for customer/crew cards
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Check if there are any services in the cart (services have sku === 'SRV')
    const hasServices = cartItems.some(item => item.sku === 'SRV');

    // Get all unique crew assigned across all items
    const allCrewIds = getAllAssignedCrew();
    const selectedCrewMembers = employees.filter((emp: any) => allCrewIds.includes(emp._id));
    const crewNames = selectedCrewMembers.map((emp: any) => emp.name).join(', ');

    return (
        <div className="flex-none bg-white border-b border-gray-200 px-5 py-4 z-10">
            {/* Title Row with Item Count and Collapse Toggle */}
            <div className="flex items-center justify-between gap-2">
                <input
                    id="ticketName"
                    name="ticketName"
                    type="text"
                    value={ticketNameInput}
                    onChange={(e) => setTicketNameInput(e.target.value)}
                    placeholder="Current Sale"
                    className="text-xl font-bold text-gray-800 placeholder-gray-300 outline-none bg-transparent border-transparent border-b p-2 focus:bg-gray-50 focus:ring-0 focus:border-gray-400 focus:border-b flex-1 min-w-0"
                />

                {/* Item Count + Collapse Toggle */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-gray-100 transition-colors group"
                    title={isCollapsed ? "Expand details" : "Collapse details"}
                >
                    {!isEmpty && (
                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md group-hover:bg-gray-200">
                            {cartItems.length}
                        </span>
                    )}
                    {isCollapsed ? (
                        <ChevronDownIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                    ) : (
                        <ChevronUpIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                    )}
                </button>
            </div>

            {/* Collapsible Section - Customer & Crew Cards */}
            <div className={`space-y-2 overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'max-h-0 opacity-0 mt-0' : 'max-h-[500px] opacity-100 mt-3'
                }`}>
                {/* Customer Card Button */}
                <button
                    onClick={onCustomerClick}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all outline-none group"
                >
                    <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-colors ${currentCustomer
                            ? 'bg-white text-blue-600 ring-1 ring-gray-100'
                            : 'bg-gray-200 text-gray-500'
                            }`}>
                            {currentCustomer ? (
                                (() => {
                                    const names = currentCustomer.name.trim().split(' ');
                                    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
                                    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
                                })()
                            ) : (
                                <UserPlusIcon className="w-5 h-5" />
                            )}
                        </div>

                        {/* Customer Info */}
                        <div className="flex flex-col items-start">
                            <span className={`font-bold text-sm leading-tight ${currentCustomer ? 'text-gray-900' : 'text-gray-500'}`}>
                                {currentCustomer ? currentCustomer.name : 'Add Customer'}
                            </span>
                            <span className="text-xs text-gray-400 font-medium">
                                {currentCustomer ? (currentCustomer.contactInfo || 'Customer linked') : 'Assign to ticket'}
                            </span>
                        </div>
                    </div>

                    {/* Chevron */}
                    <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </button>

                {/* Crew Card Button - Opens Sidebar (Only shown when cart has services) */}
                {hasServices && (
                    <button
                        onClick={() => openCrewSidebar()}
                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-all outline-none group border ${isCrewSidebarOpen
                            ? 'bg-white border-gray-400'
                            : 'bg-gray-50 border-transparent hover:bg-gray-100'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            {/* Crew Avatar */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-colors ${allCrewIds.length > 0
                                ? 'bg-lime-600 text-white'
                                : 'bg-gray-200 text-gray-500'
                                }`}>
                                {allCrewIds.length > 0 ? (
                                    <span>{allCrewIds.length}</span>
                                ) : (
                                    <UserGroupIcon className="w-5 h-5" />
                                )}
                            </div>

                            {/* Crew Info */}
                            <div className="flex flex-col items-start min-w-0 flex-1">
                                <span className={`font-bold text-sm leading-tight ${allCrewIds.length > 0 ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {allCrewIds.length > 0 ? `${allCrewIds.length} Crew Assigned` : 'Assign Crew'}
                                </span>
                                <span className="text-xs text-gray-400 font-medium truncate max-w-[200px]">
                                    {allCrewIds.length > 0 ? crewNames : 'Who will service this?'}
                                </span>
                            </div>
                        </div>

                        {/* Chevron */}
                        <ChevronRightIcon className={`w-4 h-4 transition-transform ${isCrewSidebarOpen ? 'text-gray-900 rotate-90' : 'text-gray-400 group-hover:text-gray-600'
                            }`} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default CartHeader;
