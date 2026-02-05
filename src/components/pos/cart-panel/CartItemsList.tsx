import React from 'react';
import { useCart } from '@/hooks/useCart';
import { XMarkIcon, PlusIcon, MinusIcon, UserGroupIcon } from '@heroicons/react/24/outline';

const CartItemsList = () => {
    const { cartItems, updateItemQuantity, removeItem, formatCurrency, openCrewSidebar, getItemCrew } = useCart();
    const isEmpty = cartItems.length === 0;

    return (
        <div className="flex-1 overflow-y-auto p-2 min-h-0 bg-white">
            {isEmpty ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4">
                    <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center">
                        <span className="text-4xl opacity-50">🛍️</span>
                    </div>
                    <p className="font-medium">No items in cart</p>
                </div>
            ) : (
                <div>
                    {cartItems.map((item) => {
                        const isService = item.sku === 'SRV';
                        const assignedCrew = isService ? getItemCrew(item._id) : [];

                        return (
                            <div
                                key={item._id}
                                className="flex items-center py-3 px-3 animate-in fade-in slide-in-from-bottom-1 duration-200 hover:bg-gray-50 transition-colors group"
                            >
                                {/* Compact Quantity Controls */}
                                <div className="flex items-center gap-1 mr-2 shrink-0">
                                    <button
                                        onClick={() => updateItemQuantity(item._id, Math.max(1, item.quantity - 1))}
                                        className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-100 transition-colors"
                                    >
                                        <MinusIcon className="w-3 h-3" />
                                    </button>
                                    <input
                                        id={`qty-${item._id}`}
                                        name="quantity"
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => updateItemQuantity(item._id, parseInt(e.target.value) || 1)}
                                        className="w-8 h-8 text-center font-bold text-sm text-gray-700 bg-gray-50 border border-transparent rounded focus:border-gray-400 focus:ring-1 focus:ring-gray-300 outline-none transition-all [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <button
                                        onClick={() => updateItemQuantity(item._id, item.quantity + 1)}
                                        className="p-1 rounded text-gray-400 hover:text-green-600 hover:bg-green-100 transition-colors"
                                    >
                                        <PlusIcon className="w-3 h-3" />
                                    </button>
                                </div>

                                {/* Item Details - Maximized Width */}
                                <div className="flex-1 min-w-0 mr-2">
                                    <div className="flex items-center gap-1.5">
                                        <h4 className="font-semibold text-gray-800 text-sm leading-tight truncate capitalize" title={item.name}>
                                            {item.name}
                                        </h4>
                                    </div>
                                    <p className="text-xs text-gray-400">{formatCurrency(item.price)} each</p>


                                </div>

                                {/* Price + Remove */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="font-bold text-gray-800 text-sm">{formatCurrency(item.itemTotal)}</span>
                                    <button
                                        onClick={() => removeItem(item._id)}
                                        className="p-1.5 text-gray-300 hover:text-rose-600 hover:bg-rose-100 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                        title="Remove Item"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CartItemsList;
