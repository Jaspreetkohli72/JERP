"use client";
import React from 'react';
import Link from 'next/link';
import { useFinance } from '@/context/FinanceContext';
import { Plus, FileText, Calendar, ArrowRight, ArrowLeft } from 'lucide-react';

export default function EstimatesPage() {
    // @ts-ignore
    const { estimates = [] } = useFinance();

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 text-white max-w-[1200px] mx-auto mb-20">
            {/* Header */}
            <div className="flex items-center gap-4 mb-2">
                <Link href="/contracting" className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] bg-clip-text text-transparent">Estimates</h1>
                    <p className="text-muted text-sm mt-1">Manage project quotes and proposals.</p>
                </div>
                <Link href="/contracting/estimates/new" className="bg-[var(--accent)] text-black px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                    <Plus size={18} /> New Estimate
                </Link>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {estimates && estimates.length > 0 ? (
                    estimates.map((est: any) => (
                        <Link key={est.id} href={`/contracting/estimates/${est.id}`} className="glass p-6 rounded-2xl border border-white/5 hover:border-[var(--accent)]/50 transition-colors group flex flex-col justify-between min-h-[220px]">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <h2 className="font-bold text-2xl text-gray-200 truncate pr-4">{est.client_name}</h2>
                                        <p className="text-sm text-muted mt-1">{est.project_name || 'No project name'}</p>
                                    </div>
                                    <span className={`text-xs uppercase font-bold px-3 py-1.5 rounded-full tracking-wider ${est.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                        est.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                            'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                        {est.status}
                                    </span>
                                </div>

                                <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={14} />
                                        <span>{new Date(est.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <FileText size={14} />
                                        <span>{est.estimate_items?.length || 0} Items</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Total Estimate</p>
                                    <span className="text-3xl font-bold text-[var(--accent)]">₹{Number(est.total_amount).toLocaleString()}</span>
                                </div>
                                <div className="p-3 rounded-full bg-white/5 -rotate-45 group-hover:rotate-0 transition-transform duration-300">
                                    <ArrowRight size={20} className="text-gray-400 group-hover:text-white" />
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="col-span-full text-center py-24 text-muted flex flex-col items-center justify-center glass rounded-3xl border border-dashed border-white/10">
                        <FileText size={64} className="mb-6 opacity-20" />
                        <p className="text-xl font-bold text-gray-300">No estimates found</p>
                        <p className="text-gray-500 max-w-sm mt-2">Create your first estimate to start tracking quotes and proposals for your clients.</p>
                        <Link href="/contracting/estimates/new" className="mt-8 bg-[var(--accent)] text-black px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity">
                            Create New Estimate
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
