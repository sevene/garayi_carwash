'use client';

import React, { useState, useEffect } from 'react';
import {
    PlusIcon,
    TrashIcon,
    BanknotesIcon,
    BuildingOffice2Icon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { useSettings } from '@/hooks/useSettings';
import CustomSelect from '@/components/ui/CustomSelect';
import CustomInput from '@/components/ui/CustomInput';

interface Expense {
    _id: string;
    description: string;
    amount: number;
    category: string;
    date: string;
    notes?: string;
    type: 'opex' | 'capex';
}

export default function ExpensesPage() {
    const { formatCurrency } = useSettings();

    // View State
    const [viewData, setViewData] = useState<'opex' | 'capex'>('opex');

    // Data State
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form State
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        category: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: ''
    });

    const OPEX_CATEGORIES = ['Rent', 'Utilities', 'Supplies', 'Maintenance', 'Salary', 'Marketing', 'Other'];
    const CAPEX_CATEGORIES = ['Equipment', 'Renovation', 'Vehicles', 'Software', 'Furniture', 'Other'];

    const currentCategories = viewData === 'opex' ? OPEX_CATEGORIES : CAPEX_CATEGORIES;

    // --- Effects ---

    useEffect(() => {
        fetchExpenses();
        // Reset category when switching views
        setFormData(prev => ({
            ...prev,
            category: viewData === 'opex' ? 'Rent' : 'Equipment'
        }));
    }, [viewData]);

    // --- Actions ---

    const fetchExpenses = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/expenses?type=${viewData}`);
            if (res.ok) {
                const data = await res.json();
                setExpenses(data);
            }
        } catch (error) {
            console.error('Error fetching expenses:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                amount: parseFloat(formData.amount),
                type: viewData
            };

            const res = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                // Reset Form
                setFormData({
                    description: '',
                    amount: '',
                    category: viewData === 'opex' ? 'Rent' : 'Equipment',
                    date: format(new Date(), 'yyyy-MM-dd'),
                    notes: ''
                });
                fetchExpenses();
            }
        } catch (error) {
            console.error('Error saving expense:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this record?')) return;
        try {
            const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchExpenses();
            }
        } catch (error) {
            console.error('Error deleting expense:', error);
        }
    };


    return (
        <div className="space-y-6 animate-in fade-in duration-1000 lg:px-6 lg:pb-6">

            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage operating costs and capital investments.</p>
                </div>

                {/* Pill Toggle Style */}
                <div className="bg-gray-100 p-1.5 rounded-xl inline-flex self-start md:self-center">
                    <button
                        onClick={() => setViewData('opex')}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${viewData === 'opex'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                            }`}
                    >
                        OpEx
                    </button>
                    <button
                        onClick={() => setViewData('capex')}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${viewData === 'capex'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                            }`}
                    >
                        CapEx
                    </button>
                </div>
            </div>

            {/* Input Form Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
                <form onSubmit={handleSubmit}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${viewData === 'opex' ? 'bg-lime-100 text-lime-600' : 'bg-purple-100 text-purple-600'}`}>
                                {viewData === 'opex' ? <BanknotesIcon className="w-5 h-5" /> : <BuildingOffice2Icon className="w-5 h-5" />}
                            </div>
                            <h2 className="text-lg font-bold text-gray-900">
                                Record {viewData === 'opex' ? 'Operating Expense' : 'Capital Expenditure'}
                            </h2>
                        </div>

                        <button
                            type="submit"
                            className={`h-11 px-6 rounded-xl font-semibold text-white shadow-sm transition-all active:scale-95 flex items-center gap-2
                                ${viewData === 'opex'
                                    ? 'bg-lime-600 hover:bg-lime-700'
                                    : 'bg-purple-600 hover:bg-purple-700'
                                }`}
                        >
                            <PlusIcon className="w-5 h-5" />
                            Add Record
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
                        <div className="lg:col-span-1">
                            <CustomInput
                                label="Description"
                                name="description"
                                placeholder={viewData === 'opex' ? "e.g. Electricity Bill" : "e.g. New Equipment"}
                                required
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div>
                            <CustomSelect
                                label="Category"
                                name="category"
                                options={currentCategories.map(c => ({ value: c, label: c }))}
                                value={formData.category}
                                onChange={(val) => setFormData({ ...formData, category: val as string })}
                            />
                        </div>

                        <div>
                            <CustomInput
                                label="Amount"
                                name="amount"
                                type="number"
                                required
                                min={0}
                                step={0.01}
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                            />
                        </div>

                        <div>
                            <CustomInput
                                label="Date"
                                name="date"
                                type="date"
                                required
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="mt-5">
                        <CustomInput
                            label="Notes (Optional)"
                            name="notes"
                            multiline
                            placeholder="..."
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>
                </form>
            </div>

            {/* Data Table Section */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4 text-center">Category</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {expenses.map((expense) => (
                                <tr key={expense._id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                                        {format(new Date(expense.date), 'MMM dd, yyyy')}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-gray-800">
                                        {expense.description}
                                        {expense.notes && <p className="text-xs text-gray-400 font-normal mt-0.5">{expense.notes}</p>}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium border
                                            ${viewData === 'opex'
                                                ? 'bg-lime-50 text-lime-700 border-lime-100'
                                                : 'bg-purple-50 text-purple-700 border-purple-100'
                                            }`}>
                                            {expense.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                                        {formatCurrency(expense.amount)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleDelete(expense._id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {expenses.length === 0 && !isLoading && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-4 rounded-full bg-gray-50">
                                                {viewData === 'opex'
                                                    ? <BanknotesIcon className="w-8 h-8 opacity-20" />
                                                    : <BuildingOffice2Icon className="w-8 h-8 opacity-20" />
                                                }
                                            </div>
                                            <p className="font-medium">No {viewData === 'opex' ? 'OpEx' : 'CapEx'} records found.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
