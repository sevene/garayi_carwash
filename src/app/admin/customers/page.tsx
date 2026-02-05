'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    MapPinIcon,
    EnvelopeIcon,
    PhoneIcon,
    ArrowPathIcon,
    UsersIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import CustomerForm, { CustomerFormData } from '@/components/admin/CustomerForm';
import PageHeader from '@/components/admin/PageHeader';

interface CustomerAddress {
    street: string;
    city: string;
    zip: string;
}

interface Customer {
    _id: string;
    name: string;
    email: string;
    phone: string;
    address: CustomerAddress;
    notes: string;
    cars: Array<{
        plateNumber: string;
        makeModel: string;
        color: string;
        size: string;
    }>;
    loyaltyPoints: number;
    createdAt: string;
}

const EMPTY_CUSTOMER_FORM: CustomerFormData = {
    name: '',
    email: '',
    phone: '',
    address: { street: '', city: '', zip: '' },
    notes: '',
    cars: [{ plateNumber: '', makeModel: '', color: '', size: '' }],
    loyaltyPoints: 0
};

export default function AdminCustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<CustomerFormData>(EMPTY_CUSTOMER_FORM);

    // --- Data Fetching ---
    const fetchCustomers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/customers');
            if (!res.ok) throw new Error('Failed to fetch customers');
            const responseData = await res.json() as any;
            // Handle both array and paginated object responses
            const data = Array.isArray(responseData) ? responseData : (responseData.data || []);
            setCustomers(data as Customer[]);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load customers');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    // --- Search Logic ---
    const filteredCustomers = useMemo(() => {
        if (!searchQuery) return customers;
        const lowerQ = searchQuery.toLowerCase();
        return customers.filter(c =>
            c.name.toLowerCase().includes(lowerQ) ||
            c.email.toLowerCase().includes(lowerQ) ||
            c.phone.includes(lowerQ) ||
            c.cars.some(car =>
                car.plateNumber.toLowerCase().includes(lowerQ) ||
                car.makeModel.toLowerCase().includes(lowerQ)
            )
        );
    }, [customers, searchQuery]);

    // --- Handlers ---
    const handleAddClick = () => {
        setEditingId(null);
        setFormData(EMPTY_CUSTOMER_FORM);
        setIsModalOpen(true);
    };

    const handleEditClick = (customer: Customer) => {
        setEditingId(customer._id);
        setFormData({
            _id: customer._id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: { ...customer.address },
            notes: customer.notes,
            cars: customer.cars && customer.cars.length > 0 ? customer.cars : [{ plateNumber: '', makeModel: '', color: '', size: '' }],
            loyaltyPoints: customer.loyaltyPoints
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete customer "${name}"?`)) return;
        try {
            const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            setCustomers(prev => prev.filter(c => c._id !== id));
            toast.success('Customer deleted');
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete customer');
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const method = editingId ? 'PUT' : 'POST';
            const url = editingId ? `/api/customers/${editingId}` : '/api/customers';

            // Prepare payload (remove _id if present in formData)
            const { _id, ...payload } = formData;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to save');

            const savedCustomer = await res.json() as Customer;

            if (editingId) {
                setCustomers(prev => prev.map(c => c._id === editingId ? savedCustomer : c));
                toast.success('Customer updated');
            } else {
                setCustomers(prev => [savedCustomer, ...prev]);
                toast.success('Customer created');
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            toast.error('Failed to save customer');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-1000 lg:px-6 lg:pb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <PageHeader
                    title="Customers"
                    description="Manage your customer base"
                />
                <button
                    onClick={handleAddClick}
                    className="flex items-center gap-2 bg-lime-500 hover:bg-lime-600 text-white px-4 py-2 rounded-xl font-medium shadow-sm transition-all active:scale-95"
                >
                    <PlusIcon className="w-5 h-5" />
                    <span>Add Customer</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

                {/* Toolbar */}
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-4 justify-between items-center">
                    <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                        <UsersIcon className="w-5 h-5" />
                        All Customers
                    </h2>

                    <div className="flex items-center gap-3 flex-1 max-w-md ml-auto">
                        <div className="relative flex-1">
                            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search customers..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 transition-all"
                            />
                        </div>
                        <button onClick={fetchCustomers} className="text-gray-400 hover:text-gray-600 p-1" title="Refresh">
                            <ArrowPathIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 border-b border-gray-200 font-bold text-gray-700 uppercase leading-normal">
                            <tr>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4 text-center">Contact</th>
                                <th className="px-6 py-4 text-center">Vehicle</th>
                                <th className="px-6 py-4 text-center">Pts</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        Loading customers...
                                    </td>
                                </tr>
                            ) : filteredCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No customers found.
                                    </td>
                                </tr>
                            ) : (
                                filteredCustomers.map(customer => (
                                    <tr key={customer._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-lime-100 flex items-center justify-center text-lime-700 font-bold text-lg shrink-0">
                                                    {(customer.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900">{customer.name}</div>
                                                    {customer.address.city && (
                                                        <div className="text-xs text-gray-400 flex items-center gap-1">
                                                            <MapPinIcon className="w-3 h-3" />
                                                            {customer.address.city}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-block text-left space-y-1">
                                                {customer.phone && (
                                                    <div className="flex items-center gap-2">
                                                        <PhoneIcon className="w-4 h-4 text-gray-400" />
                                                        <span className='font-medium text-gray-700'>{customer.phone}</span>
                                                    </div>
                                                )}
                                                {customer.email && (
                                                    <div className="flex items-center gap-2">
                                                        <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                                                        <span className="text-xs text-gray-500">{customer.email}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">

                                            {customer.cars && customer.cars.length > 0 ? (
                                                <div className="flex flex-col gap-2 items-center">
                                                    {customer.cars.map((car, idx) => (
                                                        <div key={idx} className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 inline-block min-w-[200px]">
                                                            <div className="flex items-center gap-3 justify-left">
                                                                <span
                                                                    className="w-6 h-6 rounded-sm border border-gray-300 shadow-sm"
                                                                    style={{ backgroundColor: car.color }}
                                                                    title={car.color}
                                                                />
                                                                <div>
                                                                    <div className="font-bold text-gray-800 leading-none mb-1.5 uppercase text-center">
                                                                        {car.plateNumber || 'No Plate'}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 flex items-center justify-center gap-1.5 flex-wrap">
                                                                        <span>
                                                                            {car.makeModel}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">No car details</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-block px-3 py-1 rounded-full bg-lime-100 text-lime-800 font-bold text-xs">
                                                {customer.loyaltyPoints}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => handleEditClick(customer)}
                                                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <PencilSquareIcon className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(customer._id, customer.name)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
                        <CustomerForm
                            formData={formData}
                            setFormData={setFormData}
                            onSubmit={handleSave}
                            isEditing={!!editingId}
                            isSaving={isSaving}
                            onCancel={() => setIsModalOpen(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
