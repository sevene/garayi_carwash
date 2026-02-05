import React from 'react';
import { useCart } from '@/hooks/useCart';
import { XMarkIcon, BanknotesIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (method: string) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const { total, formatCurrency } = useCart();
    const [selectedPaymentMethod, setSelectedPaymentMethod] = React.useState('Cash');

    if (!isOpen) return null;

    const PAYMENT_METHODS = [
        { id: 'Cash', label: 'Cash', type: 'icon', icon: BanknotesIcon },
        { id: 'GCash', label: 'GCash', type: 'image', src: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/cc/GCash_logo.png/320px-GCash_logo.png' },
        { id: 'Maya', label: 'Maya', type: 'image', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/PayMaya_Logo.png/330px-PayMaya_Logo.png' },
        { id: 'UnionBank', label: 'UnionBank', type: 'image', src: 'https://upload.wikimedia.org/wikipedia/commons/6/61/Unionbank_2018_logo.svg' },
        { id: 'Security Bank', label: 'Security Bank', type: 'image', src: 'https://upload.wikimedia.org/wikipedia/commons/5/5a/Security_Bank_logo.svg' }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800">Select Payment Method</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    {PAYMENT_METHODS.map(method => (
                        <button
                            key={method.id}
                            onClick={() => setSelectedPaymentMethod(method.id)}
                            className={`flex flex-col items-center justify-center gap-3 p-4 rounded-xl border font-medium transition-all h-24 ${selectedPaymentMethod === method.id
                                ? 'border-lime-500 text-lime-800 bg-lime-50 shadow-sm ring-2 ring-lime-200'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            {method.type === 'image' && method.src ? (
                                <div className="relative w-full h-full overflow-hidden p-2">
                                    <Image
                                        src={method.src}
                                        alt={method.label}
                                        fill
                                        className="object-contain"
                                        sizes="120px"
                                        unoptimized
                                    />
                                </div>
                            ) : (
                                <div className={`p-2 rounded-full ${selectedPaymentMethod === method.id ? 'bg-lime-200 text-lime-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {method.icon ? <method.icon className="w-6 h-6" /> : <CreditCardIcon className="w-6 h-6" />}
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm text-gray-500 px-1">
                        <span>Total Amount:</span>
                        <span className="font-bold text-gray-900 text-lg">{formatCurrency(total)}</span>
                    </div>

                    <button
                        onClick={() => onConfirm(selectedPaymentMethod)}
                        className="w-full py-3.5 bg-lime-600 text-white font-bold rounded-xl shadow-lg hover:bg-lime-700 hover:shadow-lime-200/50 transition-all active:scale-[0.98]"
                    >
                        Confirm Payment ({selectedPaymentMethod})
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
