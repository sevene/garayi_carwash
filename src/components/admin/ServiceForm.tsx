'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    PlusIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { Service, ServiceProduct, calculateServiceCosts } from '@/lib/services';
import { Product } from '@/lib/products';
import CustomSelect from '@/components/ui/CustomSelect';
import CustomInput from '@/components/ui/CustomInput';
import { handleNumberInput } from '@/components/utils/inputHelpers';
import { flattenCategories } from '@/lib/categories';

import StickyHeader from '@/components/ui/StickyHeader';
import { useScrollState } from '@/hooks/useScrollState';
import { useSettings } from '@/hooks/useSettings';

import { Category } from '@/lib/categories';
import ProductRecipeEditor from './ProductRecipeEditor';

interface ServiceFormState extends Omit<Service, 'servicePrice' | 'laborCost' | 'durationMinutes' | 'products' | 'variants'> {
    servicePrice: number | string;
    laborCost: number | string;
    laborCostType: 'fixed' | 'percentage';
    durationMinutes: number | string;
    products: (Omit<ServiceProduct, 'quantity'> & { quantity: number | string })[];
    variants: {
        name: string;
        price: number | string;
        products: (Omit<ServiceProduct, 'quantity'> & { quantity: number | string })[];
    }[];
}

const EMPTY_SERVICE: ServiceFormState = {
    _id: '',
    name: '',
    description: '',
    category: null,
    products: [],
    servicePrice: '',
    laborCost: '',
    laborCostType: 'fixed',
    durationMinutes: '',
    active: true,
    variants: [],
};

interface ServiceFormProps {
    initialData?: Service;
    isEditing?: boolean;
}



