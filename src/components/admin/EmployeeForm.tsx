'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import CustomSelect from '@/components/ui/CustomSelect';
import { handleNumberInput } from '@/components/utils/inputHelpers';

export interface EmployeeFormData {
    _id?: string;
    name: string;
    username: string;
    password: string;
    role: string;
    pin: string;
    contactInfo: {
        phone: string;
        email: string;
    };
    address: string;
    status: string;
    compensation: {
        payType: 'hourly' | 'daily' | 'commission';
        rate: number | string;
        commission: number | string;
    };
}


interface RoleOption {
    _id: string;
    name: string;
    displayName: string;
}

interface EmployeeFormProps {
    formData: EmployeeFormData;
    setFormData: React.Dispatch<React.SetStateAction<EmployeeFormData>>;
    onSubmit: (e: React.FormEvent) => void;
    isEditing: boolean;
    isSaving: boolean;
    onCancel: () => void;
    roles?: RoleOption[];
}

const STATUSES = ['active', 'inactive'];
const PAY_TYPES = [
    { label: 'Hourly Rate', value: 'hourly' },
    { label: 'Daily Rate', value: 'daily' },
    { label: 'Commission Only', value: 'commission' }
];

export default function EmployeeForm({
    formData,
    setFormData,
    onSubmit,
    isEditing,
    isSaving,
    onCancel,
    roles = []
}: EmployeeFormProps) {

    const handleChange = (field: string, value: any) => {
        if (field.includes('.')) {
            const parts = field.split('.');
            // Handle 1 level or 2 levels deep
            if (parts.length === 2) {
                const [parent, child] = parts;
                setFormData(prev => ({
                    ...prev,
                    [parent]: {
                        ...(prev as any)[parent],
                        [child]: value
                    }
                }));
            }
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-800 text-lg">
                    {isEditing ? 'Edit Employee' : 'New Employee'}
                </h3>
                <button
                    onClick={onCancel}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>
            </div>

            <form onSubmit={onSubmit} className="p-6 space-y-4">
                {/* ... form content ... */}
                {/* Name & Role */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={e => handleChange('name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white transition-all hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                        />
                    </div>
                </div>

                {/* Username & Password */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Username</label>
                        <input
                            type="text"
                            required
                            value={formData.username}
                            onChange={e => handleChange('username', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white transition-all hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                            placeholder="Login Username"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                            Password {isEditing && <span className="font-normal text-gray-400">(leave blank to keep current)</span>}
                        </label>
                        <input
                            type="password"
                            required={!isEditing}
                            value={formData.password}
                            onChange={e => handleChange('password', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white transition-all hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                            placeholder={isEditing ? "••••••••" : "Enter password"}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Role</label>
                        <CustomSelect
                            value={formData.role}
                            onChange={(val) => handleChange('role', val)}
                            options={roles.length > 0 ? roles.map(r => ({ label: r.displayName, value: r._id })) : []}
                            placeholder="Select Role"
                            className="w-full"
                        />
                    </div>
                </div>

                {/* PIN & Status */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">PIN Code</label>
                        <input
                            type="text"
                            value={formData.pin}
                            onChange={e => handleChange('pin', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white transition-all hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 font-mono tracking-widest"
                            placeholder="e.g. 1234"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
                        <CustomSelect
                            value={formData.status}
                            onChange={(val) => handleChange('status', val)}
                            options={STATUSES.map(s => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s }))}
                            placeholder="Select Status"
                            className="w-full"
                        />
                    </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Phone</label>
                        <input
                            type="tel"
                            value={formData.contactInfo.phone}
                            onChange={e => handleChange('contactInfo.phone', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white transition-all hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                            placeholder="0912 345 6789"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={formData.contactInfo.email}
                            onChange={e => handleChange('contactInfo.email', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white transition-all hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                            placeholder="employee@example.com"
                        />
                    </div>
                </div>

                {/* Address */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Address</label>
                    <textarea
                        rows={2}
                        value={formData.address}
                        onChange={e => handleChange('address', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white transition-all hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 resize-none"
                        placeholder="Complete address"
                    />
                </div>

                {/* Compensation Section */}
                <div>
                    <h4 className="font-bold text-gray-800 text-sm mb-3 border-t pt-4 border-gray-100 flex items-center gap-2">
                        <span>💰</span> Compensation Structure
                    </h4>
                    <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-5">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Pay Type</label>
                            <CustomSelect
                                value={formData.compensation.payType}
                                onChange={(val) => handleChange('compensation.payType', val)}
                                options={PAY_TYPES}
                                placeholder="Select Type"
                                className="w-full"
                            />
                        </div>

                        <div className="col-span-4">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                {formData.compensation.payType === 'daily' ? 'Daily Rate' : 'Hourly Rate'}
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-sans">₱</span>
                                <input
                                    type="number"
                                    min="0"
                                    disabled={formData.compensation.payType === 'commission'}
                                    value={formData.compensation.rate === '' ? '' : Number(formData.compensation.rate).toString()}
                                    onChange={e => handleChange('compensation.rate', handleNumberInput(e.target.value))}
                                    className={`w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white transition-all focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500
                                        ${formData.compensation.payType === 'commission' ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div className="col-span-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Commission</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.compensation.commission === '' ? '' : Number(formData.compensation.commission).toString()}
                                    onChange={e => handleChange('compensation.commission', handleNumberInput(e.target.value))}
                                    className="w-full pl-3 pr-7 py-2 border border-gray-200 rounded-lg text-sm bg-white transition-all hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 text-right"
                                    placeholder="0"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-sans">%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex gap-3 justify-end border-t border-gray-100 mt-6">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-6 py-2 bg-lime-500 text-white font-bold rounded-lg shadow-md hover:bg-lime-600 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                        {isSaving && <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />}
                        {isEditing ? 'Save Changes' : 'Create Employee'}
                    </button>
                </div>
            </form >
        </div >
    );
}
