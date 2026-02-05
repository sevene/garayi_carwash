'use client';

import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface ChartData {
    name: string;
    revenue: number;
}

interface RevenueAreaChartProps {
    data: ChartData[];
}

export default function RevenueAreaChart({ data }: RevenueAreaChartProps) {

    const chartData = {
        labels: data.map(d => d.name),
        datasets: [
            {
                label: 'Revenue',
                data: data.map(d => d.revenue),
                fill: true,
                backgroundColor: (context: any) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                    gradient.addColorStop(0, 'rgba(132, 204, 22, .9)'); // lime-500
                    gradient.addColorStop(1, 'rgba(132, 204, 22, .1)');
                    return gradient;
                },
                borderColor: '#84cc16', // lime-500
                borderWidth: 3,
                tension: 0.4, // Smooths the curve (Bezier)
                pointBackgroundColor: '#84cc16',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                titleFont: { size: 13 },
                bodyFont: { size: 13, weight: 'bold' as const },
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                    label: function (context: any) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(context.parsed.y);
                        }
                        return label;
                    }
                }
            },
        },
        scales: {
            x: {
                offset: true,
                grid: {
                    display: false,
                },
                ticks: {
                    color: '#000000', //9ca3af
                    font: { size: 11 },
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 7
                },
                border: { display: false }
            },
            y: {
                grid: {
                    color: '#f3f4f6',
                    borderDash: [8, 8], // Softer dashes
                    drawBorder: false,
                    drawTicks: false // Remove tick marks near the axis numbers
                },
                ticks: {
                    color: '#000000', //9ca3af
                    font: { size: 11 },
                    padding: 12, // More breathing room
                    callback: function (value: any) {
                        return '₱' + value; // Simplify
                    },
                    maxTicksLimit: 5
                },
                border: { display: false },
                beginAtZero: true
            },
        },
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
    };

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No data for selected period
            </div>
        );
    }

    return (
        <div className="w-full h-full">
            <Line data={chartData} options={options} />
        </div>
    );
}