export default function ServiceForm({ initialData, isEditing = false }: ServiceFormProps) {
    const { formatCurrency, settings } = useSettings();
    const currencySymbol = settings?.currency === 'USD' ? '$' : settings?.currency === 'EUR' ? '€' : '₱';
    const router = useRouter();
    const [formData, setFormData] = useState<ServiceFormState>(initialData ? {
        ...initialData,
        servicePrice: initialData.servicePrice,
        laborCost: initialData.laborCost,
        laborCostType: initialData.laborCostType || 'fixed',
        durationMinutes: initialData.durationMinutes ?? '',
        products: initialData.products.map(p => ({ ...p, quantity: p.quantity })),
        variants: initialData.variants?.map(v => ({
            ...v,
            price: v.price,
            products: v.products?.map(p => ({ ...p, quantity: p.quantity })) || []
        })) || []
    } : EMPTY_SERVICE);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isScrolled = useScrollState();

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                servicePrice: initialData.servicePrice,
                laborCost: initialData.laborCost,
                laborCostType: initialData.laborCostType || 'fixed',
                durationMinutes: initialData.durationMinutes ?? '',
                products: initialData.products.map(p => ({ ...p, quantity: p.quantity })),
                variants: initialData.variants?.map(v => ({
                    ...v,
                    price: v.price,
                    products: v.products?.map(p => ({ ...p, quantity: p.quantity })) || []
                })) || []
            });
        }
    }, [initialData]);

    useEffect(() => {
        const fetchDependencies = async () => {
            try {
                // Fetch products
                const resProducts = await fetch('/api/products');
                if (resProducts.ok) {
                    const data = await resProducts.json() as Product[];
                    setProducts(data);
                }

                // Fetch categories
                const resCategories = await fetch('/api/categories');
                if (resCategories.ok) {
                    const data = await resCategories.json() as Category[];
                    setCategories(data);
                }
            } catch (err) {
                console.error("Failed to fetch dependencies", err);
            }
        };

        fetchDependencies();
    }, [isEditing]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        // Apply number cleaning if input type is number
        const finalValue = type === 'number' ? handleNumberInput(value) : value;
        setFormData(prev => ({
            ...prev,
            [name]: finalValue
        }));
    };

    // --- Main Service Product Handlers ---

    const addProduct = () => {
        if (!formData.products) {
            setFormData(prev => ({ ...prev, products: [] }));
        }
        setFormData(prev => ({
            ...prev,
            products: [...(prev.products || []), {
                productId: '',
                quantity: '',
                productName: '',
                unitCost: 0,
                soldBy: 'quantity'
            }]
        }));
    };

    const removeProduct = (index: number) => {
        setFormData(prev => ({
            ...prev,
            products: prev.products.filter((_, i) => i !== index)
        }));
    };

    const updateProduct = (index: number, field: keyof ServiceProduct, value: any) => {
        setFormData(prev => {
            const updated = [...prev.products];
            const currentItem = updated[index];

            if (field === 'productId') {
                const product = products.find(p => p._id === value);
                if (product) {
                    const isVolume = currentItem.soldBy === 'volume';
                    const newUnitCost = isVolume ? Number(product.cost || 0) : Number(product.price || 0);

                    updated[index] = {
                        ...currentItem,
                        productId: value,
                        productName: product.name,
                        unitCost: newUnitCost
                    };
                }
            } else if (field === 'soldBy') {
                const product = products.find(p => p._id === currentItem.productId);
                let newUnitCost = currentItem.unitCost;

                if (product) {
                    if (value === 'volume') {
                        newUnitCost = Number(product.cost || 0);
                    } else {
                        newUnitCost = Number(product.price || 0);
                    }
                }

                updated[index] = {
                    ...currentItem,
                    soldBy: value,
                    unitCost: newUnitCost
                };
            } else {
                updated[index] = { ...currentItem, [field]: value };
            }
            return { ...prev, products: updated };
        });
    };

    // --- Variant Handlers ---

    const addVariant = () => {
        setFormData(prev => {
            // If this is the first variant, move existing products to it
            const initialProducts = (prev.variants.length === 0 && prev.products.length > 0)
                ? [...prev.products]
                : [];

            // If we moved products, clear the main products
            const newMainProducts = (prev.variants.length === 0 && prev.products.length > 0)
                ? []
                : prev.products;

            return {
                ...prev,
                products: newMainProducts,
                variants: [...(prev.variants || []), {
                    name: '',
                    price: 0,
                    products: initialProducts
                }]
            };
        });
    };

    const removeVariant = (index: number) => {
        setFormData(prev => ({
            ...prev,
            variants: (prev.variants || []).filter((_, i) => i !== index)
        }));
    };

    const updateVariant = (index: number, field: 'name' | 'price', value: any) => {
        setFormData(prev => {
            const updated = [...(prev.variants || [])];
            // @ts-ignore
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, variants: updated };
        });
    };

    // --- Variant Product Handlers ---

    const addVariantProduct = (variantIndex: number) => {
        setFormData(prev => {
            const updatedVariants = [...prev.variants];
            const variant = updatedVariants[variantIndex];
            updatedVariants[variantIndex] = {
                ...variant,
                products: [...(variant.products || []), {
                    productId: '',
                    quantity: '',
                    productName: '',
                    unitCost: 0,
                    soldBy: 'quantity'
                }]
            };
            return { ...prev, variants: updatedVariants };
        });
    };

    const removeVariantProduct = (variantIndex: number, productIndex: number) => {
        setFormData(prev => {
            const updatedVariants = [...prev.variants];
            const variant = updatedVariants[variantIndex];
            updatedVariants[variantIndex] = {
                ...variant,
                products: variant.products.filter((_, i) => i !== productIndex)
            };
            return { ...prev, variants: updatedVariants };
        });
    };

    const updateVariantProduct = (variantIndex: number, productIndex: number, field: keyof ServiceProduct, value: any) => {
        setFormData(prev => {
            const updatedVariants = [...prev.variants];
            const variant = updatedVariants[variantIndex];
            const updatedProducts = [...variant.products];
            const currentItem = updatedProducts[productIndex];

            if (field === 'productId') {
                const product = products.find(p => p._id === value);
                if (product) {
                    const isVolume = currentItem.soldBy === 'volume';
                    const newUnitCost = isVolume ? Number(product.cost || 0) : Number(product.price || 0);

                    updatedProducts[productIndex] = {
                        ...currentItem,
                        productId: value,
                        productName: product.name,
                        unitCost: newUnitCost
                    };
                }
            } else if (field === 'soldBy') {
                const product = products.find(p => p._id === currentItem.productId);
                let newUnitCost = currentItem.unitCost;

                if (product) {
                    if (value === 'volume') {
                        newUnitCost = Number(product.cost || 0);
                    } else {
                        newUnitCost = Number(product.price || 0);
                    }
                }

                updatedProducts[productIndex] = {
                    ...currentItem,
                    soldBy: value,
                    unitCost: newUnitCost
                };
            } else {
                updatedProducts[productIndex] = { ...currentItem, [field]: value };
            }

            updatedVariants[variantIndex] = {
                ...variant,
                products: updatedProducts
            };
            return { ...prev, variants: updatedVariants };
        });
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;
        setIsSaving(true);
        setError(null);

        try {
            const method = isEditing ? 'PUT' : 'POST';
            const endpoint = isEditing
                ? `/api/services/${formData._id}`
                : '/api/services';

            const { _id, createdAt, updatedAt, ...rest } = formData as any;

            const payload = {
                ...rest,
                servicePrice: rest.servicePrice === '' ? 0 : Number(rest.servicePrice),
                laborCost: rest.laborCost === '' ? 0 : Number(rest.laborCost),
                laborCostType: rest.laborCostType,
                durationMinutes: rest.durationMinutes === '' ? 0 : Number(rest.durationMinutes),
                products: rest.products.map((p: any) => ({
                    ...p,
                    quantity: Number(p.quantity)
                })),
                variants: rest.variants?.map((v: any) => ({
                    name: v.name,
                    price: Number(v.price),
                    products: v.products?.map((p: any) => ({
                        ...p,
                        quantity: Number(p.quantity)
                    })) || []
                })) || []
            };

            if ('__v' in payload) delete payload.__v;



            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed to save");

            router.push('/admin/services');
            router.refresh();
        } catch (err) {
            console.error(err);
            setError("Failed to save service. Please try again.");
            setIsSaving(false);
        }
    };

    // Create a temporary object with numbers for cost calculation
    const numericFormData: Service = {
        ...formData,
        servicePrice: Number(formData.servicePrice),
        laborCost: Number(formData.laborCost),
        laborCostType: formData.laborCostType,
        durationMinutes: formData.durationMinutes === '' ? 0 : Number(formData.durationMinutes),
        products: formData.products.map(p => ({
            ...p,
            quantity: Number(p.quantity)
        }))
    } as Service;

    const costs = calculateServiceCosts(numericFormData);
    const hasVariants = formData.variants && formData.variants.length > 0;

    return (
        <>
            <StickyHeader
                title={isEditing ? 'Edit Service' : 'Create New Service'}
                isScrolled={isScrolled}
                formId="service-form"
                saveLabel={isEditing ? 'Update Service' : 'Create Service'}
                isSaving={isSaving}
            />

            <div className="flex flex-col lg:flex-row gap-8 items-start relative">
                <div className="flex-1 min-w-0">
                    <div className="bg-white rounded-xl shadow-md border border-white">
                        <form id="service-form" onSubmit={handleSubmit} className="p-6 space-y-6">
                            {error && (
                                <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
                                    {error}
                                </div>
                            )}

                            {/* Basic Info Section */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <div className="relative z-0 w-full group">
                                            <CustomInput
                                                label="Service Name"
                                                name="name"
                                                id="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <CustomSelect
                                            label="Category"
                                            value={formData.category}
                                            onChange={(val) => setFormData(prev => ({ ...prev, category: String(val) }))}
                                            options={flattenCategories(categories).map(c => ({
                                                label: c.label,
                                                value: c.value
                                            }))}
                                            placeholder="Select a category..."
                                        />
                                    </div>

                                    <div>
                                        <CustomInput
                                            label="Duration (minutes)"
                                            type="number"
                                            name="durationMinutes"
                                            value={formData.durationMinutes === '' ? '' : Number(formData.durationMinutes).toString()}
                                            onChange={handleChange}
                                            min="0"
                                            placeholder="e.g. 60"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Visibility</label>
                                        <div className="flex items-center gap-3 h-[38px]">
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, showInPOS: !(prev.showInPOS ?? true) }))}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 ${(formData.showInPOS ?? true) ? 'bg-lime-500' : 'bg-gray-200'
                                                    }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${(formData.showInPOS ?? true) ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                />
                                            </button>
                                            <span className="text-sm text-gray-700">Show in POS</span>
                                        </div>
                                    </div>

                                    <div className="md:col-span-2">
                                        <CustomInput
                                            label="Description"
                                            name="description"
                                            value={formData.description || ''}
                                            onChange={handleChange}
                                            multiline
                                            rows={3}
                                            placeholder="Describe the service..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Pricing Section */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-300 pb-2">Pricing & Costs</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <CustomInput
                                            label={`Service Price (${currencySymbol}) *`}
                                            type="number"
                                            name="servicePrice"
                                            value={formData.servicePrice === '' ? '' : Number(formData.servicePrice).toString()}
                                            onChange={handleChange}
                                            min="0"
                                            step="0.01"
                                            disabled={hasVariants}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Labor Cost *</label>
                                        <div className="flex gap-2">
                                            <div className="w-1/2">
                                                <CustomSelect
                                                    value={formData.laborCostType}
                                                    onChange={(val) => setFormData(prev => ({ ...prev, laborCostType: val as 'fixed' | 'percentage' }))}
                                                    options={[
                                                        { label: `Fixed (${currencySymbol})`, value: 'fixed' },
                                                        { label: 'Percentage (%)', value: 'percentage' }
                                                    ]}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <CustomInput
                                                    type="number"
                                                    name="laborCost"
                                                    value={formData.laborCost === '' ? '' : Number(formData.laborCost).toString()}
                                                    onChange={handleChange}
                                                    min="0"
                                                    step="0.01"
                                                    placeholder={formData.laborCostType === 'percentage' ? 'e.g. 10' : 'e.g. 150.00'}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Product Recipe Section (Main) - Hidden if variants exist */}
                            {!hasVariants && (
                                <ProductRecipeEditor
                                    title="Product Recipe"
                                    products={formData.products}
                                    availableProducts={products}
                                    onAdd={addProduct}
                                    onRemove={removeProduct}
                                    onUpdate={updateProduct}
                                />
                            )}

                            {/* Variants Section */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                                    <h3 className="text-lg font-semibold text-gray-800">Service Variants</h3>
                                    <button
                                        type="button"
                                        onClick={addVariant}
                                        className="text-sm px-3 py-1.5 bg-lime-50 text-lime-600 rounded-lg hover:bg-lime-100 transition flex items-center gap-1 font-medium"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        Add Variant
                                    </button>
                                </div>

                                {hasVariants ? (
                                    <div className="space-y-4">
                                        {formData.variants.map((variant, index) => (
                                            <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                                                <div className="flex justify-between">
                                                    <div className="flex-1 grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">Variant Name</label>
                                                            <input
                                                                type="text"
                                                                value={variant.name}
                                                                onChange={(e) => updateVariant(index, 'name', e.target.value)}
                                                                placeholder="e.g. Long Hair"
                                                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 outline-none transition"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">Price ({currencySymbol})</label>
                                                            <input
                                                                type="number"
                                                                value={variant.price === '' ? '' : Number(variant.price).toString()}
                                                                onChange={(e) => updateVariant(index, 'price', handleNumberInput(e.target.value))}
                                                                min="0"
                                                                step="0.01"
                                                                placeholder="0.00"
                                                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 outline-none transition"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className='flex items-baseline-last'>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeVariant(index)}
                                                            className="ml-4 p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                                                            title="Remove variant"
                                                        >
                                                            <XMarkIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Variant Product Recipe */}
                                                <div>
                                                    <ProductRecipeEditor
                                                        title={`Recipe for ${variant.name || 'Variant'}`}
                                                        products={variant.products}
                                                        availableProducts={products}
                                                        onAdd={() => addVariantProduct(index)}
                                                        onRemove={(pIdx) => removeVariantProduct(index, pIdx)}
                                                        onUpdate={(pIdx, field, val) => updateVariantProduct(index, pIdx, field, val)}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                        <p className="text-gray-500">No variants added.</p>
                                        <button type="button" onClick={addVariant} className="text-green-600 hover:underline mt-1 text-sm">
                                            Add a variant
                                        </button>
                                    </div>
                                )}
                            </div>

                        </form>
                    </div>
                </div>

                <div className="w-full lg:w-[40%] sticky top-16">
                    {/* Cost Summary */}
                    <div className="bg-blue-50 p-5 rounded-xl w-full shadow-md">
                        <h3 className="font-semibold text-blue-900 mb-5 pb-4 border-b border-blue-200">Estimated Cost & Profit</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex flex-col items-center justify-center text-center">
                                <span className="block text-blue-600 mb-1">Materials Cost</span>
                                <span className="text-lg font-semibold text-blue-900">
                                    {hasVariants ? '--' : formatCurrency(costs.materialCost)}
                                </span>
                            </div>
                            <div className="flex flex-col items-center justify-center text-center">
                                <span className="block text-blue-600 mb-1">Labor Cost</span>
                                <span className="text-lg font-semibold text-blue-900">
                                    {formData.laborCostType === 'percentage'
                                        ? `${Number(formData.laborCost)}%`
                                        : formatCurrency(costs.laborCost)
                                    }
                                </span>
                            </div>
                            <div className="flex flex-col items-center justify-center text-center">
                                <span className="block text-blue-600 mb-1">Total Cost</span>
                                <span className={`text-lg font-bold ${hasVariants ? 'text-gray-400' : 'text-blue-900'}`}>
                                    {hasVariants ? '--' : formatCurrency(costs.totalCost)}
                                </span>
                            </div>
                            <div className="flex flex-col items-center justify-center text-center">
                                <span className="block text-blue-600 mb-1">Base Net Profit</span>
                                {hasVariants ? (
                                    <span className="text-lg font-medium text-gray-400">--</span>
                                ) : (
                                    <>
                                        <span className={`text-lg font-medium ${costs.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCurrency(costs.profitMargin)}
                                        </span>
                                        <span className={`text-xs ml-1 ${costs.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            ({costs.profitPercentage})
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Variants Profitability Analysis */}
                        {hasVariants && (
                            <div className="pt-4 mt-4">
                                <h4 className="text-sm font-semibold text-blue-900 mb-3">Variant Profitability</h4>
                                <div className="overflow-x-auto rounded-lg border border-blue-100">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-white border-b border-blue-100 text-blue-900 font-semibold">
                                            <tr>
                                                <th className="px-4 py-3 text-center">Variant Name</th>
                                                <th className="px-4 py-3 text-center">Price</th>
                                                <th className="px-4 py-3 text-center">Prime Cost</th>
                                                <th className="px-4 py-3 text-center">Net Profit</th>
                                                <th className="px-4 py-3 text-center">Margin</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-blue-50 bg-white">
                                            {formData.variants.map((variant, index) => {
                                                const vPrice = Number(variant.price) || 0;

                                                // Calculate material cost for this variant
                                                const vMaterialCost = variant.products.reduce((sum, p) => {
                                                    return sum + (Number(p.quantity) * p.unitCost);
                                                }, 0);

                                                // Calculate labor cost for this variant
                                                let vLabor = Number(formData.laborCost) || 0;
                                                if (formData.laborCostType === 'percentage') {
                                                    vLabor = (vPrice * vLabor) / 100;
                                                }

                                                const vTotalCost = vMaterialCost + vLabor;
                                                const vProfit = vPrice - vTotalCost;
                                                const vMargin = vPrice > 0 ? ((vProfit / vPrice) * 100).toFixed(2) + '%' : '0%';

                                                return (
                                                    <tr key={index} className="hover:bg-blue-50/50 transition-colors">
                                                        <td className="px-4 py-3 font-medium text-blue-900 text-center">{variant.name || 'Untitled'}</td>
                                                        <td className="px-4 py-3 text-blue-900 text-center">{formatCurrency(vPrice)}</td>
                                                        <td className="px-4 py-3 text-blue-900 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span>{formatCurrency(vTotalCost)}</span>
                                                                <span className="text-xs text-gray-500">
                                                                    (Mat: {formatCurrency(vMaterialCost)} + Lab: {formatCurrency(vLabor)})
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className={`px-4 py-3 text-center ${vProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {formatCurrency(vProfit)}
                                                        </td>
                                                        <td className={`px-4 py-3 text-center ${vProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {vMargin}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </>
    );
}
