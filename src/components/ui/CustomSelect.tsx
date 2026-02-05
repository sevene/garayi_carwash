import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';

export interface SelectOption {
    label: string;
    value: string | number;
}

interface CustomSelectProps {
    options: SelectOption[];
    value?: string | number | null;
    onChange: (value: string | number) => void;
    placeholder?: string;
    label?: string;
    className?: string;
    disabled?: boolean;
    required?: boolean;
    error?: boolean;
    name?: string;
    id?: string;
}

export default function CustomSelect({
    options,
    value,
    onChange,
    placeholder = "Select an option",
    label,
    className = "",
    disabled = false,
    required = false,
    error = false,
    name,
    id
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const inputId = id || name;

    // Update position of dropdown
    const updatePosition = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const isClickInsideContainer = containerRef.current && containerRef.current.contains(target);
            const isClickInsideDropdown = dropdownRef.current && dropdownRef.current.contains(target);

            if (!isClickInsideContainer && !isClickInsideDropdown) {
                setIsOpen(false);
            }
        };

        const handleScroll = (event: Event) => {
            // Close only if scrolling happens outside the dropdown (e.g., main window scroll)
            // If the scroll event target is the dropdown or inside it, do not close.
            const target = event.target as Node;
            if (isOpen && dropdownRef.current && !dropdownRef.current.contains(target)) {
                setIsOpen(false);
            }
        };

        const handleResize = () => {
            if (isOpen) updatePosition();
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true); // Capture scroll events from any parent
        window.addEventListener('resize', handleResize);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleResize);
        };
    }, [isOpen]);

    // Recalculate position when opening
    useEffect(() => {
        if (isOpen) {
            updatePosition();
        }
    }, [isOpen]);

    const selectedOption = options.find(o => o.value === value);

    const dropdownContent = (
        <div
            ref={dropdownRef}
            className="fixed z-9999 bg-white shadow-xl rounded-lg text-base ring-1 ring-gray-200 ring-opacity-5 overflow-hidden focus:outline-none sm:text-sm mt-1"
            style={{
                top: coords.top,
                left: coords.left,
                width: coords.width,
            }}
        >
            <div className="max-h-60 overflow-auto py-1">
                {options.length === 0 ? (
                    <div className="cursor-default select-none relative py-2 px-3 text-gray-500 text-center">
                        No options available.
                    </div>
                ) : (
                    options.map((option) => (
                        <div
                            key={option.value}
                            className={`cursor-pointer select-none relative py-2 pl-3 pr-9 text-left hover:bg-lime-50 transition-colors ${value === option.value ? 'bg-lime-50 text-lime-900 font-medium' : 'text-neutral-500'
                                }`}
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent click from closing immediately via outside click handler
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                        >
                            <span className="block truncate">
                                {option.label}
                            </span>

                            {value === option.value && (
                                <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-lime-600">
                                    <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                </span>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    return (
        <div className={`relative w-full ${className}`} ref={containerRef}>
            {label && (
                <label
                    htmlFor={inputId}
                    className="block text-sm font-medium text-gray-700 mb-1"
                >
                    {label}
                    {required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
            )}

            <button
                id={inputId}
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg bg-white text-left text-sm transition-all
                    ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'cursor-pointer'}
                    ${error ? ' ring-2 ring-red-500/20 border-red-300 bg-red-50 hover:border-red-400' : 'border-gray-200 hover:border-gray-300'}
                    ${isOpen ? 'ring-2 ring-lime-500/20 border-lime-500 outline-none' : ''}
                `}
            >
                <span className={`block truncate ${!selectedOption ? 'text-gray-400' : 'text-gray-900'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && !disabled && (typeof document !== 'undefined') &&
                createPortal(dropdownContent, document.body)
            }
        </div>
    );
}
