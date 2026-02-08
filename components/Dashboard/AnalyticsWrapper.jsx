"use client";

import dynamic from 'next/dynamic';
import React, { Suspense } from 'react';

// Lazy load Analytics
const Analytics = dynamic(() => import('./Analytics'), {
    ssr: false
});

const AnalyticsSkeleton = ({ part }) => {
    // Left Part Skeleton
    if (part === 'left') {
        return (
            <div className="flex flex-col gap-3 animate-pulse">
                {/* Header */}
                <div className="flex justify-between items-center px-4 pt-4 mb-1">
                    <div className="h-3 w-32 bg-white/10 rounded-full" />
                    <div className="h-3 w-40 bg-white/5 rounded-full" />
                </div>

                {/* Bar Chart Card Skeleton */}
                <div className="glass-soft p-3 rounded-[26px] h-[220px] bg-white/5" />

                {/* Donut Chart Card Skeleton */}
                <div className="glass-soft p-3 rounded-[26px] h-[180px] bg-white/5" />
            </div>
        );
    }

    // Right Part Skeleton
    if (part === 'right') {
        return (
            <div className="flex flex-col gap-3 animate-pulse">
                {/* Spacer (Desktop alignment) */}
                <div className="h-0 md:h-[3.2rem]" />

                {/* Cashflow Trend Skeleton */}
                <div className="glass-soft p-3 rounded-[26px] h-[200px] bg-white/5" />
            </div>
        );
    }

    // Full / Default Skeleton
    return <div className="glass-soft h-[500px] w-full animate-pulse rounded-[26px]" />;
};

export default function AnalyticsWrapper(props) {
    return (
        <Suspense fallback={<AnalyticsSkeleton part={props.part} />}>
            <Analytics {...props} />
        </Suspense>
    );
}
