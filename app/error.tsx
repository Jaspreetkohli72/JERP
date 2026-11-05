'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Unhandled App Router Error:', error);
    }, [error]);

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
            <div className="glass-soft max-w-md w-full p-8 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-2xl font-bold">
                    !
                </div>
                <h2 className="text-xl font-bold text-white tracking-wide">
                    Something went wrong
                </h2>
                <p className="text-sm text-white/60 leading-relaxed">
                    A temporary error occurred while rendering this page. The server or database may be reconnecting.
                </p>
                {error?.digest && (
                    <div className="text-xs text-white/30 font-mono bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                        Digest: {error.digest}
                    </div>
                )}
                <button
                    onClick={() => reset()}
                    className="mt-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98]"
                >
                    Try Again
                </button>
            </div>
        </div>
    );
}

