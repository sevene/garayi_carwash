import React from 'react';

interface PageHeaderProps {
    title: string;
    description?: string;
    className?: string;
}

export default function PageHeader({ title, description, className = '' }: PageHeaderProps) {
    return (
        <div className={`relative ${className}`}>
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            {description && (
                <p className="text-base font-normal text-gray-700 mt-2 tracking-wide">
                    {description}
                </p>
            )}
        </div>
    );
}
