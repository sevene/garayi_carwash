'use client';

import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import CustomSelect from '@/components/ui/CustomSelect';

export interface RoleFormData {
    _id?: string;
    name: string;
    displayName: string;
    permissions: string[];
    description: string;
    assignments?: string[];
}

interface RoleFormProps {
    formData: RoleFormData;
    setFormData: React.Dispatch<React.SetStateAction<RoleFormData>>;
    onSubmit: (e: React.FormEvent) => void;
    isEditing: boolean;
    isSaving: boolean;
    onCancel: () => void;
}

const PERMISSIONS_LIST = [
    { value: 'pos_access', label: 'POS Access' },
    { value: 'admin_dashboard', label: 'Admin Dashboard' },
    { value: 'manage_products', label: 'Manage Products' },
    { value: 'manage_inventory', label: 'Manage Inventory' },
    { value: 'manage_staff', label: 'Manage Staff' },
    { value: 'manage_customers', label: 'Manage Customers' },
    { value: 'view_reports', label: 'View Reports' },
    { value: 'settings_access', label: 'Settings Access' }
];

export default function RoleForm({
    formData,
    setFormData,
    onSubmit,
    isEditing,
    isSaving,
    onCancel
}: RoleFormProps) {

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const togglePermission = (perm: string) => {
        setFormData(prev => {
            const hasPerm = prev.permissions.includes(perm);
            if (hasPerm) {
                return { ...prev, permissions: prev.permissions.filter(p => p !== perm) };
            } else {
                return { ...prev, permissions: [...prev.permissions, perm] };
            }
        });
    };

    const toggleAssignment = (assign: string) => {
        setFormData(prev => {
            const current = prev.assignments || [];
            if (current.includes(assign)) {
                return { ...prev, assignments: current.filter(a => a !== assign) };
            } else {
                return { ...prev, assignments: [...current, assign] };
            }
        });
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-800 text-lg">
                    {isEditing ? 'Edit Role' : 'New Role'}
                </h3>
                <button
                    onClick={onCancel}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>
            </div>

            <form onSubmit={onSubmit} className="p-6 space-y-4">
                {/* Name & Display Name */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">System Name (ID)</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={e => handleChange('name', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white transition-all hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                            placeholder="e.g. senior_cashier"
                            disabled={isEditing && (formData.name === 'admin' || formData.name === 'staff')} // Protect core roles
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Display Name</label>
                        <input
                            type="text"
                            required
                            value={formData.displayName}
                            onChange={e => handleChange('displayName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white transition-all hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                            placeholder="e.g. Senior Cashier"
                        />
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                    <textarea
                        rows={2}
                        value={formData.description}
                        onChange={e => handleChange('description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white transition-all hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 resize-none"
                        placeholder="Brief description of responsibilities"
                    />
                </div>

                {/* Permissions */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Permissions</label>
                    <div className="grid grid-cols-2 gap-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
                        {PERMISSIONS_LIST.map(perm => (
                            <label key={perm.value} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-white rounded-lg transition-colors group">
                                <input
                                    type="checkbox"
                                    checked={formData.permissions.includes(perm.value)}
                                    onChange={() => togglePermission(perm.value)}
                                    className="w-4 h-4 text-lime-600 rounded border-gray-300 focus:ring-lime-500 cursor-pointer"
                                />
                                <span className="text-sm text-gray-700 font-medium group-hover:text-gray-900">{perm.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Assignments */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Assignments & Visibility</label>
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-2">
                        <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-blue-50 rounded-lg transition-colors">
                            <input
                                type="checkbox"
                                checked={formData.assignments?.includes('pos_crew')}
                                onChange={() => toggleAssignment('pos_crew')}
                                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                            />
                            <div>
                                <span className="block text-sm font-bold text-gray-900">Assignable Crew (POS)</span>
                                <span className="block text-xs text-gray-500">Allows employees with this role to be assigned to services/tickets in the POS.</span>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="pt-4 flex gap-3 justify-end">
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
                        {isEditing ? 'Save Role' : 'Create Role'}
                    </button>
                </div>
            </form>
        </div>
    );
}
