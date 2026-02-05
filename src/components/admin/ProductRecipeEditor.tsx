import React from 'react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { ServiceProduct } from '@/lib/services';
import { Product } from '@/lib/products';
import CustomSelect from '@/components/ui/CustomSelect';
import { useSettings } from '@/hooks/useSettings';
import { handleNumberInput } from '@/components/utils/inputHelpers';

interface ProductRecipeEditorProps {
    products: (Omit<ServiceProduct, 'quantity'> & { quantity: number | string })[];
    availableProducts: Product[];
    onAdd: () => void;
    onRemove: (index: number) => void;
    onUpdate: (index: number, field: keyof ServiceProduct, value: any) => void;
    title?: string;
}

const ProductRecipeEditor: React.FC<ProductRecipeEditorProps> = ({
    products,
    availableProducts,
    onAdd,
    onRemove,
    onUpdate,
    title = "Product Recipe"
}) => {
    const { formatCurrency } = useSettings();
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-gray-300 pb-2">
                <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                <button
                    type="button"
                    onClick={onAdd}
                    className="text-sm px-3 py-1.5 bg-lime-50 text-lime-600 rounded-lg hover:bg-lime-100 transition flex items-center gap-1 font-medium"
                >
                    <PlusIcon className="w-4 h-4" />
                    Add Product
                </button>
            </div>

            {products && products.length > 0 ? (
                <div className="space-y-3">
                    {products.map((product, index) => (
                        <div key={index} className="flex gap-3 items-start p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="flex-4 min-w-20">
                                <CustomSelect
                                    label="Product"
                                    value={product.productId}
                                    onChange={(val) => onUpdate(index, 'productId', val)}
                                    options={availableProducts.map(p => ({
                                        label: `${p.name} (${formatCurrency(Number(p.price))})`,
                                        value: p._id
                                    }))}
                                    placeholder="Select product..."
                                />
                            </div>
                            <div className="flex-2 min-w-16">
                                <CustomSelect
                                    label="Sold By"
                                    value={product.soldBy || 'quantity'}
                                    onChange={(val) => onUpdate(index, 'soldBy', val)}
                                    options={[
                                        { label: 'Quantity', value: 'quantity' },
                                        { label: 'Volume/Weight', value: 'volume' }
                                    ]}
                                />
                            </div>
                            <div className="flex flex-col flex-1 min-w-10">
                                <label className="block text-xs font-medium text-gray-700 mb-1.5">Quantity</label>
                                <input
                                    type="number"
                                    value={product.quantity === '' ? '' : Number(product.quantity).toString()}
                                    onChange={(e) => onUpdate(index, 'quantity', handleNumberInput(e.target.value))}
                                    min="0.01"
                                    step="0.01"
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 outline-none bg-white"
                                />
                            </div>
                            <div className="flex flex-col flex-1 min-w-10">
                                <label className="block text-xs font-medium text-gray-700 mb-1.5 text-center">Cost</label>
                                <div className="h-[38px] px-3 py-2 text-sm text-gray-700 flex items-center justify-center">
                                    {formatCurrency(Number(product.quantity) * product.unitCost)}
                                </div>
                            </div>
                            <div className="flex items-center self-center">
                                <button
                                    type="button"
                                    onClick={() => onRemove(index)}
                                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                                    title="Remove product"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500">No products added to this recipe.</p>
                    <button type="button" onClick={onAdd} className="text-green-600 hover:underline mt-1 text-sm">
                        Add a product
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProductRecipeEditor;
