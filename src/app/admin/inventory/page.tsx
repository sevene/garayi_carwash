'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
    MagnifyingGlassIcon,
    PhotoIcon,
    CheckIcon,
    ArrowPathIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { Product } from '@/lib/products';
import CustomSelect from '@/components/ui/CustomSelect';
import { toast } from 'sonner';
import PageHeader from '@/components/admin/PageHeader';

const ADJUSTMENT_REASONS = [
    'Manual Adjustment',
    'Restock / Purchase',
    'Damage / Spoilage',
    'Theft / Loss',
    'Inventory Correction',
    'Return from Customer',
    'Internal Use / Promo'
];

export default function InventoryPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [stockUpdates, setStockUpdates] = useState<{ [key: string]: number | string }>({});
    const [thresholdUpdates, setThresholdUpdates] = useState<{ [key: string]: number | string }>({});
    const [adjustmentReasons, setAdjustmentReasons] = useState<{ [key: string]: string }>({});
    const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
    const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());

    const fetchProducts = useCallback(async () => {
        try {
            setIsLoading(true);

            const res = await fetch('/api/products');
            if (res.ok) {
                const data = await res.json() as Product[];
                setProducts(data);
            }
        } catch (error) {
            console.error("Failed to load inventory.", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleStockChange = (id: string, value: string) => {
        // Remove leading zeros if the value is not just "0"
        if (value.length > 1 && value.startsWith('0')) {
            value = value.replace(/^0+/, '');
        }

        if (value === '') {
            setStockUpdates(prev => ({ ...prev, [id]: '' }));
        } else {
            const numValue = parseInt(value);
            if (!isNaN(numValue) && numValue >= 0) {
                setStockUpdates(prev => ({ ...prev, [id]: numValue }));
            }
        }
    };

    const handleThresholdChange = (id: string, value: string) => {
        if (value.length > 1 && value.startsWith('0')) {
            value = value.replace(/^0+/, '');
        }

        if (value === '') {
            setThresholdUpdates(prev => ({ ...prev, [id]: '' }));
        } else {
            const numValue = parseInt(value);
            if (!isNaN(numValue) && numValue >= 0) {
                setThresholdUpdates(prev => ({ ...prev, [id]: numValue }));
            }
        }
    };

    const handleReasonChange = (id: string, reason: string) => {
        setAdjustmentReasons(prev => ({ ...prev, [id]: reason }));
        setValidationErrors(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    const handleCancel = (id: string) => {
        setStockUpdates(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        setThresholdUpdates(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        setAdjustmentReasons(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        setValidationErrors(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    const handleSaveChanges = async (product: Product) => {
        let stockVal = stockUpdates[product._id];
        let thresholdVal = thresholdUpdates[product._id];

        // Treat empty strings as 0 (or keep original? logic implies explicit change)
        // If undefined, it wasn't changed.

        const updates: any = {};
        let stockChanged = false;

        if (stockVal !== undefined) {
            if (stockVal === '') stockVal = 0;
            if (stockVal !== product.stock) {
                updates.stock = stockVal;
                stockChanged = true;
            }
        }

        if (thresholdVal !== undefined) {
            if (thresholdVal === '') thresholdVal = 0;
            if (thresholdVal !== product.threshold) {
                updates.threshold = thresholdVal;
            }
        }

        if (Object.keys(updates).length === 0) {
            handleCancel(product._id);
            return;
        }

        // Only require reason if STOCK changed
        const reason = adjustmentReasons[product._id];
        if (stockChanged && !reason) {
            setValidationErrors(prev => new Set(prev).add(product._id));
            toast.error("Please select an adjustment reason for stock change.");
            return;
        }

        if (stockChanged) {
            updates.reason = reason;
        }

        setUpdatingIds(prev => new Set(prev).add(product._id));

        try {
            const response = await fetch(`/api/products/${product._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });

            if (!response.ok) throw new Error('Failed to update product');

            // Update local state
            setProducts(prev => prev.map(p =>
                p._id === product._id ? { ...p, ...updates, stock: updates.stock ?? p.stock, threshold: updates.threshold ?? p.threshold } : p
            ));

            handleCancel(product._id); // Clear all temporary states
            toast.success("Product updated successfully");

        } catch (error) {
            console.error("Error updating product:", error);
            toast.error("Failed to update product. Please try again.");
        } finally {
            setUpdatingIds(prev => {
                const next = new Set(prev);
                next.delete(product._id);
                return next;
            });
        }
    };

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-1000 lg:px-6 lg:pb-6">
            <PageHeader
                title="Inventory Management"
                description="Manage your inventory and pricing"
            />

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="relative">
                    <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        name='inventorySearch'
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 outline-none"
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div>
                    <table className="min-w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                                <th className="px-6 py-4 rounded-tl-xl">Product</th>
                                <th className="px-6 py-4 text-center">SKU</th>
                                <th className="px-6 py-4 text-center">Current Stock</th>
                                <th className="px-6 py-4 text-center">Threshold</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Reason</th>
                                <th className="px-6 py-4 text-center rounded-tr-xl">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No products found.</td></tr>
                            ) : (
                                filteredProducts.map((product) => {
                                    const currentStock = stockUpdates[product._id] ?? product.stock ?? 0;
                                    const currentThreshold = thresholdUpdates[product._id] ?? product.threshold ?? 10;

                                    const stockChanged = stockUpdates[product._id] !== undefined && stockUpdates[product._id] !== product.stock;
                                    const thresholdChanged = thresholdUpdates[product._id] !== undefined && thresholdUpdates[product._id] !== product.threshold;
                                    const isChanged = stockChanged || thresholdChanged;

                                    const isUpdating = updatingIds.has(product._id);

                                    const numStock = Number(currentStock);
                                    const numThreshold = Number(currentThreshold);

                                    return (
                                        <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 text-gray-400">
                                                        {product.image ? (
                                                            <Image src={product.image} alt={product.name} width={40} height={40} className="object-cover w-full h-full" />
                                                        ) : (
                                                            <PhotoIcon className="w-5 h-5" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900">{product.name}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {typeof product.category === 'object' && product.category !== null
                                                                ? (product.category as any).name
                                                                : product.category || 'Uncategorized'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm font-mono text-gray-500">
                                                {product.sku || '—'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <input
                                                    type="number"
                                                    name='currentStock'
                                                    min="0"
                                                    value={currentStock === '' ? '' : numStock.toString()}
                                                    onChange={(e) => handleStockChange(product._id, e.target.value)}
                                                    onFocus={(e) => e.target.select()}
                                                    className={`w-24 text-center border rounded-lg py-1.5 text-sm outline-none transition
                                                        ${stockChanged ? 'border-lime-500 ring-2 ring-lime-500/20 bg-lime-50' : 'border-gray-200 focus:border-lime-500'}`}
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <input
                                                    type="number"
                                                    name='threshold'
                                                    min="0"
                                                    value={currentThreshold === '' ? '' : numThreshold.toString()}
                                                    onChange={(e) => handleThresholdChange(product._id, e.target.value)}
                                                    onFocus={(e) => e.target.select()}
                                                    className={`w-20 text-center border rounded-lg py-1.5 text-sm outline-none transition
                                                        ${thresholdChanged ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50' : 'border-gray-200 focus:border-blue-500'}`}
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                    ${numStock > numThreshold ? 'bg-green-100 text-green-800' :
                                                        numStock > 0 ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-red-100 text-red-800'}`}>
                                                    {numStock > numThreshold ? 'In Stock' : numStock > 0 ? 'Low Stock' : 'Out of Stock'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {stockChanged ? (
                                                    <div className="w-full mx-auto">
                                                        <CustomSelect
                                                            options={ADJUSTMENT_REASONS.map(r => ({ label: r, value: r }))}
                                                            value={adjustmentReasons[product._id] || ''}
                                                            onChange={(val) => handleReasonChange(product._id, val as string)}
                                                            placeholder="Select Reason"
                                                            error={validationErrors.has(product._id)}
                                                        />
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">{isChanged ? '(No stock change)' : '—'}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center h-16">
                                                {isChanged && (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleCancel(product._id)}
                                                            disabled={isUpdating}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-400 text-sm font-medium rounded-md hover:bg-gray-200 hover:text-gray-600 transition"
                                                            title="Cancel"
                                                        >
                                                            <XMarkIcon className="w-4 h-4" />Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => handleSaveChanges(product)}
                                                            disabled={isUpdating}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-lime-500 text-white text-sm font-medium rounded-md hover:bg-lime-600 transition shadow-sm disabled:opacity-50"
                                                        >
                                                            {isUpdating ? (
                                                                <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <CheckIcon className="w-3.5 h-3.5" />
                                                            )}
                                                            Save
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
