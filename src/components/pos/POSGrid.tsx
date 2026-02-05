'use client';

import React, { useState, useMemo } from 'react';
import { Service } from '@/lib/services';
import { useCart } from '@/hooks/useCart';
import { VariantSelector } from './VariantSelector';
import { Product } from '@/lib/products';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Category } from '@/lib/categories';

interface POSGridProps {
    // Initial services are passed from the Server Component (app/page.tsx)
    initialServices: Service[];
    initialProducts: Product[];
    initialCategories: Category[];
    initialInventory?: Record<string, number>;
}

// Union type for items in the grid
type POSItem = Service | Product;

/**
 * POSGrid handles displaying the service catalog, filtering by search term,
 * and managing the click event to add items to the shared cart state.
 */
export function POSGrid({ initialServices, initialProducts, initialCategories, initialInventory = {} }: POSGridProps) {
    const { addItemToCart, formatCurrency } = useCart();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [isScrolled, setIsScrolled] = useState(false);

    // Combine and memoize items
    const allItems = useMemo(() => {
        const services = initialServices.filter(s => s.showInPOS !== false);
        const products = initialProducts.filter(p => p.showInPOS !== false);
        return [...services, ...products];
    }, [initialServices, initialProducts]);

    // Check availability based on inventory
    const checkAvailability = (item: POSItem) => {
        // 1. If it's a simple Product
        if (!('servicePrice' in item)) {
            // Use _id directly for products
            const product = item as Product;
            const stock = initialInventory[item._id] ?? product.stock ?? 0;
            const threshold = product.threshold ?? 10;

            const isLow = stock <= threshold && stock > 0;
            const isOut = stock <= 0;

            // Disable ONLY if Out of Stock. Low stock is just a warning.
            const isDisabled = isOut;

            return {
                available: !isDisabled,
                isLow,
                isOut,
                stock,
                missingIngredients: isDisabled || isLow
                    ? [{
                        name: item.name,
                        current: stock,
                        required: 1,
                        status: isOut ? 'out' : 'low' as 'out' | 'low'
                    }]
                    : []
            };
        }

        // 2. If it's a Service
        const service = item as Service;

        // Helper to find product threshold from initialProducts list
        const getThreshold = (prodId: string) => {
            const p = initialProducts.find(p => p._id === prodId);
            return p?.threshold ?? 10;
        };

        // Helper to check a list of ingredients
        const checkIngredients = (ingredients: any[]) => {
            const missing: { name: string, current: number, required: number, status: 'low' | 'out' }[] = [];
            for (const ingredient of ingredients) {
                // Handle potential populated object for productId
                const rawId = ingredient.productId;
                const invId = typeof rawId === 'object' && rawId?._id ? String(rawId._id) : String(rawId);

                const currentStock = initialInventory[invId] ?? 0;
                const threshold = getThreshold(invId);

                // console.log(`Checking Ingredient: ${ingredient.productName} (ID: ${invId}) -> Stock: ${currentStock}, Threshold: ${threshold}`);

                if (currentStock <= 0) {
                    missing.push({ name: ingredient.productName || `Item #${invId}`, current: currentStock, required: ingredient.quantity, status: 'out' });
                } else if (currentStock <= threshold) {
                    missing.push({ name: ingredient.productName || `Item #${invId}`, current: currentStock, required: ingredient.quantity, status: 'low' });
                }
            }
            return missing;
        };

        // A. Check Base Service Ingredients
        if (service.name.includes('Ceramic')) {
            console.log(`Checking Service: ${service.name}`, { products: service.products, variants: service.variants, initialInventoryKeys: Object.keys(initialInventory) });
        }
        const baseMissing = checkIngredients(service.products || []);
        const isBaseDisabled = baseMissing.some(m => m.status === 'out'); // Only disable if OUT

        // B. Check Variants (if any)
        // If a service has variants, we should check availability.
        // If ALL variants are OUT of stock, the service is disabled.
        // Low stock on variants does not disable the service.
        let allVariantsUnavailable = false;
        let firstVariantMissing: typeof baseMissing = [];
        let hasLowStockVariant = false;

        if (service.variants && service.variants.length > 0) {
            let availableVariantsCount = 0;

            service.variants.forEach(v => {
                const vMissing = checkIngredients(v.products || []);
                const isVariantOut = vMissing.some(m => m.status === 'out');
                const isVariantLow = vMissing.some(m => m.status === 'low');

                if (!isVariantOut) {
                    // Variant is valid (either fully stocked or just low)
                    availableVariantsCount++;
                    if (isVariantLow) {
                        hasLowStockVariant = true;
                    }
                } else if (availableVariantsCount === 0 && firstVariantMissing.length === 0) {
                    // Capture why the first one failed
                    firstVariantMissing = vMissing;
                }
            });

            if (availableVariantsCount === 0) {
                allVariantsUnavailable = true;
            }
        }

        // Final Decision:
        // Service is disabled if:
        // 1. Base ingredients are OUT.
        // 2. OR It has variants, and ALL variants are OUT.
        const isDisabled = isBaseDisabled || (service.variants && service.variants.length > 0 && allVariantsUnavailable);

        // Aggregate missing info for tooltip (Low or Out)
        // We include LOW stock items in the missing list so the tooltip shows warnings
        const allMissing = [...baseMissing];
        if (!isBaseDisabled && allVariantsUnavailable) {
            allMissing.push(...firstVariantMissing);
        } else if (!isBaseDisabled && !allVariantsUnavailable && baseMissing.length === 0 && service.variants && service.variants.length > 0) {
            // Service is enabled.
        }

        const isOut = allMissing.some(i => i.status === 'out');
        const isLow = allMissing.some(i => i.status === 'low') || hasLowStockVariant;

        return {
            available: !isDisabled,
            isLow,
            isOut,
            stock: Infinity,
            missingIngredients: allMissing
        };
    };

    // Calculate low/out stock items globally for the header list
    const stockStatus = useMemo(() => {
        const lowStock: { name: string, stock: number }[] = [];
        const outOfStock: { name: string, stock: number }[] = [];

        // Helper to check and push
        const checkItem = (name: string, stock: number, threshold: number) => {
            if (stock <= 0) {
                outOfStock.push({ name, stock });
            } else if (stock <= threshold) {
                lowStock.push({ name, stock });
            }
        };

        // Check products (easiest mapping)
        initialProducts.forEach(p => {
            const stock = initialInventory[p._id] ?? p.stock ?? 0;
            const threshold = p.threshold ?? 10;
            checkItem(p.name, stock, threshold);
        });

        return { lowStock, outOfStock };
    }, [initialProducts, initialInventory]);


    // Derive categories that interact with visible items
    const visibleCategories = useMemo(() => {
        const usedCategoryIds = new Set<string>();

        allItems.forEach(item => {
            const cat = item.category;
            if (!cat) return;

            // Handle string ID or populated object (backend sends object for products, string for services)
            const catId = typeof cat === 'object' ? (cat as any)._id : cat;
            if (catId) {
                usedCategoryIds.add(catId);
            }
        });

        // Return only categories strictly present in the items list
        return initialCategories.filter(cat => usedCategoryIds.has(cat._id));
    }, [allItems, initialCategories]);

    const handleItemClick = (item: POSItem) => {
        const availability = checkAvailability(item);
        if (!availability.available) return;

        if ('variants' in item && item.variants && item.variants.length > 0) {
            // It's a service with variants
            setSelectedService(item as Service);
        } else {
            // Add directly
            addItemToCart(item as Product); // Service is compatible with Product interface for cart purposes mostly, but let's be safe
        }
    };

    const addServiceToCart = (service: Service, variant?: { name: string; price: number }) => {
        // Map Service/Variant to Product structure for Cart
        const cartItem: Product = {
            _id: variant ? `${service._id}-${variant.name}` : service._id,
            name: variant ? `${service.name} - ${variant.name}` : service.name,
            sku: 'SRV', // Placeholder
            price: variant ? variant.price : service.servicePrice,
            cost: 0, // Not needed for POS display
            volume: 0, // Not needed
            showInPOS: true
        };

        addItemToCart(cartItem);
        setSelectedService(null);
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        if (scrollTop > 10 && !isScrolled) {
            setIsScrolled(true);
        } else if (scrollTop <= 10 && isScrolled) {
            setIsScrolled(false);
        }
    };

    // Helper to get category ID
    const getCategoryId = (item: POSItem) => {
        const cat = item.category;
        if (!cat) return 'uncategorized';
        // Handle complex case where category might be populated object (Product) or ID string (Service)
        return typeof cat === 'object' ? (cat as any)._id : cat;
    };

    // Filter items based on search term ONLY (Category filtering happens at section level if 'all', or strict if specific)
    const searchedItems = useMemo(() => {
        let items = allItems;
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            items = items.filter(item =>
                item.name.toLowerCase().includes(lowerSearchTerm) ||
                ('sku' in item && item.sku.toLowerCase().includes(lowerSearchTerm))
            );
        }
        return items;
    }, [allItems, searchTerm]);

    // Group items by category
    const groupedItems = useMemo(() => {
        const groups: Record<string, POSItem[]> = {};

        searchedItems.forEach(item => {
            const catId = getCategoryId(item);
            if (!groups[catId]) {
                groups[catId] = [];
            }
            groups[catId].push(item);
        });

        return groups;
    }, [searchedItems]);

    // Prepare sections to render
    const sectionsToRender = useMemo(() => {
        const sections: { id: string; name: string; items: POSItem[] }[] = [];

        // Special Filters for Alerts
        if (selectedCategory === 'alerts_out') {
            const items = allItems.filter(item => checkAvailability(item).isOut);
            if (items.length > 0) sections.push({ id: 'alerts_out', name: 'Out of Stock Items', items });
            return sections;
        }
        if (selectedCategory === 'alerts_low') {
            const items = allItems.filter(item => checkAvailability(item).isLow);
            if (items.length > 0) sections.push({ id: 'alerts_low', name: 'Low Stock Items', items });
            return sections;
        }

        // If a specific category is selected, only that one
        if (selectedCategory !== 'all') {
            const items = groupedItems[selectedCategory] || [];
            if (items.length > 0) {
                const catName = initialCategories.find(c => c._id === selectedCategory)?.name || 'Unknown Category';
                sections.push({ id: selectedCategory, name: catName, items });
            }
        } else {
            // If 'all', we want to show ALL items in a SINGLE grid to use the space efficiently.
            // Include ALL items from groupedItems, not just those with matching categories
            let combinedItems: POSItem[] = [];

            // First, add items from known categories in order
            visibleCategories.forEach(cat => {
                const items = groupedItems[cat._id];
                if (items && items.length > 0) {
                    combinedItems.push(...items);
                }
            });

            // Then, add items from any other category groups (including 'uncategorized' and unmatched category IDs)
            Object.keys(groupedItems).forEach(catId => {
                // Skip if already added via visibleCategories
                if (visibleCategories.some(vc => vc._id === catId)) return;

                const items = groupedItems[catId];
                if (items && items.length > 0) {
                    combinedItems.push(...items);
                }
            });

            if (combinedItems.length > 0) {
                // Return one single section
                sections.push({ id: 'all', name: 'All Items', items: combinedItems });
            }
        }
        return sections;
    }, [groupedItems, selectedCategory, visibleCategories, initialCategories]);

    const renderItemCard = (item: POSItem) => {
        const isService = 'servicePrice' in item;
        const price = isService ? (item as Service).servicePrice : (item as Product).price;
        const hasVariants = isService && (item as Service).variants && (item as Service).variants!.length > 0;

        const availability = checkAvailability(item);
        // Only disable if availability.available is FALSE (which now means only if OUT)
        const isDisabled = !availability.available;
        const showBadge = availability.isOut || availability.isLow;

        // Create unique key by prefixing with item type
        const itemKey = isService ? `svc-${item._id}` : `prd-${item._id}`;

        let priceDisplay: React.ReactNode;

        if (hasVariants) {
            const variants = (item as Service).variants!;
            const prices = variants.map(v => typeof v.price === 'number' ? v.price : parseFloat(String(v.price)));
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);

            if (minPrice === maxPrice) {
                priceDisplay = formatCurrency(minPrice);
            } else {
                priceDisplay = `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`;
            }
        } else {
            priceDisplay = formatCurrency(typeof price === 'number' ? price : parseFloat(String(price)));
        }

        return (
            <button
                key={itemKey}
                disabled={isDisabled}
                onClick={() => handleItemClick(item)}
                className={`group relative p-4 outline-none w-full h-[150px]
                border border-transparent rounded-md
                transform transition-all duration-200
                text-left flex flex-col justify-between overflow-hidden
                ${isDisabled
                        ? 'bg-gray-100 opacity-80 cursor-not-allowed grayscale-[0.5]'
                        : 'bg-gray-100 hover:bg-gray-50 hover:scale-[1.02] hover:shadow-lg active:cursor-pointer'
                    }`}
            >

                <div className={isDisabled ? 'opacity-50 overflow-hidden' : 'overflow-hidden'}>
                    {/* Title clamped to 2 lines max with hidden overflow */}
                    <h3
                        className="font-semibold text-lg tracking-medium capitalize leading-tight mb-2 overflow-hidden text-ellipsis"
                        title={item.name}
                        style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            height: '2.8rem' // Force fixed height for exactly 2 lines (1.125rem * 1.25 * 2)
                        }}
                    >
                        {item.name}
                    </h3>

                    {isService && ((item as Service).durationMinutes ?? 0) > 0 && (
                        <p className="text-xs text-gray-400 mt-1">{(item as Service).durationMinutes} mins</p>
                    )}

                    {/* Variant Badge */}
                    {hasVariants && (
                        <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800">
                            {`${(item as Service).variants!.length} VARIANTS`}
                        </span>
                    )}

                    {/* SKU for Products */}
                    {!isService && (item as Product).sku && (
                        <p className="text-xs text-gray-400 mt-1">SKU: {(item as Product).sku}</p>
                    )}
                </div>

                <div className={`mt-2 flex justify-between items-center ${isDisabled ? 'opacity-50' : ''}`}>
                    <p className="text-md font-medium text-gray-700">
                        {priceDisplay}
                    </p>

                    {showBadge && (
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full shadow-sm ${availability.isOut ? 'text-red-600' : 'text-orange-500'
                            }`}>
                            {availability.isOut ? 'Out of Stock' : 'Low Stock'}
                        </span>
                    )}
                </div>

                {/* Missing Ingredients Overlay (Only on Hover) */}
                {isDisabled && availability.missingIngredients.length > 0 && (
                    <div className="absolute inset-0 bg-gray-900/95 text-white p-4 flex flex-col justify-center items-start text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                        <p className="font-bold mb-2 text-red-300 uppercase tracking-wide">Missing Ingredients</p>
                        <ul className="w-full space-y-1 overflow-y-auto">
                            {availability.missingIngredients.map((mi, idx) => (
                                <li key={idx} className="flex flex-col border-b border-gray-700/50 pb-1.5 mb-1.5 last:border-0 last:mb-0">
                                    <span className="w-full text-gray-300 wrap-break-word whitespace-normal leading-tight">{mi.name}</span>
                                    <span className={`self-start mt-0.5 ${mi.status === 'out' ? 'text-red-400 font-bold' : 'text-orange-300 font-medium'}`}>
                                        {mi.current}/{mi.required}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </button>
        );
    };

    return (
        // The main container is now a flex column to stack the header and the grid
        <div className="flex-1 flex flex-col overflow-hidden bg-white">

            {/* 1. PRODUCT GRID HEADER (Fixed Height, Non-Scrolling) */}
            <div className="px-6 py-4 shrink-0 flex flex-col z-10 transition-all duration-300 ease-in-out border-b border-transparent">

                {/* Category Filter Pills & Search */}
                <div className="flex justify-between items-center h-[52px]">
                    <div className="flex gap-1 overflow-x-auto scrollbar-hide p-1.5 bg-gray-100 font-base min-w-0 rounded-full items-center">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`px-4 py-1.5 rounded-full text-sm transition whitespace-nowrap shrink-0
                                ${selectedCategory === 'all'
                                    ? 'bg-white text-gray-900 font-medium shadow-sm'
                                    : 'bg-transparent text-gray-500 hover:bg-white/50 hover:text-gray-700'}`}
                        >
                            All ({allItems.length})
                        </button>

                        {visibleCategories.map(cat => (
                            <button
                                key={cat._id}
                                onClick={() => setSelectedCategory(cat._id)}
                                className={`px-4 py-1.5 rounded-full text-sm transition whitespace-nowrap shrink-0 capitalize
                                    ${selectedCategory === cat._id
                                        ? 'bg-white text-gray-900 font-medium shadow-sm'
                                        : 'bg-transparent text-gray-500 hover:bg-white/50 hover:text-gray-700'
                                    }
                                `}
                            >
                                {cat.name} ({groupedItems[cat._id]?.length || 0})
                            </button>
                        ))}

                        {/* Out of Stock Filter Pill */}
                        {stockStatus.outOfStock.length > 0 && (
                            <button
                                onClick={() => setSelectedCategory('alerts_out')}
                                className={`px-3 py-1.5 rounded-full text-sm transition whitespace-nowrap shrink-0 flex items-center gap-2
                                    ${selectedCategory === 'alerts_out'
                                        ? 'bg-white text-red-700 font-medium shadow-sm ring-1 ring-red-100'
                                        : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                            >
                                <span className="relative flex h-2 w-2">
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                </span>
                                {stockStatus.outOfStock.length} Out of Stock
                            </button>
                        )}

                        {/* Low Stock Filter Pill */}
                        {stockStatus.lowStock.length > 0 && (
                            <button
                                onClick={() => setSelectedCategory('alerts_low')}
                                className={`px-3 py-1.5 rounded-full text-sm transition whitespace-nowrap shrink-0 flex items-center gap-2
                                    ${selectedCategory === 'alerts_low'
                                        ? 'bg-white text-orange-700 font-medium shadow-sm ring-1 ring-orange-100'
                                        : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}`}
                            >
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                </span>
                                {stockStatus.lowStock.length} Low Stock
                            </button>
                        )}
                    </div>

                    {/* Search Input - Auto Margin for Right Alignment */}
                    <div className="relative w-72 shrink-0 ml-auto group">
                        <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-gray-600 transition-colors" />
                        <input
                            name="search"
                            type="search"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-100 border border-gray-200 rounded-full
                                       text-gray-700 placeholder-gray-400
                                       focus:bg-white focus:border-gray-200 focus:ring-2 focus:ring-gray-100 focus:outline-none
                                       transition-all duration-200 ease-in-out hover:bg-gray-100/80"
                        />
                    </div>
                </div>
            </div>

            {/* 2. PRODUCT ITEMS AREA (Scrollable Area, Fills Remaining Space) */}
            {sectionsToRender.length === 0 ? (
                <div className="flex justify-center items-center flex-1 p-6">
                    <div className="text-center max-w-md w-full p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <div className="text-4xl mb-4">🔍</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
                        <p className="text-gray-500">
                            {searchTerm
                                ? `We couldn't find any items matching "${searchTerm}"`
                                : "There are no items available in this category."}
                        </p>
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="mt-4 text-lime-600 font-medium hover:text-lime-700 hover:underline"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                // This div handles the scrolling for the product cards
                <div
                    onScroll={handleScroll}
                    className="flex-1 overflow-auto p-6 space-y-8 bg-white scrollbar-hide"
                >
                    {sectionsToRender.map(section => (
                        <div key={section.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                                {section.items.map(item => renderItemCard(item))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedService && (
                <VariantSelector
                    service={selectedService}
                    onSelect={(variant) => addServiceToCart(selectedService, variant)}
                    onClose={() => setSelectedService(null)}
                />
            )}
        </div>
    );
}
