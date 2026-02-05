'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
    PlusIcon,
    MagnifyingGlassIcon,
    PencilSquareIcon,
    TrashIcon,
    PhotoIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { Product } from '@/lib/products';
import { useSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';
import PageHeader from '@/components/admin/PageHeader';

const MOCK_PRODUCTS: Product[] = [
    { _id: '1', name: 'Espresso', price: 120, cost: 80, volume: '30ml', category: 'Coffee', stock: 50, sku: 'COF-001', image: '', showInPOS: true },
    { _id: '2', name: 'Caramel Macchiato', price: 180, cost: 120, volume: '250ml', category: 'Coffee', stock: 12, sku: 'COF-002', image: '', showInPOS: true },
    { _id: '3', name: 'Croissant', price: 85, cost: 40, volume: '1pc', category: 'Pastry', stock: 5, sku: 'PAS-001', image: '', showInPOS: true },
    { _id: '4', name: 'Iced Tea', price: 90, cost: 30, volume: '350ml', category: 'Beverage', stock: 100, sku: 'BEV-001', image: '', showInPOS: true },
];

export default function AdminProductsPage() {
    const { formatCurrency, settings } = useSettings();
    const currencySymbol = settings?.currency === 'USD' ? '$' : settings?.currency === 'EUR' ? '€' : '₱';
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [categories, setCategories] = useState<any[]>([]);

    const fetchProducts = useCallback(async () => {
        try {
            setIsLoading(true);

            const resProducts = await fetch('/api/products');
            if (resProducts.ok) {
                const data = await resProducts.json() as Product[];
                setProducts(data);
            } else {
                console.warn(`API fetch failed (Status: ${resProducts.status}), using mock data`);
                setProducts(MOCK_PRODUCTS);
            }

            const resCategories = await fetch('/api/categories');
            if (resCategories.ok) {
                const data = await resCategories.json() as any[];
                setCategories(data);
            }
        } catch (error) {
            console.error("Failed to load data.", error);
            setProducts(MOCK_PRODUCTS);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) return;

        try {
            const response = await fetch(`/api/products/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({ message: 'Server error during deletion' })) as { message?: string };
                throw new Error(errorBody.message || `Deletion failed with status ${response.status}`);
            }

            setProducts(prev => prev.filter(p => p._id !== id));
            toast.success(`Product "${name}" successfully deleted.`);
        } catch (error: unknown) {
            console.error("Product Delete Error:", error);
            let errorMessage = "An unknown error occurred.";
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            toast.error(`Error deleting product: ${errorMessage}`);
        }
    };

    const handleTogglePos = async (product: Product) => {
        const newStatus = !product.showInPOS;

        // Optimistic update
        setProducts(prev => prev.map(p =>
            p._id === product._id ? { ...p, showInPOS: newStatus } : p
        ));

        try {
            const response = await fetch(`/api/products/${product._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ showInPOS: newStatus }),
            });

            if (!response.ok) {
                throw new Error('Failed to update status');
            }

            // Re-fetch to ensure server state is synced
            fetchProducts();
            toast.success("Product visibility updated.");
        } catch (error) {
            console.error("Error updating POS status:", error);
            // Revert on error
            setProducts(prev => prev.map(p =>
                p._id === product._id ? { ...p, showInPOS: !newStatus } : p
            ));
            toast.error("Failed to update product status. Please try again.");
        }
    };

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-1000 lg:px-6 lg:pb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <PageHeader
                    title="Products"
                    description="Manage your inventory and pricing"
                />
                <Link
                    href="/admin/products/new"
                    className="flex items-center gap-2 bg-lime-500 text-white px-4 py-2 rounded-lg hover:bg-lime-600 transition hover:shadow-md hover:shadow-lime-200"
                >
                    <PlusIcon className="w-5 h-5" />
                    <span>Add Product</span>
                </Link>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        name="searchProducts"
                        placeholder="Search by name or SKU..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                </div>
                <select name="filterCategory" className="border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-green-500 outline-none bg-white">
                    <option value="all">All Categories</option>
                    {categories.map((cat) => (
                        <option key={cat._id} value={cat.name}>{cat.name}</option>
                    ))}
                </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4 text-center">SKU</th>
                                <th className="px-6 py-4 text-center">Category</th>
                                <th className="px-6 py-4 text-center">Price</th>
                                <th className="px-6 py-4 text-center">Cost</th>
                                <th className="px-6 py-4 text-center">Stock</th>
                                <th className="px-6 py-4 text-center">Show in POS</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                        Loading inventory...
                                    </td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                        No products found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((product) => (
                                    <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 overflow-hidden shrink-0">
                                                    {product.image ? (
                                                        <Image
                                                            src={product.image}
                                                            alt={product.name}
                                                            width={40}
                                                            height={40}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <PhotoIcon className="w-5 h-5" />
                                                    )}
                                                </div>
                                                <span className="font-medium text-gray-900">{product.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-center text-gray-500 font-mono">
                                            {product.sku || '—'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-center text-gray-600">
                                            <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
                                                {typeof product.category === 'object' && product.category !== null
                                                    ? (product.category as any).name
                                                    : product.category || 'Uncategorized'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-medium text-gray-900">
                                            {formatCurrency(Number(product.price))}
                                        </td>
                                        <td className="px-6 py-4 text-center font-medium text-gray-900">
                                            {currencySymbol}{Number(product.cost).toFixed(4)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                            ${(product.stock || 0) > 10
                                                    ? 'bg-green-100 text-green-800'
                                                    : (product.stock || 0) > 0
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-red-100 text-red-800'}`}>
                                                {product.stock || 0} in stock
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center">
                                                <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
                                                    <input
                                                        type="checkbox"
                                                        name={`toggle-${product._id}`}
                                                        id={`toggle-${product._id}`}
                                                        checked={product.showInPOS !== false}
                                                        onChange={() => handleTogglePos(product)}
                                                        className="toggle-checkbox absolute block w-3 h-3 rounded-full bg-white border appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-full checked:border-lime-500"
                                                        style={{ top: '2px', left: '2px' }}
                                                    />
                                                    <label
                                                        htmlFor={`toggle-${product._id}`}
                                                        className={`toggle-label block overflow-hidden w-7 h-4 rounded-full cursor-pointer transition-colors duration-200 ${product.showInPOS !== false ? 'bg-lime-500' : 'bg-gray-300'}`}
                                                    ></label>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <Link
                                                    href={`/admin/products/${product._id}`}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition"
                                                    title="Edit Product"
                                                >
                                                    <PencilSquareIcon className="w-5 h-5" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(product._id, product.name)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition"
                                                    title="Delete Product"
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

                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
                    <span>Showing {filteredProducts.length} results</span>
                </div>
            </div>
        </div>
    );
}
