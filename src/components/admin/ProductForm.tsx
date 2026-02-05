'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CubeIcon, CurrencyDollarIcon, TagIcon, ArchiveBoxIcon, PhotoIcon, BeakerIcon, BanknotesIcon, ScaleIcon } from '@heroicons/react/24/outline';
import { Product } from '@/lib/products';
import CustomSelect from '@/components/ui/CustomSelect';
import CustomInput from '@/components/ui/CustomInput';
import { flattenCategories } from '@/lib/categories';
import { useSettings } from '@/hooks/useSettings';
import { handleNumberInput } from '@/components/utils/inputHelpers';

interface ProductFormProps {
    initialProduct?: Product | null;
    categories: any[];
    id?: string; // Add optional ID prop
}

interface ProductFormState extends Omit<Product, 'stock'> {
    stock: number | string;
    showInPOS: boolean;
    soldBy: 'piece' | 'weight/volume';
}

const emptyProduct: ProductFormState = {
    _id: '',
    name: '',
    volume: '',
    price: '',
    cost: '',
    category: '',
    stock: '',
    sku: '',
    image: '',
    showInPOS: true,
    soldBy: 'piece',
};

export default function ProductForm({ initialProduct, categories = [], id }: ProductFormProps) {
    const { settings } = useSettings();
    const currencySymbol = settings?.currency === 'USD' ? '$' : settings?.currency === 'EUR' ? '€' : '₱';
    const router = useRouter();
    const isEditMode = !!initialProduct && !!initialProduct._id;

    const [formData, setFormData] = useState<ProductFormState>(emptyProduct);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (initialProduct) {
            let categoryValue = '';

            if (initialProduct.category) {
                if (typeof initialProduct.category === 'string') {
                    categoryValue = initialProduct.category;
                } else if (typeof initialProduct.category === 'object' && (initialProduct.category as any)?._id) {
                    categoryValue = (initialProduct.category as any)._id;
                }
            }

            setFormData({
                ...emptyProduct, // Ensure all fields exist
                ...initialProduct,
                category: categoryValue,
                stock: initialProduct.stock ?? '',
                showInPOS: initialProduct.showInPOS ?? true,
                soldBy: initialProduct.soldBy ?? 'piece',
            });
        }
    }, [initialProduct]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        // Apply number cleaning if input type is number
        const finalValue = type === 'number' ? handleNumberInput(value) : value;

        setFormData(prev => {
            const updated = {
                ...prev,
                [name]: type === 'checkbox' ? checked : finalValue,
            };

            // Automatic Cost Calculation Logic
            // Logic: If we are in 'weight/volume' mode, we often want to track Cost as "Price per Unit Volume" or similar?
            // User Request: "It should suppose to change the value in the Cost"
            // Interpretation: When I enter Price 100 and Volume 200ml, Cost should approximate unit cost?
            // OR: Cost should default to Price if it's 0?
            // The existing logic was: Cost = Price / Volume.
            // Example: Price 2000, Volume 2000 (ml). Cost = 1.

            if (name === 'price' || name === 'volume' || name === 'soldBy') {
                const price = parseFloat(updated.price.toString());

                if (updated.soldBy === 'piece') {
                    // For piece, usually Cost is entred manually, but user asked:
                    // "if user selected Piece, then it should just get the Price"
                    // This implies Cost = Price? Or just that the fancy calculation is skipped?
                    // "it should just get the Price" likely means Cost field should be auto-filled with Price?
                    // Let's assume Cost = Price for now based on request phrasing.
                    if (!isNaN(price)) {
                        updated.cost = price.toFixed(4);
                    }
                } else if (updated.soldBy === 'weight/volume') {
                    // Extract numeric value from volume string (e.g., "250ml" -> 250)
                    const volumeStr = updated.volume.toString().trim();
                    const volumeMatch = volumeStr.match(/^(\d+(\.\d+)?)/);
                    const volume = volumeMatch ? parseFloat(volumeMatch[0]) : 0;



                    if (!isNaN(price) && !isNaN(volume) && volume > 0) {
                        updated.cost = (price / volume).toFixed(4); // High precision for unit cost
                    }
                }
            }

            return updated;
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;

        setIsSaving(true);
        setError(null);

        try {
            const method = isEditMode ? 'PUT' : 'POST';
            const endpoint = isEditMode
                ? `/api/products/${formData._id}`
                : '/api/products';

            const { _id, ...rest } = formData;

            // Convert numeric fields to numbers for the API
            const payload = {
                ...rest,
                // Send as strings to preserve precision for Decimal128
                price: String(rest.price || 0),
                // Enforce exactly 4 decimal places for cost
                cost: parseFloat(String(rest.cost || 0)).toFixed(4),
                stock: (rest.stock === '' || rest.stock === undefined || rest.stock === null) ? 0 : Number(rest.stock),
            };

            const response = await fetch(endpoint, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Server error' })) as { details?: string; message?: string };
                const errorMessage = errorData.details || errorData.message || `Failed with status ${response.status}`;
                throw new Error(errorMessage);
            }

            router.push('/admin/products');
            router.refresh();

        } catch (err: unknown) {
            console.error("Product Save Error:", err);
            let errorMessage = "An unknown error occurred while saving.";

            if (err instanceof Error) {
                errorMessage = err.message;
            }
            setError(errorMessage);
            setIsSaving(false);
        }
    };

    return (
        <form id={id} onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border border-gray-100 p-6 space-y-6">

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
                    </svg>
                    {error}
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Main Content Column (75%) */}
                <div className="flex-1 space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                        {/* Name */}
                        <label className="block">
                            <CustomInput
                                label="Name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g. Latte"
                                required
                            />
                        </label>


                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <label className="block">
                            <CustomInput
                                label="SKU"
                                name="sku"
                                value={formData.sku}
                                onChange={handleChange}
                                placeholder="e.g. COF-LT-01"
                            />
                        </label>
                        {/* Category */}
                        <div>
                            <CustomSelect
                                label="Category"
                                value={formData.category} // Ensure this matches CustomSelect's expected value type
                                onChange={(val) => setFormData(prev => ({ ...prev, category: String(val) }))}
                                options={flattenCategories(categories).map(c => ({
                                    label: c.label,
                                    value: c.value
                                }))}
                                placeholder="Select a category..."
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Price */}
                        <label className="block">
                            <span className="text-xs font-medium text-gray-700 flex items-center gap-2 mb-1.5">
                                <CurrencyDollarIcon className="w-4 h-4 text-gray-500" /> Price *
                            </span>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{currencySymbol}</span>
                                <input
                                    type="number"
                                    name="price"
                                    value={formData.price === '' ? '' : Number(formData.price).toString()}
                                    onChange={handleChange}
                                    min="0.00"
                                    step="0.01"
                                    className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 transition outline-none"
                                />
                            </div>
                        </label>

                        <label className="block">
                            <CustomInput
                                label="Volume / Weight"
                                name="volume"
                                value={formData.volume}
                                onChange={handleChange}
                                placeholder="e.g. 250ml"
                            />
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Sold By */}
                        <label className="block">
                            <CustomSelect
                                label="Sold By"
                                value={formData.soldBy}
                                onChange={(val) => {
                                    // Create a synthetic event that mimics a standard input change
                                    const syntheticEvent = {
                                        target: {
                                            name: 'soldBy',
                                            value: val,
                                            type: 'select-one',
                                            checked: false
                                        }
                                    } as React.ChangeEvent<HTMLInputElement>;
                                    handleChange(syntheticEvent);
                                }}
                                options={[
                                    { label: 'Piece (Count)', value: 'piece' },
                                    { label: 'Weight / Volume', value: 'weight/volume' }
                                ]}
                            />
                        </label>

                        {/* Cost */}
                        <label className="block">
                            <span className="text-xs font-medium text-gray-700 flex items-center gap-2 mb-1.5">
                                <BanknotesIcon className="w-4 h-4 text-gray-500" /> Cost *
                            </span>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{currencySymbol}</span>
                                <input
                                    type="number"
                                    name="cost"
                                    value={formData.cost === '' ? '' : Number(formData.cost).toString()}
                                    onChange={handleChange}
                                    min="0.00"
                                    step="0.0001"
                                    className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 transition outline-none"
                                />
                            </div>
                        </label>
                    </div>

                    <div className="flex items-end gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        {/* Stock */}
                        <label className="block flex-1">
                            <span className="text-xs font-medium text-gray-700 flex items-center gap-2 mb-1.5">
                                <ArchiveBoxIcon className="w-4 h-4 text-gray-500" /> Stock
                            </span>
                            <input
                                type="number"
                                name="stock"
                                value={formData.stock ?? ''}
                                readOnly
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-500 cursor-not-allowed outline-none"
                            />
                        </label>
                        <Link
                            href="/admin/inventory"
                            className="mb-px px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition shadow-sm whitespace-nowrap"
                        >
                            Manage Inventory
                        </Link>
                    </div>

                    {/* Show in POS Toggle */}
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input
                                type="checkbox"
                                name="showInPOS"
                                id="showInPOS"
                                checked={formData.showInPOS}
                                onChange={handleChange}
                                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-full checked:border-lime-500"
                                style={{ top: '2px', left: '2px' }}
                            />
                            <label
                                htmlFor="showInPOS"
                                className={`toggle-label block overflow-hidden h-7 rounded-full cursor-pointer transition-colors duration-200 ${formData.showInPOS ? 'bg-lime-500' : 'bg-gray-300'}`}
                            ></label>
                        </div>
                        <label htmlFor="showInPOS" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                            Show in POS System
                            <span className="block text-xs text-gray-500 font-normal mt-0.5">
                                If disabled, this product will be hidden from the Point of Sale interface.
                            </span>
                        </label>
                    </div>
                </div>

                {/* Sidebar Column (25%) - Image */}
                <div className="w-full lg:w-1/4 space-y-4">
                    <label className="block">
                        <span className="text-xs font-medium text-gray-700 flex items-center gap-2 mb-1.5">
                            <PhotoIcon className="w-4 h-4 text-gray-500" /> Product Image
                        </span>

                        {/* Image Preview Box */}
                        <div className="w-full aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center overflow-hidden mb-3 relative group">
                            {formData.image ? (
                                <>
                                    <img
                                        src={formData.image}
                                        alt="Product Preview"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=Invalid+Image+URL';
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">Preview</span>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center p-4 text-gray-400">
                                    <PhotoIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <span className="text-xs">No image URL provided</span>
                                </div>
                            )}
                        </div>

                        <CustomInput
                            name="image"
                            value={formData.image}
                            onChange={handleChange}
                            placeholder="https://example.com/image.jpg"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">
                            Paste a direct link to an image (JPG, PNG, WebP).
                        </p>
                    </label>
                </div>
            </div>

            {/* Actions - Only show if no ID is provided (meaning not controlled by StickyHeader) */}
            {!id && (
                <div className="pt-6 flex justify-end gap-3 border-t border-gray-100 mt-6">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-5 py-2.5 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-800 transition font-medium"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className={`px-6 py-2.5 text-white font-semibold rounded-lg shadow-sm transition-all
                            ${isSaving
                                ? 'bg-lime-500 cursor-not-allowed'
                                : 'bg-lime-500 hover:bg-lime-600 hover:shadow-md active:transform active:scale-95'}`}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : (isEditMode ? 'Update Product' : 'Create Product')}
                    </button>
                </div>
            )}
        </form>
    );
}
