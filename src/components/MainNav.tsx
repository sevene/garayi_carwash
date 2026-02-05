// components/MainNav.tsx
// This component requires the 'use client' directive for hooks (usePathname).
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { BellIcon } from '@heroicons/react/24/outline';
import { useNotifications } from '@/hooks/useNotifications';
import { NetworkStatus } from './NetworkStatus';

export function MainNav() {
    const pathname = usePathname();

    const getLinkClasses = (path: string) => {
        // Checks if the current path matches the link path or is a sub-path (e.g. /admin/products matches /admin)
        // We ensure exact match OR starts with path/ to avoid partial word matches if we had them (like /admin vs /administrator)
        const isActive = pathname === path || pathname?.startsWith(`${path}/`);

        // Base styling for consistency and size
        const baseClasses = "py-1 px-2 text-sm font-light transition duration-150 ease-in-out";

        if (isActive) {
            // Active style: White pill background for a selected tab look
            return `${baseClasses} text-lg font-bold text-lime-300 drop-shadow-[0_0_10px_rgba(240,255,0,0.8)]`;
        } else {
            // Inactive style: Light text on dark header, with hover feedback
            // Note: If you want a border on the inactive links, add it here (e.g., 'border-2 border-blue-600')
            return `${baseClasses} text-gray-100 hover:text-lime-300`;
        }
    }

    const { notificationCount } = useNotifications();

    return (
        // Static header, h-16 (4rem), occupying space in the document flow.
        <header className="shrink-0 flex justify-between items-center h-16 bg-neutral-700 px-6 m-0 z-50">

            {/* Logo / Application Name */}
            <div className="relative h-10 w-32">
                <Image
                    src="/logo-v4.png"
                    alt="Garayi Logo"
                    fill
                    className="object-contain object-left"
                    priority
                    sizes="128px"
                />
            </div>

            {/* Navigation and Actions */}
            <div className="flex items-center gap-6">

                {/* Network Status */}
                <NetworkStatus />

                {/* Notification Bell */}
                <button className="relative p-1.5 text-gray-300 hover:text-white transition-colors">
                    <BellIcon className="h-6 w-6" />
                    {notificationCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-1 ring-white/10 animate-in zoom-in duration-300">
                            {notificationCount > 99 ? '99+' : notificationCount}
                        </span>
                    )}
                </button>

                {/* Navigation Links */}
                <nav className="flex space-x-2">

                    {/* POS Link (Root page) */}
                    <Link href="/pos" className={getLinkClasses('/pos')} prefetch={false}>
                        POS
                    </Link>

                    {/* Admin Link */}
                    <Link href="/admin" className={getLinkClasses('/admin')} prefetch={false}>
                        Admin
                    </Link>

                </nav>
            </div>
        </header>
    );
}
