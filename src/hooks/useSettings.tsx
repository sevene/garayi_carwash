'use client';

import { useState, useEffect } from 'react';

interface Settings {
    storeName: string;
    storeAddress: string;
    currency: string;
    taxRate: number;
    enableNotifications: boolean;
    receiptHeader: string;
    receiptFooter: string;
    printerName: string;
    theme: string;
}

export const useSettings = () => {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/settings');
                if (res.ok) {
                    const data = await res.json();
                    setSettings({
                        storeName: data.name || '',
                        storeAddress: data.address?.street || '',
                        currency: data.currency || 'PHP',
                        taxRate: data.tax_rate !== undefined ? Number(data.tax_rate) : 0.08,
                        enableNotifications: data.settings?.enableNotifications ?? true,
                        receiptHeader: data.receipt?.header || '',
                        receiptFooter: data.receipt?.footer || '',
                        printerName: data.receipt?.printerName || '',
                        theme: data.settings?.theme || 'light'
                    });
                } else {
                    setError('Failed to fetch settings');
                }
            } catch (err) {
                console.error(err);
                setError('Error fetching settings');
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const formatCurrency = (amount: number) => {
        const symbol = settings?.currency === 'USD' ? '$' : settings?.currency === 'EUR' ? '€' : '₱';
        return `${symbol}${amount.toFixed(2)}`;
    };

    const getCurrencySymbol = () => {
        if (!settings) return '₱';
        if (settings.currency === 'USD') return '$';
        if (settings.currency === 'EUR') return '€';
        return '₱'; // Default to Peso if unknown or PHP
    };

    return { settings, loading, error, formatCurrency, getCurrencySymbol };
};
