"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFinance } from '@/context/FinanceContext';
import { ArrowLeft, Trash2, Printer, Pencil } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function EstimateDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    // @ts-ignore
    const { estimates, deleteEstimate } = useFinance();
    const [estimate, setEstimate] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadEstimate = async () => {
            // @ts-ignore
            let found = estimates.find(e => e.id === id);
            if (!found) {
                const { data } = await supabase.from('estimates').select('*, estimate_items(*)').eq('id', id).single();
                found = data;
            }
            if (found) setEstimate(found);
            setLoading(false);
        };
        loadEstimate();
    }, [id, estimates]);

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete this estimate?')) {
            await deleteEstimate(id);
            router.push('/contracting/estimates');
        }
    };

    if (loading) return <div className="p-10 text-center text-white">Loading estimate...</div>;
    if (!estimate) return <div className="p-10 text-center text-white">Estimate not found.</div>;

    return (
        <div className="max-w-[1000px] mx-auto md:p-8 p-4 mb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 print:hidden">
                <Link href="/contracting/estimates" className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-white">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex gap-3">
                    <button onClick={handleDelete} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                        <Trash2 size={20} />
                    </button>
                    <Link href={`/contracting/estimates/${id}/edit`} className="p-2 text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors" title="Edit">
                        <Pencil size={20} />
                    </Link>
                    <button
                        onClick={() => window.print()}
                        className="bg-[var(--accent)] text-black px-4 py-2 rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                        <Printer size={18} /> Print
                    </button>
                </div>
            </div>

            {/* Printable View */}
            <div className="bg-white text-black p-8 md:p-12 rounded-xl shadow-2xl min-h-[800px] print:p-0 print:shadow-none print:rounded-none">

                {/* Branding */}
                <div className="border-b-2 border-black pb-8 mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold uppercase tracking-wide">Galaxy Fabrication Experts</h1>
                        <p className="text-sm text-gray-500 mt-1">Specialists in Steel Grills, Gates, Sheds & Structures</p>
                        <p className="text-sm text-gray-500">Contact: +91 98765 43210</p>
                    </div>
                    <div className="text-right">
                        <div className="bg-black text-white px-4 py-1 inline-block font-bold uppercase text-sm tracking-widest mb-2">Quotation</div>

                        <div className="text-sm text-gray-500 mt-2">
                            Date: {new Date(estimate.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                            Valid Until: {estimate.valid_until ? new Date(estimate.valid_until).toLocaleDateString() : '30 Days'}
                        </div>
                    </div>
                </div>

                {/* Client Info */}
                <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Prepared For</p>
                    <h3 className="text-xl font-bold text-gray-800">{estimate.client_name}</h3>
                    {estimate.project_name && <p className="text-gray-600">{estimate.project_name}</p>}
                </div>

                {/* Items Table */}
                <table className="w-full mb-8 border-collapse">
                    <thead>
                        <tr className="bg-black text-white">
                            <th className="py-3 px-4 text-left font-bold uppercase text-xs tracking-wider w-[35%]">Description</th>
                            <th className="py-3 px-2 text-center font-bold uppercase text-xs tracking-wider">L</th>
                            <th className="py-3 px-2 text-center font-bold uppercase text-xs tracking-wider">W</th>
                            <th className="py-3 px-2 text-center font-bold uppercase text-xs tracking-wider">Nos</th>
                            <th className="py-3 px-2 text-center font-bold uppercase text-xs tracking-wider">Unit</th>
                            <th className="py-3 px-2 text-right font-bold uppercase text-xs tracking-wider">Qty</th>
                            <th className="py-3 px-2 text-right font-bold uppercase text-xs tracking-wider">Rate</th>
                            <th className="py-3 px-4 text-right font-bold uppercase text-xs tracking-wider">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {estimate.estimate_items && estimate.estimate_items.map((item: any, index: number) => (
                            <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="py-4 px-4 font-medium text-gray-800">{item.description}</td>
                                <td className="py-4 px-2 text-center text-gray-500 font-mono text-xs">{Number(item.length) > 0 ? Number(item.length) : '-'}</td>
                                <td className="py-4 px-2 text-center text-gray-500 font-mono text-xs">{Number(item.breadth) > 0 ? Number(item.breadth) : '-'}</td>
                                <td className="py-4 px-2 text-center text-gray-500 font-mono text-xs">{Number(item.depth) > 0 ? Number(item.depth) : '-'}</td>
                                <td className="py-4 px-2 text-center text-xs text-gray-500 uppercase">{item.unit}</td>
                                <td className="py-4 px-2 text-right font-bold text-gray-700">{Number(item.quantity).toLocaleString()}</td>
                                <td className="py-4 px-2 text-right text-gray-600">₹{Number(item.rate).toLocaleString()}</td>
                                <td className="py-4 px-4 text-right font-bold text-gray-900">₹{Number(item.amount).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={7} className="py-6 px-4 text-right font-bold text-gray-600 uppercase tracking-wider">Total Amount</td>
                            <td className="py-6 px-4 text-right">
                                <span className="text-2xl font-bold bg-black text-white px-2 py-1">
                                    ₹{Number(estimate.total_amount).toLocaleString()}
                                </span>
                            </td>
                        </tr>
                    </tfoot>
                </table>

                {/* Terms & Footer */}
                <div className="mt-12 pt-8 border-t border-gray-200">
                    <h4 className="font-bold text-xs uppercase text-gray-400 mb-2">Terms & Conditions</h4>
                    <p className="text-sm text-gray-500 leading-relaxed max-w-2xl">
                        1. This quotation is valid for {estimate.valid_until ? 'the specified date' : '30 days'}.<br />
                        2. 50% advance payment required to start work.<br />
                        3. Final measurements will be taken on-site (M-Book) for final billing.
                    </p>

                    <div className="flex justify-between mt-12 items-end">
                        <div className="text-xs text-gray-400">
                            Prepared by<br />
                            <strong>Galaxy Fabrication Experts</strong>
                        </div>
                        <div className="h-16 w-32 border-b border-black"></div>
                    </div>
                    <div className="text-right text-xs font-bold mt-2">Authorized Signature</div>
                </div>
            </div>
        </div>
    );
}
