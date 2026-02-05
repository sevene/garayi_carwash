'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ProductForm from '@/components/admin/ProductForm';
import { Product } from '@/lib/products';
import StickyHeader from '@/components/ui/StickyHeader';
import { useScrollState } from '@/hooks/useScrollState';

export default function EditProductPage() {
    const params = useParams();
    const [product, setProduct] = useState<Product | null>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isScrolled = useScrollState();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const id = params?.id;
                if (!id) return;

                // Fetch Product
                const productRes = await fetch(`/api/products/${id}`);
                if (!productRes.ok) throw new Error("Failed to fetch product");
                const productData = await productRes.json() as Product;
                setProduct(productData);

                // Fetch Categories
                const categoriesRes = await fetch('/api/categories');
                if (categoriesRes.ok) {
                    const categoriesData = await categoriesRes.json() as any[];
                    setCategories(categoriesData);
                }

            } catch (err) {
                console.error(err);
                setError("Failed to load product details.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [params?.id]);

    if (loading) {
        return <div className="p-10 text-center text-gray-500">Loading product details...</div>;
    }

    if (error) {
        return <div className="p-10 text-center text-red-500">{error}</div>;
    }

    if (!product) {
        return <div className="p-10 text-center text-gray-500">Product not found.</div>;
    }

    return (
        <div className="w-full">
            <StickyHeader
                title="Edit Product"
                isScrolled={isScrolled}
                formId="product-form"
                saveLabel="Update Product"
            />

            <div className={`mb-6 transition-all duration-300 ${isScrolled ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
                <p className="text-gray-500 text-sm">Update product details</p>
            </div>

            <ProductForm initialProduct={product} categories={categories} id="product-form" />
        </div>
    );
}
