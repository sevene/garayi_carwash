'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { CloudIcon, SignalSlashIcon } from '@heroicons/react/24/outline';

export function NetworkStatus() {
    const isOnline = useOnlineStatus();

    if (isOnline) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 transition-all duration-500">
                <div className="relative">
                    <CloudIcon className="w-4 h-4 text-emerald-500" />
                    <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                </div>
                <span className="text-xs font-medium text-emerald-400">Online</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 rounded-full border border-rose-500/20 transition-all duration-500 animate-pulse">
            <SignalSlashIcon className="w-4 h-4 text-rose-500" />
            <span className="text-xs font-medium text-rose-500">Offline</span>
        </div>
    );
}
