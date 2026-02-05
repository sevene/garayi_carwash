'use client';

import { WifiIcon } from '@heroicons/react/24/outline';

export default function OfflinePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-900 p-6 text-center">
            <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center max-w-md w-full border border-gray-100">
                <div className="h-20 w-20 bg-amber-100 rounded-full flex items-center justify-center mb-6 text-amber-600">
                    <WifiIcon className="h-10 w-10" />
                </div>

                <h1 className="text-2xl font-bold mb-2">You are Offline</h1>
                <p className="text-gray-500 mb-8">
                    It looks like you lost your internet connection.
                    Some pages may not be available until you reconnect.
                </p>

                <div className="space-y-3 w-full">
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        Try Again
                    </button>
                    <a
                        href="/pos"
                        className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-6 rounded-lg transition-colors"
                    >
                        Go to POS (Offline Ready)
                    </a>
                </div>
            </div>
        </div>
    );
}
