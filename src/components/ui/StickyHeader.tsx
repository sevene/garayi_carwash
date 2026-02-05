'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface StickyHeaderProps {
    title: string;
    isScrolled: boolean;
    isSaving?: boolean;
    onCancel?: () => void;
    formId?: string;
    saveLabel?: string;
    cancelLabel?: string;
    children?: React.ReactNode; // Allow custom actions
}

export default function StickyHeader({
    title,
    isScrolled,
    isSaving = false,
    onCancel,
    formId,
    saveLabel = 'Save',
    cancelLabel = 'Cancel',
    children
}: StickyHeaderProps) {
    const router = useRouter();

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        } else {
            router.back();
        }
    };

    return (
        <div className={`sticky -top-8 z-20 bg-white border-b border-gray-200 px-8 transition-all duration-300 ease-in-out -mx-8 -mt-8 mb-8
            ${isScrolled ? 'py-2 max-h-14' : 'py-4 max-h-32'}
        `}>
            <div className="flex justify-between items-center gap-3">
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isScrolled ? 'max-h-0 opacity-0' : 'max-h-20 opacity-100'}`}>
                    <h1 className="text-2xl font-bold text-gray-800">
                        {title}
                    </h1>
                </div>

                <div className={`flex gap-2 ml-auto transition-all duration-300 ${isScrolled ? 'py-1' : ''}`}>
                    {children ? children : (
                        <>
                            <button
                                type="button"
                                onClick={handleCancel}
                                className={`bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium
                                    ${isScrolled ? 'px-2 py-1' : 'px-4 py-2'}`}
                                disabled={isSaving}
                            >
                                {cancelLabel}
                            </button>
                            <button
                                type="submit"
                                form={formId}
                                className={`bg-lime-500 text-white rounded-lg hover:bg-lime-600 transition-all font-medium hover:shadow-md hover:shadow-lime-200 disabled:opacity-70 disabled:cursor-not-allowed
                                    ${isScrolled ? 'px-2 py-1' : 'px-4 py-2'}`}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Saving...' : saveLabel}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
