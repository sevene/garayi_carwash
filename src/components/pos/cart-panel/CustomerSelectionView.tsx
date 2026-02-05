import React, { useState, useMemo } from 'react';
import { useCart } from '@/hooks/useCart';
import { ChevronLeftIcon, MagnifyingGlassIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import CustomSelect from '../../ui/CustomSelect';

interface CustomerSelectionViewProps {
    onBack: () => void;
}

const CustomerSelectionView: React.FC<CustomerSelectionViewProps> = ({ onBack }) => {
    const {
        customers,
        currentCustomer,
        setCustomer,
        currentTicketName,
        setCurrentTicketName
    } = useCart();

    const [searchTerm, setSearchTerm] = useState('');

    // Filter customers
    const filteredCustomers = useMemo(() => {
        if (!searchTerm) return customers;
        const lower = searchTerm.toLowerCase();
        return customers.filter((c: any) =>
            c.name.toLowerCase().includes(lower) ||
            (c.contactInfo && c.contactInfo.toLowerCase().includes(lower)) ||
            (c.plateNumber && c.plateNumber.toLowerCase().includes(lower)) ||
            (c.phone && c.phone.includes(lower))
        );
    }, [searchTerm, customers]);

    return (
        <div className="flex flex-col h-full bg-white animate-in slide-in-from-right duration-300">
            {/* View Header */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-200">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ChevronLeftIcon className="w-6 h-6" />
                </button>
                <h2 className="text-lg font-bold text-gray-800">Select Customer</h2>
            </div>

            {/* Search Bar */}
            <div className="p-4">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        id="customerSearch"
                        name="customerSearch"
                        type="text"
                        placeholder="Search by name or mobile..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-1 rounded-xl border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-lime-500 outline-none text-gray-700 bg-white transition-all"
                        autoFocus
                    />
                </div>
            </div>

            {/* Settings Content */}
            <div className="flex-1 overflow-y-auto min-h-0">
                {/* Active Customer Section (Top Pinned) */}
                {currentCustomer && (
                    <div className="p-4 border-b border-gray-200">
                        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Currently Assigned</h3>
                        <div className="bg-white p-3 rounded-xl border border-gray-400 flex justify-between items-center">
                            <div>
                                <p className="font-bold text-gray-900">{currentCustomer.name}</p>
                                <p className="text-xs text-gray-500">{currentCustomer.contactInfo || 'No contact info'}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setCustomer(null);
                                    setCurrentTicketName('New Order');
                                }}
                                className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
                            >
                                Unlink
                            </button>
                        </div>

                        {/* Vehicle Selector for Current Customer (Multi-Select) */}
                        {currentCustomer.cars && currentCustomer.cars.length > 0 && (
                            <div className="mt-3">
                                <label className="text-xs font-medium text-gray-500 mb-2 block">Link Vehicles to Ticket</label>
                                <div className="space-y-2">
                                    {currentCustomer.cars.map((car: any, idx: number) => {
                                        // Check if this plate is currently in the ticket name
                                        const isSelected = currentTicketName.includes(car.plateNumber);
                                        return (
                                            <button
                                                key={car.id || idx}
                                                onClick={() => {
                                                    let newTicketName = currentTicketName;
                                                    const plate = car.plateNumber;

                                                    // Parse existing plates from the name part after " - "
                                                    const parts = currentTicketName.split(' - ');
                                                    const baseName = parts[0];
                                                    const potentialPlates = parts.length > 1 ? parts[1].split(', ') : [];

                                                    let newPlates: string[] = [];

                                                    if (isSelected) {
                                                        // Remove it
                                                        newPlates = potentialPlates.filter(p => p !== plate && p.trim() !== '');
                                                    } else {
                                                        // Add it
                                                        // Check if we are starting fresh (i.e. if the suffix isn't a known plate, maybe just overwrite)
                                                        // But to be simple, if we have plates, valid plates, keep them.
                                                        newPlates = [...potentialPlates, plate];
                                                    }

                                                    // Rebuild Name
                                                    // If no plates selected, just use Customer Name
                                                    if (newPlates.length === 0) {
                                                        newTicketName = baseName;
                                                    } else {
                                                        newTicketName = `${baseName} - ${newPlates.join(', ')}`;
                                                    }

                                                    setCurrentTicketName(newTicketName);
                                                }}
                                                className={`w-full flex items-center justify-between p-2 text-sm transition-all ${isSelected
                                                    ? 'text-gray-700'
                                                    : 'text-gray-500'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-lime-500 border-lime-500' : 'border-gray-300'
                                                        }`}>
                                                        {isSelected && <CheckCircleIcon className="w-3.5 h-3.5 text-white" />}
                                                    </div>
                                                    <span className="font-medium">{car.plateNumber}</span>
                                                    <span className="text-gray-400 text-xs">- {car.makeModel}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Customer List */}
                <div className="p-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 py-2">All Customers</h3>
                    <div className="space-y-1">
                        {filteredCustomers.map((cust: any) => (
                            <button
                                key={cust._id}
                                onClick={() => {
                                    setCustomer(cust);
                                    const firstCar = cust.cars && cust.cars.length > 0 ? cust.cars[0] : null;
                                    const plateText = firstCar?.plateNumber || 'No Plate';
                                    const autoName = `${cust.name} - ${plateText}`;
                                    setCurrentTicketName(autoName);
                                    // Optional: Go back immediately? Users usually prefer staying to verify or pick car.
                                    // onBack();
                                }}
                                className={`w-full flex items-center p-3 rounded-xl transition-colors text-left group ${currentCustomer?._id === cust._id
                                    ? 'bg-lime-50'
                                    : 'hover:bg-gray-50'
                                    }`}
                            >
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold mr-3 group-hover:bg-white group-hover:shadow-sm transition-all">
                                    {cust.name[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <span className={`font-semibold ${currentCustomer?._id === cust._id ? 'text-lime-800' : 'text-gray-800'}`}>
                                            {cust.name}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate">{cust.contactInfo || 'No contact info'}</p>
                                </div>
                                {currentCustomer?._id === cust._id && <CheckCircleIcon className="w-5 h-5 text-lime-600 ml-2" />}
                            </button>
                        ))}

                        {filteredCustomers.length === 0 && (
                            <div className="text-center py-8 text-gray-400">
                                No customers found.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Action */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
                <button
                    onClick={onBack}
                    className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-gray-800 transition-all active:scale-[0.98]"
                >
                    Confirm Details
                </button>
            </div>
        </div>
    );
};

export default CustomerSelectionView;
