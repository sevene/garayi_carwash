'use client';

import React, { useState, useEffect } from 'react';
import ServiceForm from '@/components/admin/ServiceForm';
import { Service } from '@/lib/services';
import { useParams } from 'next/navigation';

export default function EditServicePage() {
    const params = useParams();
    const [service, setService] = useState<Service | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchService = async () => {
            try {
                const id = params?.id;
                if (!id) return;

                const res = await fetch(`/api/services/${id}`);
                if (!res.ok) throw new Error("Failed to fetch service");

                const data = await res.json() as { service: Service } | Service;
                // Handle response structure: { service: ..., costs: ... } or just { ... }
                setService('service' in data ? data.service : data);
            } catch (err) {
                console.error(err);
                setError("Failed to load service details.");
            } finally {
                setLoading(false);
            }
        };

        fetchService();
    }, [params?.id]);

    if (loading) {
        return <div className="p-10 text-center text-gray-500">Loading service details...</div>;
    }

    if (error) {
        return <div className="p-10 text-center text-red-500">{error}</div>;
    }

    if (!service) {
        return <div className="p-10 text-center text-gray-500">Service not found.</div>;
    }

    return (
        <div>
            <ServiceForm initialData={service} isEditing={true} />
        </div>
    );
}
