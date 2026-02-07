"use client";
import React from 'react';
import Link from 'next/link';
import { useFinance } from '@/context/FinanceContext';
import { Plus, Ruler, Calendar, ArrowRight, ArrowLeft } from 'lucide-react';

export default function MeasurementsPage() {
    // @ts-ignore
    const { measurements = [] } = useFinance();

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 text-white max-w-[1200px] mx-auto mb-20">
            {/* Header */}
            <div className="flex items-center gap-4 mb-2">
                <Link href="/contracting" className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] bg-clip-text text-transparent">Measurements</h1>
                    <p className="text-muted text-sm mt-1">Site measurement records (M-Book).</p>
                </div>
                <Link href="/contracting/measurements/new" className="bg-[var(--accent)] text-black px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                    <Plus size={18} /> New Entry
                </Link>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {measurements && measurements.length > 0 ? (
                    measurements.map((m: any) => (
                        <Link key={m.id} href={`/contracting/measurements/${m.id}`} className="glass p-6 rounded-2xl border border-white/5 hover:border-[var(--accent)]/50 transition-colors group flex flex-col justify-between min-h-[200px]">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <h2 className="font-bold text-xl text-gray-200 truncate pr-4">{m.title}</h2>
                                        <div className="text-sm text-yellow-400 mt-1 uppercase text-[10px] font-bold tracking-widest bg-yellow-500/10 w-fit px-2 py-1 rounded-full">
                                            {m.status || 'Draft'}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-white/5 px-3 py-1.5 rounded-lg">
                                        <Calendar size={12} />
                                        <span>{new Date(m.date).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="text-sm text-gray-500">
                                    {m.estimate_id ? 'Linked to Estimate' : 'Ad-hoc Measurement'}
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
                                <div className="flex items-center gap-2 text-gray-300">
                                    <Ruler size={16} className="text-[var(--accent)]" />
                                    <span className="font-semibold">{m.measurement_items?.length || 0} Entries</span>
                                </div>
                                <div className="p-3 rounded-full bg-white/5 -rotate-45 group-hover:rotate-0 transition-transform duration-300">
                                    <ArrowRight size={20} className="text-gray-400 group-hover:text-white" />
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="col-span-full text-center py-24 text-muted flex flex-col items-center justify-center glass rounded-3xl border border-dashed border-white/10">
                        <Ruler size={64} className="mb-6 opacity-20" />
                        <p className="text-xl font-bold text-gray-300">No measurements recorded</p>
                        <p className="text-gray-500 max-w-sm mt-2">Start adding site measurements to track work progress and prepare bills.</p>
                        <Link href="/contracting/measurements/new" className="mt-8 bg-[var(--accent)] text-black px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity">
                            Add Measurement
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
