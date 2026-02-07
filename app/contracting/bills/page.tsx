"use client";
import React from 'react';
import Link from 'next/link';
import { useFinance } from '@/context/FinanceContext';
import { Plus, FileText, Calendar, ArrowRight, ArrowLeft } from 'lucide-react';

export default function BillsPage() {
    // @ts-ignore
    const { bills = [] } = useFinance();

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 text-white max-w-[1200px] mx-auto mb-20">
            {/* Header */}
            <div className="flex items-center gap-4 mb-2">
                <Link href="/contracting" className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] bg-clip-text text-transparent">Bills</h1>
                    <p className="text-muted text-sm mt-1">Invoices and payment tracking.</p>
                </div>
                <Link href="/contracting/bills/new" className="bg-[var(--accent)] text-black px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                    <Plus size={18} /> New Bill
                </Link>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {bills && bills.length > 0 ? (
                    bills.map((bill: any) => (
                        <Link key={bill.id} href={`/contracting/bills/${bill.id}`} className="glass p-6 rounded-2xl border border-white/5 hover:border-[var(--accent)]/50 transition-colors group flex flex-col justify-between min-h-[220px]">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <h2 className="font-bold text-xl text-gray-200 truncate pr-4">{bill.client_name}</h2>
                                        <p className="text-gray-400 text-sm truncate">{bill.project_name || 'No Project Name'}</p>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider mb-2 ${bill.status === 'Paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-500'
                                            }`}>
                                            {bill.status}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-md">
                                            <Calendar size={10} />
                                            <span>{new Date(bill.bill_date).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <div className="text-3xl font-bold text-[var(--accent)] tracking-tight">
                                        ₹{Number(bill.total_amount).toLocaleString()}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Total Bill Amount</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
                                <div className="flex items-center gap-2 text-gray-400 text-sm">
                                    <FileText size={16} />
                                    <span>{bill.bill_items?.length || 0} Items</span>
                                </div>
                                <div className="p-3 rounded-full bg-white/5 -rotate-45 group-hover:rotate-0 transition-transform duration-300">
                                    <ArrowRight size={20} className="text-gray-400 group-hover:text-white" />
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="col-span-full text-center py-20 text-muted flex flex-col items-center justify-center glass rounded-3xl border border-dashed border-white/10">
                        <FileText size={64} className="mb-6 opacity-20 text-red-400" />
                        <p className="text-xl font-bold text-gray-300">No bills generated</p>
                        <p className="text-gray-500 max-w-sm mt-2">Create formal invoices for your clients based on estimates or measurements.</p>
                        <Link href="/contracting/bills/new" className="mt-8 bg-[var(--accent)] text-black px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity">
                            Create New Bill
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
