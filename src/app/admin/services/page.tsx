'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    WrenchScrewdriverIcon,
    ArrowPathIcon,
    ChevronRightIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { Service, calculateServiceCosts } from '@/lib/services';
import { useSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';
import PageHeader from '@/components/admin/PageHeader';

export default function AdminServicesPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const { formatCurrency } = useSettings();

    // Fetch services
    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const resServices = await fetch('/api/services');
            if (resServices.ok) {
                const data = await resServices.json() as Service[];
                setServices(data);
            }
        } catch (err) {
            console.error("Failed to fetch data", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete service "${name}"?`)) return;

        try {
            const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Failed to delete");

            setServices(prev => prev.filter(s => s._id !== id));
            toast.success("Service deleted.");
        } catch (err) {
            console.error(err);
            toast.error("Error deleting service.");
        }
    };

    // Render service row
    const ServiceRow = ({ service }: { service: Service }) => {
        const nodeCosts = calculateServiceCosts(service);
        const hasVariants = service.variants && service.variants.length > 0;
        const [isExpanded, setIsExpanded] = useState(false);

        const toggleExpand = () => {
            if (hasVariants) {
                setIsExpanded(!isExpanded);
            }
        };

        let priceDisplay = formatCurrency(service.servicePrice);
        if (hasVariants && service.variants) {
            const prices = service.variants.map(v => Number(v.price) || 0);
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            priceDisplay = min === max
                ? formatCurrency(min)
                : `${formatCurrency(min)} - ${formatCurrency(max)}`;
        }

        let profitDisplay = (
            <div className="flex items-center justify-center gap-1">
                <span className="text-gray-700">
                    {formatCurrency(nodeCosts.profitMargin)}
                </span>
                {nodeCosts.profitMargin >= 0 ? (
                    <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />
                ) : (
                    <ArrowTrendingDownIcon className="w-4 h-4 text-red-600" />
                )}
            </div>
        );

        if (hasVariants && service.variants) {
            const profitData = service.variants.map(variant => {
                const vPrice = Number(variant.price) || 0;
                const vMaterialCost = (variant.products || []).reduce(
                    (sum, p) => sum + (p.quantity * p.unitCost),
                    0
                );
                let vLabor = Number(service.laborCost) || 0;
                if (service.laborCostType === 'percentage') {
                    vLabor = (vPrice * vLabor) / 100;
                }
                const vTotalCost = vMaterialCost + vLabor;
                const profit = vPrice - vTotalCost;
                const margin = vPrice > 0 ? (profit / vPrice) * 100 : 0;
                return { profit, margin };
            });

            const profits = profitData.map(d => d.profit);
            const minProfit = Math.min(...profits);
            const maxProfit = Math.max(...profits);

            // Find margins corresponding to min/max profits
            const minMargin = profitData.find(d => d.profit === minProfit)?.margin || 0;
            const maxMargin = profitData.find(d => d.profit === maxProfit)?.margin || 0;

            profitDisplay = (
                <div className="flex flex-col">
                    {minProfit === maxProfit ? (
                        <div className="flex items-center justify-center gap-1">
                            <span className="text-gray-600">{formatCurrency(minProfit)}</span>
                            {minProfit >= 0 ? (
                                <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />
                            ) : (
                                <ArrowTrendingDownIcon className="w-4 h-4 text-red-600" />
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-1">
                            <div className="flex items-center gap-1 justify-center">
                                <span className="text-gray-600">{formatCurrency(minProfit)}</span>
                                {minProfit >= 0 ? (
                                    <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />
                                ) : (
                                    <ArrowTrendingDownIcon className="w-4 h-4 text-red-600" />
                                )}
                            </div>
                            <div className="text-xs text-gray-400 text-center w-4">-</div>
                            <div className="flex items-center gap-1">
                                <span className="text-gray-600">{formatCurrency(maxProfit)}</span>
                                {maxProfit >= 0 ? (
                                    <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />
                                ) : (
                                    <ArrowTrendingDownIcon className="w-4 h-4 text-red-600" />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <React.Fragment>
                <tr
                    onClick={toggleExpand}
                    className={`hover:bg-lime-50/50 transition border-b border-gray-100 last:border-0 ${hasVariants ? 'cursor-pointer' : ''}`}
                >
                    <td className="px-6 py-4 font-medium text-gray-700">
                        <div className="flex items-center gap-2">
                            <span className={hasVariants ? 'font-semibold' : ''}>{service.name}</span>
                            {hasVariants && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                    {service.variants?.length} variants
                                </span>
                            )}
                            {hasVariants && (
                                <div className="p-1 text-gray-500 transition">
                                    <ChevronRightIcon className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                </div>
                            )}
                        </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-center">{priceDisplay}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-center">
                        {hasVariants ? (
                            <span className="text-gray-400 text-xs italic">(see details below)</span>
                        ) : (
                            formatCurrency(nodeCosts.materialCost)
                        )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-center justify-center">{profitDisplay}</td>
                    <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${service.active ? 'bg-lime-100 text-lime-800' : 'bg-gray-100 text-gray-500'}`}>
                            {service.active ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Link
                                href={`/admin/services/${service._id}`}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition"
                            >
                                <PencilSquareIcon className="w-5 h-5" />
                            </Link>
                            <button
                                onClick={() => handleDelete(service._id, service.name)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </td>
                </tr>
                {/* Variant Rows */}
                {hasVariants && isExpanded && service.variants?.map((variant, idx) => {
                    const vPrice = Number(variant.price) || 0;

                    // Calculate material cost for this variant
                    const vMaterialCost = (variant.products || []).reduce(
                        (sum, p) => sum + (p.quantity * p.unitCost),
                        0
                    );

                    // Calculate labor cost for this variant
                    let vLabor = Number(service.laborCost) || 0;
                    if (service.laborCostType === 'percentage') {
                        vLabor = (vPrice * vLabor) / 100;
                    }

                    const vTotalCost = vMaterialCost + vLabor;
                    const vProfit = vPrice - vTotalCost;
                    const vMargin = vPrice > 0 ? ((vProfit / vPrice) * 100).toFixed(2) + '%' : '0%';

                    return (
                        <tr key={`${service._id}-v-${idx}`} className="bg-white hover:bg-lime-50/50 transition border-b border-gray-100 last:border-0">
                            <td className="px-6 py-3 text-sm text-gray-600">
                                <div className="pl-8 flex items-center gap-2">
                                    <span>{variant.name}</span>
                                </div>
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-600 text-center">
                                {formatCurrency(vPrice)}
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-600 text-center">
                                <div className="flex flex-col items-center">
                                    <span>{formatCurrency(vTotalCost)}</span>
                                    <span className="text-[10px] text-gray-400">
                                        (Mat: {formatCurrency(vMaterialCost)} + Lab: {formatCurrency(vLabor)})
                                    </span>
                                </div>
                            </td>
                            <td className="px-6 py-3 text-sm text-center">
                                <div className="flex gap-1 justify-center items-baseline">
                                    <span className="text-gray-600">
                                        {formatCurrency(vProfit)}
                                    </span>
                                    <span className={`text-[11px] font-bold ${vProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {vMargin}
                                    </span>
                                </div>
                            </td>
                            <td className="px-6 py-3 text-center">
                                {/* Status placeholder */}
                            </td>
                            <td className="px-6 py-3 text-center">
                                {/* Actions placeholder */}
                            </td>
                        </tr>
                    );
                })}
            </React.Fragment>
        );
    };

    const filteredServices = services.filter(service => {
        const query = searchQuery.toLowerCase();
        const matchesName = service.name.toLowerCase().includes(query);
        const matchesVariant = service.variants?.some(v => v.name.toLowerCase().includes(query));
        return matchesName || matchesVariant;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-1000 lg:px-6 lg:pb-6">
            <div className="flex justify-between items-end">
                <PageHeader
                    title="Services"
                    description="Manage services with product recipes and pricing"
                />
                <Link
                    href="/admin/services/new"
                    className="flex items-center gap-2 px-4 py-2 bg-lime-500 text-white font-medium rounded-lg hover:bg-lime-600 hover:shadow-md hover:shadow-lime-200 transition"
                >
                    <PlusIcon className="w-5 h-5" />
                    Create Service
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                        <WrenchScrewdriverIcon className="w-5 h-5" />
                        Services List
                    </h2>
                    <div className="flex items-center gap-5">
                        <input
                            type='text'
                            placeholder='Search'
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className='border-b border-transparent px-3 py-1 text-sm text-gray-500 hover:border-b-gray-200 hover:text-gray-900 focus:outline-none focus:border-lime-400 transition-all'
                        />
                        <button onClick={fetchData} className="text-gray-400 hover:text-gray-600 transition-colors" title="Refresh">
                            <ArrowPathIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                            <tr>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3 text-center">Price</th>
                                <th className="px-6 py-3 text-center">Prime Cost</th>
                                <th className="px-6 py-3 text-center">Profit</th>
                                <th className="px-6 py-3 text-center">Status</th>
                                <th className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={6} className="p-6 text-center text-gray-500">Loading...</td></tr>
                            ) : filteredServices.length === 0 ? (
                                <tr><td colSpan={6} className="p-6 text-center text-gray-500">No services found.</td></tr>
                            ) : (
                                filteredServices.map(service => (
                                    <ServiceRow key={service._id} service={service} />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
