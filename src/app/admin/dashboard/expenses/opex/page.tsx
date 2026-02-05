'use client';

import React, { useState, useEffect } from 'react';
import {
    PlusIcon,
    TrashIcon,
    BanknotesIcon
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

export default function OpExPage() {
    const { formatCurrency } = useSettings();

    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        category: 'Other',
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: ''
    });

    const CATEGORIES = ['Rent', 'Utilities', 'Supplies', 'Maintenance', 'Salary', 'Marketing', 'Other'];

    // Fetch Expenses
    const fetchExpenses = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/expenses?type=opex');
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

    useEffect(() => {
        fetchExpenses();
    }, []);

    // Handle Delete
    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this expense?')) return;
        try {
            const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchExpenses();
            }
        } catch (error) {
            console.error('Error deleting expense:', error);
        }
    };

    // Handle Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                amount: parseFloat(formData.amount),
                type: 'opex'
            };

            const res = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setFormData({
                    description: '',
                    amount: '',
                    category: 'Other',
                    date: format(new Date(), 'yyyy-MM-dd'),
                    notes: ''
                });
                fetchExpenses();
            }
        } catch (error) {
            console.error('Error saving expense:', error);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Operating Expenses (OpEx)</h1>
                    <p className="text-gray-500 text-sm mt-1">Track day-to-day operational costs.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-lime-500 hover:bg-lime-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
                >
                    <PlusIcon className="w-5 h-5" />
                    Record OpEx
                </button>
            </div>

            {/* Content */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Description</th>
                                <th className="px-6 py-3">Category</th>
                                <th className="px-6 py-3 text-right">Amount</th>
                                <th className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {expenses.map((expense) => (
                                <tr key={expense._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-gray-600">
                                        {format(new Date(expense.date), 'MMM dd, yyyy')}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-800">
                                        {expense.description}
                                        {expense.notes && <p className="text-xs text-gray-400 font-normal">{expense.notes}</p>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-600 text-xs">
                                            {expense.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-red-600">
                                        - {formatCurrency(expense.amount)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => handleDelete(expense._id)}
                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {expenses.length === 0 && !isLoading && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <BanknotesIcon className="w-8 h-8 opacity-20" />
                                            <p>No OpEx records found.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Expense Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Record New OpEx</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <CustomInput
                                    label="Description"
                                    name='description'
                                    required
                                    placeholder="e.g. Electricity Bill"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <CustomInput
                                        label="Amount"
                                        name='amount'
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
                                        name='date'
                                        type="date"
                                        required
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <CustomSelect
                                    label="Category"
                                    name='category'
                                    options={CATEGORIES.map(cat => ({ value: cat, label: cat }))}
                                    value={formData.category}
                                    onChange={(value) => setFormData({ ...formData, category: value as string })}
                                />
                            </div>

                            <div>
                                <CustomInput
                                    label="Notes (Optional)"
                                    name='notes'
                                    multiline
                                    placeholder="Additional details..."
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-lime-500 hover:bg-lime-600 text-white rounded-lg shadow-sm"
                                >
                                    Save OpEx
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
