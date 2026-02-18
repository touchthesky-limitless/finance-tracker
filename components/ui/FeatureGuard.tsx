import React from "react";
import { Lock } from "lucide-react";
import { FEATURE_LOCKS, FeatureKey } from "@/config/navigation";

interface FeatureGuardProps {
    feature?: FeatureKey;
    isLocked?: boolean;
    children: React.ReactElement; // Must be a single React element
    className?: string;
}

export function FeatureGuard({ feature,isLocked:manualLock, children, className = "" }: FeatureGuardProps) {
    const locked = manualLock ?? (feature ? FEATURE_LOCKS[feature] : false);

    // If the feature is free, just return the child as-is
    if (!locked) return children;

    return (
        <div className={`relative group w-full ${className}`}>
            {/* 1. Visual Shield: Makes the content look disabled */}
            <div className="opacity-40 grayscale pointer-events-none select-none">
                {children}
            </div>

            {/* 2. Lock Icon Overlay */}
            <div className="absolute inset-0 flex items-center justify-end px-3 pointer-events-none">
                <div className="bg-white/80 dark:bg-black/40 backdrop-blur-sm p-1 rounded-full shadow-sm">
                    <Lock size={12} className="text-slate-500 dark:text-slate-400" />
                </div>
            </div>

            {/* 3. Simple Tooltip */}
            <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg">
                Available in Pro Version
            </div>
        </div>
    );
}