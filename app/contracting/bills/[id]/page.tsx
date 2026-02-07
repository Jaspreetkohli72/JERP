"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFinance } from '@/context/FinanceContext';
import { ArrowLeft, Trash2, Printer, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function BillDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    // @ts-ignore
    const { bills, deleteBill } = useFinance();
    const [bill, setBill] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadBill = async () => {
            // @ts-ignore
            let found = bills.find(b => b.id === id);
            if (!found) {
                const { data } = await supabase.from('bills').select('*, bill_items(*)').eq('id', id).single();
                found = data;
            }
            if (found) setBill(found);
            setLoading(false);
        };
        loadBill();
    }, [id, bills]);

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete this bill?')) {
            await deleteBill(id);
            router.push('/contracting/bills');
        }
    };

    if (loading) return <div className="p-10 text-center text-white">Loading bill...</div>;
    if (!bill) return <div className="p-10 text-center text-white">Bill not found.</div>;

    return (
        <div className="max-w-[1000px] mx-auto md:p-8 p-4 mb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 print:hidden">
                <Link href="/contracting/bills" className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-white">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex gap-3">
                    <button onClick={handleDelete} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                        <Trash2 size={20} />
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="bg-[var(--accent)] text-black px-4 py-2 rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                        <Printer size={18} /> Print Invoice
                    </button>
                </div>
            </div>

            {/* Printable View */}
            <div className="bg-white text-black p-8 md:p-12 rounded-xl shadow-2xl min-h-[1000px] print:p-0 print:shadow-none print:rounded-none relative overflow-hidden">

                {/* Stamp if Paid */}
                {bill.status === 'Paid' && (
                    <div className="absolute top-10 right-10 opacity-20 transform rotate-12 pointer-events-none border-4 border-green-600 text-green-600 rounded-xl px-4 py-2 font-black text-6xl uppercase tracking-widest z-0">
                        PAID
                    </div>
                )}

                {/* Branding */}
                <div className="flex justify-between items-start border-b-2 border-gray-800 pb-8 mb-8 z-10 relative">
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tight text-gray-900">INVOICE</h1>
                        <p className="text-gray-500 text-sm mt-2">Galaxy Fabrication Experts</p>
                        <p className="text-gray-500 text-sm">Industrial Area, Sector 5<br />Phone: +91 98765 43210</p>
                    </div>
                    <div className="text-right">
                        <div className="mb-4">
                            <span className="text-xs text-gray-500 uppercase tracking-wider block">Invoice No</span>
                            <span className="text-xl font-bold font-mono">#{bill.id.substring(0, 8).toUpperCase()}</span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 uppercase tracking-wider block">Date</span>
                            <span className="font-semibold">{new Date(bill.bill_date).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                {/* Client Info */}
                <div className="mb-12 flex justify-between">
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Bill To</p>
                        <h3 className="text-2xl font-bold text-gray-900">{bill.client_name}</h3>
                        <p className="text-gray-600 mt-1 max-w-sm">{bill.project_name}</p>
                    </div>
                    <div>
                        {/* Optional Payment Info */}
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full mb-8 border-collapse">
                    <thead>
                        <tr className="bg-gray-100 text-gray-600 border-y border-gray-200">
                            <th className="py-3 px-4 text-left font-bold uppercase text-xs tracking-wider w-[40%]">Description</th>
                            <th className="py-3 px-2 text-center font-bold uppercase text-xs tracking-wider">L x W x Nos</th>
                            <th className="py-3 px-2 text-right font-bold uppercase text-xs tracking-wider">Qty</th>
                            <th className="py-3 px-2 text-center font-bold uppercase text-xs tracking-wider">Unit</th>
                            <th className="py-3 px-2 text-right font-bold uppercase text-xs tracking-wider">Rate</th>
                            <th className="py-3 px-4 text-right font-bold uppercase text-xs tracking-wider">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bill.bill_items && bill.bill_items.map((item: any, index: number) => (
                            <tr key={index} className="border-b border-gray-100">
                                <td className="py-4 px-4 font-semibold text-gray-800">{item.description}</td>
                                <td className="py-4 px-2 text-center text-gray-500 text-xs font-mono">
                                    {Number(item.length) > 0 ? `${Number(item.length)}` : ''}
                                    {Number(item.breadth) > 0 ? ` x ${Number(item.breadth)}` : ''}
                                    {Number(item.depth) > 0 ? ` x ${Number(item.depth)}` : ''}
                                </td>
                                <td className="py-4 px-2 text-right text-gray-800">{Number(item.quantity).toLocaleString()}</td>
                                <td className="py-4 px-2 text-center text-xs text-gray-400 uppercase">{item.unit}</td>
                                <td className="py-4 px-2 text-right text-gray-600">₹{Number(item.rate).toLocaleString()}</td>
                                <td className="py-4 px-4 text-right font-bold text-gray-900">₹{Number(item.amount).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end">
                    <div className="w-64">
                        <div className="flex justify-between py-2 border-b border-gray-100 text-gray-500">
                            <span>Subtotal</span>
                            <span>₹{Number(bill.total_amount).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between py-4 text-xl font-bold text-gray-900">
                            <span>Grand Total</span>
                            <span>₹{Number(bill.total_amount).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-20 pt-8 border-t border-gray-200">
                    <div className="flex justify-between items-end">
                        <div className="text-gray-500 text-xs max-w-md">
                            <p className="font-bold uppercase mb-2 text-gray-400">Payment Terms</p>
                            <p>Payment is due within 15 days.<br />Please quote invoice number in all transfers.</p>
                        </div>
                        <div className="text-center">
                            <div className="h-16 w-40 border-b border-gray-800 mb-2"></div>
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Authorized Signature</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
