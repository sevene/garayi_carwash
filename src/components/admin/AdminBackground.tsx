'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminBackground() {
    const pathname = usePathname();
    const [bgImage, setBgImage] = useState("url('/reports-bg.png')");

    // Mapping of routes to background images
    // You can add more routes here
    const getBackgroundForRoute = (path: string) => {
        if (path.startsWith('/admin/categories')) {
            return "url('/chart-pattern-bg.png')"; // Example alternative background
        }
        if (path.startsWith('/admin/dashboard')) {
            return "url('/reports-bg.png')";
        }
        // Add more conditions as needed

        return "url('/reports-bg.png')"; // Default background
    };

    useEffect(() => {
        if (pathname) {
            setBgImage(getBackgroundForRoute(pathname));
        }
    }, [pathname]);

    return (
        <div
            className="fixed inset-0 z-0 bg-gray-200/60 pointer-events-none select-none"
        // style={{
        //     backgroundImage: bgImage,
        // }}
        />
    );
}
