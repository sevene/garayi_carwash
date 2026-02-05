'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSettings } from '@/hooks/useSettings';

/**
 * Dynamic title component that updates the browser tab title based on:
 * - Current page/section (POS, Admin, DB)
 * - Store name from settings
 */
export default function DynamicTitle() {
    const pathname = usePathname();
    const { settings, loading } = useSettings();

    useEffect(() => {
        // Wait for settings to load before updating title
        const storeName = settings?.storeName || 'Garayi';
        let section = '';

        // Determine the current section based on the pathname
        if (pathname === '/' || pathname.startsWith('/pos')) {
            section = 'POS';
        } else if (pathname.startsWith('/admin')) {
            section = 'Admin';
        } else if (pathname.startsWith('/db')) {
            section = 'Database';
        } else if (pathname.startsWith('/login')) {
            section = 'Login';
        }

        // Build the title
        const title = section ? `${section} | ${storeName}` : storeName;

        // Update document title
        document.title = title;
    }, [pathname, settings, loading]);

    // This component doesn't render anything visible
    return null;
}
