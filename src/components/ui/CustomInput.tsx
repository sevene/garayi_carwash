'use client';

import React from 'react';

interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
    label?: string;
    error?: boolean;
    multiline?: boolean;
    rows?: number;
}

export default function CustomInput({
    label,
    className = '',
    error = false,
    disabled = false,
    required = false,
    multiline = false,
    id,
    ...props
}: CustomInputProps) {
    const inputId = id || props.name;

    return (
        <div className={`w-full ${className}`}>
            {label && (
                <label
                    htmlFor={inputId}
                    className="block text-sm font-medium text-gray-700 mb-1"
                >
                    {label}
                    {required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
            )}
            {multiline ? (
                <textarea
                    id={inputId}
                    disabled={disabled}
                    required={required}
                    className={`
                        w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all duration-200
                        text-gray-900 placeholder-gray-400 min-h-20 resize-y
                        ${disabled
                            ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200'
                            : 'bg-white'
                        }
                        ${error
                            ? 'border-red-300 ring-4 ring-red-500/10 focus:border-red-500 focus:ring-red-500/20'
                            : 'border-gray-200 hover:border-gray-300 focus:border-lime-500 focus:ring-4 focus:ring-lime-500/10'
                        }
                    `}
                    {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
                />
            ) : (
                <input
                    id={inputId}
                    disabled={disabled}
                    required={required}
                    className={`
                        w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all duration-200
                        text-gray-900 placeholder-gray-400
                        ${disabled
                            ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200'
                            : 'bg-white'
                        }
                        ${error
                            ? 'border-red-300 ring-4 ring-red-500/10 focus:border-red-500 focus:ring-red-500/20'
                            : 'border-gray-200 hover:border-gray-300 focus:border-lime-500 focus:ring-4 focus:ring-lime-500/10'
                        }
                    `}
                    {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
                />
            )}
        </div>
    );
}
