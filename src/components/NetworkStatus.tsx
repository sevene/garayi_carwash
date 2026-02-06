'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { CloudIcon, SignalSlashIcon } from '@heroicons/react/24/outline';

export function NetworkStatus() {
    const isOnline = useOnlineStatus();

    if (isOnline) {
        return null;
    }

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 rounded-full border border-rose-500/20 transition-all duration-500 animate-pulse">
            <SignalSlashIcon className="w-4 h-4 text-rose-500" />
            <span className="text-xs font-medium text-rose-500">Offline</span>
        </div>
    );
}
