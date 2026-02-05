import React from 'react';
import { UserIcon, EnvelopeIcon, PhoneIcon, MapPinIcon, TruckIcon, DocumentTextIcon, TrashIcon } from '@heroicons/react/24/outline';
import CustomSelect from '@/components/ui/CustomSelect';

interface CustomerAddress {
    street: string;
    city: string;
    zip: string;
}

export interface CustomerFormData {
    _id?: string;
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
}

interface CustomerFormProps {
    formData: CustomerFormData;
    setFormData: React.Dispatch<React.SetStateAction<CustomerFormData>>;
    onSubmit: (e: React.FormEvent) => void;
    isEditing: boolean;
    isSaving: boolean;
    onCancel: () => void;
}

export default function CustomerForm({ formData, setFormData, onSubmit, isEditing, isSaving, onCancel }: CustomerFormProps) {

    // Helper to update nested address fields
    const handleAddressChange = (field: keyof CustomerAddress, value: string) => {
        setFormData(prev => ({
            ...prev,
            address: {
                ...prev.address,
                [field]: value
            }
        }));
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h2 className="font-semibold text-gray-800">
                    {isEditing ? 'Edit Customer' : 'Create New Customer'}
                </h2>
            </div>

            <form onSubmit={onSubmit} className="p-5 space-y-4">

                {/* Personal Info */}
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Personal Info</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                            <div className="relative">
                                <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    required
                                    type="text"
                                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <div className="relative">
                                <EnvelopeIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="email"
                                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 outline-none"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <div className="relative">
                                <PhoneIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="tel"
                                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 outline-none"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <hr className="border-gray-100" />

                {/* Vehicle Details */}
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex justify-between items-center">
                        <span>Vehicles</span>
                        <button
                            type="button"
                            onClick={() => setFormData({
                                ...formData,
                                cars: [...formData.cars, { plateNumber: '', makeModel: '', color: '', size: '' }]
                            })}
                            className="text-xs bg-lime-100 text-lime-700 px-2 py-1 rounded hover:bg-lime-200 transition"
                        >
                            + Add Car
                        </button>
                    </h3>

                    <div className="space-y-4">
                        {formData.cars.map((car, index) => (
                            <div key={index} className="p-3 border border-gray-200 rounded-lg relative bg-gray-50/50">
                                {formData.cars.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setFormData({
                                            ...formData,
                                            cars: formData.cars.filter((_, i) => i !== index)
                                        })}
                                        className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                )}

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Plate Number</label>
                                        <div className="relative">
                                            <TruckIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="text"
                                                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 outline-none uppercase"
                                                value={car.plateNumber}
                                                onChange={e => {
                                                    const newCars = [...formData.cars];
                                                    newCars[index].plateNumber = e.target.value.toUpperCase();
                                                    setFormData({ ...formData, cars: newCars });
                                                }}
                                                placeholder="ABC 1234"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Make & Model</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 outline-none"
                                            value={car.makeModel}
                                            onChange={e => {
                                                const newCars = [...formData.cars];
                                                newCars[index].makeModel = e.target.value;
                                                setFormData({ ...formData, cars: newCars });
                                            }}
                                            placeholder="Toyota Vios"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5">Color</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 outline-none"
                                                value={car.color}
                                                onChange={e => {
                                                    const newCars = [...formData.cars];
                                                    newCars[index].color = e.target.value;
                                                    setFormData({ ...formData, cars: newCars });
                                                }}
                                                placeholder="Red"
                                            />
                                        </div>
                                        <div>
                                            <CustomSelect
                                                label="Size"
                                                options={[
                                                    { label: 'Compact', value: 'Compact' },
                                                    { label: 'Sedan', value: 'Sedan' },
                                                    { label: 'Coupe', value: 'Coupe' },
                                                    { label: 'AUV', value: 'AUV' },
                                                    { label: 'SUV', value: 'SUV' },
                                                    { label: 'Pickup/Ute', value: 'Pickup/Ute' },
                                                    { label: 'Van', value: 'Van' },
                                                ]}
                                                value={car.size}
                                                onChange={(value) => {
                                                    const newCars = [...formData.cars];
                                                    newCars[index].size = String(value);
                                                    setFormData({ ...formData, cars: newCars });
                                                }}
                                                placeholder="Select Size"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <hr className="border-gray-100" />

                {/* Address */}
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Address</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
                            <div className="relative">
                                <MapPinIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 outline-none"
                                    value={formData.address.street}
                                    onChange={e => handleAddressChange('street', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 outline-none"
                                    value={formData.address.city}
                                    onChange={e => handleAddressChange('city', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Zip</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 outline-none"
                                    value={formData.address.zip}
                                    onChange={e => handleAddressChange('zip', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <hr className="border-gray-100" />

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <div className="relative">
                        <DocumentTextIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <textarea
                            rows={3}
                            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 outline-none"
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>
                </div>

                <div className="pt-2 flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-lime-500 text-white rounded-lg hover:bg-lime-600 transition font-medium shadow-md shadow-lime-200 disabled:opacity-70 disabled:cursor-not-allowed"
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : (isEditing ? 'Update Customer' : 'Create Customer')}
                    </button>
                </div>
            </form>
        </div>
    );
}
