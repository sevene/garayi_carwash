'use client';

import React from 'react';
import { CarwashService } from '@/lib/types';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useSettings } from '@/hooks/useSettings';

interface CarTypeSelectorProps {
    service: CarwashService;
    onSelect: (variant: { name: string; price: number }) => void;
    onClose: () => void;
}

export function CarTypeSelector({ service, onSelect, onClose }: CarTypeSelectorProps) {
    const { formatCurrency } = useSettings();

    // Map variants to selection types
    // We try to match icons based on name keywords, defaulting to a car
    const types = (service.variants || []).map(variant => {
        let icon = '🚗';
        const lowerName = variant.name.toLowerCase();
        if (lowerName.includes('suv') || lowerName.includes('crossover') || lowerName.includes('4x4')) icon = '🚙';
        if (lowerName.includes('truck') || lowerName.includes('pickup') || lowerName.includes('van')) icon = '🛻';
        if (lowerName.includes('motor') || lowerName.includes('bike')) icon = '🏍️';

        return {
            name: variant.name,
            price: variant.price,
            icon
        };
    });

    // If no variants defined, maybe show base price as single option?
    if (types.length === 0) {
        types.push({
            name: 'Standard',
            price: service.servicePrice || 0,
            icon: '🚗'
        });
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-lg text-gray-900">Select Vehicle Type</h3>
                        <p className="text-sm text-gray-500">for {service.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 grid gap-3">
                    {types.map((type) => (
                        <button
                            key={type.name}
                            onClick={() => onSelect({ name: type.name, price: type.price })}
                            className="flex items-center justify-between p-4 rounded-xl border-2 border-transparent bg-gray-50 hover:bg-lime-50 hover:border-lime-200 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{type.icon}</span>
                                <span className="font-medium text-gray-900 group-hover:text-lime-700">{type.name}</span>
                            </div>
                            <span className="font-bold text-gray-900 bg-white px-3 py-1 rounded-lg shadow-sm border border-gray-100">{formatCurrency(type.price)}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
