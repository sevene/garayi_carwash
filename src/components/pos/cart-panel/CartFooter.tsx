import React from 'react';
import { useCart } from '@/hooks/useCart';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface CartFooterProps {
    onSave: () => void;
    onCheckoutClick: () => void;
    isBusy: boolean;
}

const CartFooter: React.FC<CartFooterProps> = ({ onSave, onCheckoutClick, isBusy }) => {
    const { cartItems, subtotal, tax, total, checkoutError, taxRate, formatCurrency } = useCart();
    const isEmpty = cartItems.length === 0;

    return (
        <div className="bg-white border-t border-gray-200">
            {checkoutError && (
                <div className="mx-4 mt-3 mb-1 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100 flex items-center justify-between">
                    <span>{checkoutError}</span>
                    <XMarkIcon className="w-4 h-4 cursor-pointer" />
                </div>
            )}

            {/* Summary Rows */}
            <div className="px-6 py-4 space-y-2 border-b border-gray-100 bg-gray-50/50">
                <div className="flex justify-between text-gray-500 text-sm">
                    <span>Subtotal</span>
                    <span className="font-medium text-gray-700">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-500 text-sm">
                    <span>Tax ({Number((taxRate * 100).toFixed(2))}%)</span>
                    <span className="font-medium text-gray-700">{formatCurrency(tax)}</span>
                </div>
            </div>

            {/* Action Area */}
            <div className="p-4 bg-white grid grid-cols-[auto_1fr] gap-3">
                {/* Save Button */}
                <button
                    onClick={onSave}
                    disabled={isEmpty || isBusy}
                    className="flex flex-col items-center justify-center px-6 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:border-gray-300 hover:text-lime-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                    <span>Save</span>
                </button>

                {/* Charge Button */}
                <button
                    onClick={onCheckoutClick}
                    disabled={isEmpty || isBusy}
                    className="relative overflow-hidden flex items-center justify-between px-6 py-4 rounded-xl bg-lime-600 text-white hover:bg-lime-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                    <div className="flex flex-col items-start z-10">
                        <span className="text-xl font-bold tracking-wide">Charge</span>
                        <span className="text-xs font-medium text-lime-100 opacity-80">{cartItems.length} Items</span>
                    </div>
                    <span className="text-2xl font-bold z-10">{formatCurrency(total)}</span>

                    {/* Shimmer Effect */}
                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                </button>
            </div>
        </div>
    );
};

export default CartFooter;
