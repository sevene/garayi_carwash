'use client';

import React, { useEffect, useState } from 'react';
import ProductForm from '@/components/admin/ProductForm';
import StickyHeader from '@/components/ui/StickyHeader';
import { useScrollState } from '@/hooks/useScrollState';

export default function NewProductPage() {
    const [categories, setCategories] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const isScrolled = useScrollState();

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch('/api/categories');
                if (res.ok) {
                    const data = await res.json();
                    setCategories(data);
                }
            } catch (error) {
                console.error("Failed to fetch categories", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCategories();
    }, []);

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Loading...</div>;
    }

    return (
        <div className="w-full">
            <StickyHeader
                title="Create New Product"
                isScrolled={isScrolled}
                formId="product-form"
                saveLabel="Create Product"
            />

            <ProductForm categories={categories} id="product-form" />
        </div>
    );
}
