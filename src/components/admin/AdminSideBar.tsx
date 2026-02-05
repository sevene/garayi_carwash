'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Bars3Icon,
    HomeIcon,
    CubeIcon,
    ClipboardDocumentListIcon,
    Cog6ToothIcon,
    UserGroupIcon,
    ArchiveBoxIcon,
    TagIcon,
    IdentificationIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';

const NAV_ITEMS = [
    {
        name: 'Dashboard',
        href: '#',
        icon: HomeIcon,
        children: [
            { name: 'Overview', href: '/admin/dashboard/overview' },
            { name: 'Sales', href: '/admin/dashboard/sales' },
            { name: 'Expenses', href: '/admin/dashboard/expenses' },
            { name: 'Reports', href: '/admin/dashboard/reports' },
        ]
    },
    { name: 'Categories', href: '/admin/categories', icon: TagIcon },
    { name: 'Products', href: '/admin/products', icon: CubeIcon },
    { name: 'Inventory', href: '/admin/inventory', icon: ArchiveBoxIcon },
    { name: 'Services', href: '/admin/services', icon: SparklesIcon },
    { name: 'Orders', href: '/admin/orders', icon: ClipboardDocumentListIcon },
    { name: 'Customers', href: '/admin/customers', icon: UserGroupIcon },
    { name: 'People', href: '/admin/people', icon: IdentificationIcon },
    { name: 'Settings', href: '/admin/settings', icon: Cog6ToothIcon },
];

export default function AdminSideBar() {
    const pathname = usePathname();
    const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        // Auto-expand menu if child is active
        NAV_ITEMS.forEach(item => {
            if (item.children?.some(child => pathname.startsWith(child.href))) {
                setExpandedMenus(prev => prev.includes(item.name) ? prev : [...prev, item.name]);
            }
        });
    }, [pathname]);

    const toggleMenu = (name: string) => {
        if (isCollapsed) {
            setIsCollapsed(false);
            setExpandedMenus(prev => [...prev, name]); // Ensure it opens when expanding sidebar
            return;
        }

        setExpandedMenus(prev =>
            prev.includes(name)
                ? prev.filter(item => item !== name)
                : [...prev, name]
        );
    };

    return (
        <aside
            className={`${isCollapsed ? 'w-20' : 'w-64'} bg-gray-50 shadow-lg rounded-3xl text-gray-700 flex flex-col shrink-0 transition-all duration-300 z-20 overflow-hidden relative border-2 border-white`}
        >
            <div className={`p-4 border-b border-gray-200 h-14 bg-gray-50 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                <div className={`overflow-hidden transition-all duration-300 flex items-center ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wider opacity-80 whitespace-nowrap">
                        Admin Menu
                    </span>
                </div>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-1.5 rounded-lg hover:text-lime-500 text-gray-500 transition-all duration-300"
                >
                    {isCollapsed ? (
                        <Bars3Icon className="w-6 h-6 shrink-0" />
                    ) : (
                        <Bars3Icon className="w-6 h-6 shrink-0" />
                    )}
                </button>
            </div>

            <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {NAV_ITEMS.map((item) => {
                    const hasChildren = item.children && item.children.length > 0;
                    const isExpanded = expandedMenus.includes(item.name);

                    // Check if parent is active (exact match) OR if any child is active (nested match)
                    const isActiveParent = pathname === item.href ||
                        (hasChildren && item.children?.some(c => pathname.startsWith(c.href)));

                    return (
                        <div key={item.name} className="flex flex-col mb-1 px-3">
                            {hasChildren ? (
                                <div className="flex flex-col">
                                    <div
                                        className={`group relative flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-xl text-sm duration-300 transition-all cursor-pointer select-none border border-transparent
                                        ${isActiveParent
                                                ? 'bg-gray-100 text-gray-900 font-medium'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            }`}
                                        title={isCollapsed ? item.name : ''}
                                    >
                                        <span
                                            className={`absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full transition-all duration-300 opacity-0
                                                ${isActiveParent ? 'opacity-100' : 'group-hover:opacity-50'}
                                            `}
                                        />

                                        <div
                                            className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 flex-1 ml-2'}`}
                                            onClick={() => toggleMenu(item.name)}
                                        >
                                            <item.icon className={`w-6 h-6 shrink-0 ${isActiveParent ? 'text-lime-700' : 'text-gray-500 group-hover:text-lime-600'}`} />
                                            <div className={`flex-1 overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                                                <span className="flex-1 font-medium z-10 outline-none truncate block">
                                                    {item.name}
                                                </span>
                                            </div>
                                        </div>

                                        <div className={`transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleMenu(item.name);
                                                }}
                                                className="p-1 rounded-md text-gray-400 hover:text-gray-800 transition-colors z-20"
                                            >
                                                {isExpanded ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="4 4 14 14" fill="currentColor" className="w-3 h-3">
                                                        <path d="M7 10l5 5 5-5z" />
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="4 4 14 14" fill="currentColor" className="w-3 h-3">
                                                        <path d="M10 7l5 5-5 5v-10z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Render Children - only if not collapsed */}
                                    <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded && !isCollapsed ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <div className="relative ml-8 pl-2 mt-1 space-y-1 border-l-2 border-gray-100">
                                            {item.children!.map((child) => {
                                                const isChildActive = pathname.startsWith(child.href);
                                                return (
                                                    <Link
                                                        key={child.name}
                                                        href={child.href}
                                                        className={`relative flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-all duration-200 group/child
                                                        ${isChildActive
                                                                ? 'text-lime-800 bg-lime-50 font-medium'
                                                                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        {/* Simple dot indicator instead of icon */}
                                                        <div className={`w-1.5 h-1.5 rounded-full transition-colors ${isChildActive ? 'bg-lime-500' : 'bg-gray-300 group-hover/child:bg-gray-400'}`} />
                                                        <span className="truncate">{child.name}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <Link
                                    href={item.href}
                                    title={isCollapsed ? item.name : ''}
                                    className={`group relative flex items-center ${isCollapsed ? 'justify-center' : 'justify-start gap-3'} px-3 py-2.5 rounded-xl text-sm duration-300 transition-all border border-transparent
                                    ${pathname === item.href
                                            ? 'bg-gray-100 text-gray-900 font-medium'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                >
                                    <item.icon className={`w-6 h-6 shrink-0 ${!isCollapsed && 'ml-2'} ${pathname === item.href ? 'text-lime-700' : 'text-gray-500 group-hover:text-lime-600'}`} />
                                    <div className={`flex-1 overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                                        <span className="font-medium truncate block">{item.name}</span>
                                    </div>
                                </Link>
                            )}
                        </div>
                    );
                })}
            </nav>
        </aside>
    );
}