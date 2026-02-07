"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFinance } from '@/context/FinanceContext';
import { ArrowLeft, Trash2, Printer, Ruler } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function MeasurementDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    // @ts-ignore
    const { measurements, deleteMeasurement } = useFinance();
    const [measurement, setMeasurement] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (measurements.length > 0) {
            const found = measurements.find((m: any) => m.id === id);
            if (found) {
                setMeasurement(found);
                setLoading(false);
            }
        } else {
            const fetchSingle = async () => {
                const { data } = await supabase.from('measurements').select('*, measurement_items(*)').eq('id', id).single();
                if (data) {
                    setMeasurement(data);
                }
                setLoading(false);
            };
            fetchSingle();
        }
    }, [id, measurements]);

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete this measurement?')) {
            await deleteMeasurement(id);
            router.push('/contracting/measurements');
        }
    };

    if (loading) return <div className="p-10 text-center text-white">Loading measurement...</div>;
    if (!measurement) return <div className="p-10 text-center text-white">Measurement not found.</div>;

    return (
        <div className="max-w-[1000px] mx-auto md:p-8 p-4 mb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 print:hidden">
                <Link href="/contracting/measurements" className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-white">
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
                        <Printer size={18} /> Print M-Book
                    </button>
                </div>
            </div>

            {/* Printable View */}
            <div className="bg-white text-black p-8 md:p-12 rounded-xl shadow-2xl min-h-[800px] print:p-0 print:shadow-none print:rounded-none">

                {/* Branding/Header */}
                <div className="border-b-2 border-dashed border-gray-300 pb-6 mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold uppercase tracking-wide text-gray-800 flex items-center gap-2">
                            <Ruler size={24} className="text-black" /> Measurement Sheet
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Galaxy Fabrication Experts</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-lg font-semibold text-gray-700">{measurement.title}</h2>
                        <div className="text-sm text-gray-500 mt-1">
                            Date: {new Date(measurement.date).toLocaleDateString()}
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full mb-8 border-collapse text-sm">
                    <thead>
                        <tr className="bg-gray-100 border-y border-gray-300">
                            <th className="py-3 px-2 text-left font-bold w-[40%]">Description</th>
                            <th className="py-3 px-2 text-center font-bold">Length</th>
                            <th className="py-3 px-2 text-center font-bold">Width</th>
                            <th className="py-3 px-2 text-center font-bold">Nos</th>
                            <th className="py-3 px-2 text-center font-bold">Unit</th>
                            <th className="py-3 px-2 text-right font-bold bg-gray-200">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {measurement.measurement_items && measurement.measurement_items.map((item: any, index: number) => (
                            <tr key={index} className="border-b border-gray-200">
                                <td className="py-3 px-2 font-medium">{item.description}</td>
                                <td className="py-3 px-2 text-center text-gray-600 font-mono">{Number(item.length) || '-'}</td>
                                <td className="py-3 px-2 text-center text-gray-600 font-mono">{Number(item.breadth) || '-'}</td>
                                <td className="py-3 px-2 text-center text-gray-600 font-mono">{Number(item.depth) || '-'}</td>
                                <td className="py-3 px-2 text-center uppercase text-xs text-gray-500">{item.unit}</td>
                                <td className="py-3 px-2 text-right font-bold text-gray-900 bg-gray-50">{Number(item.quantity).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-800 text-white">
                            <td colSpan={5} className="py-3 px-4 text-right font-bold uppercase tracking-wider">Total Quantity</td>
                            <td className="py-3 px-2 text-right font-bold text-[var(--accent)-print] text-white">
                                {measurement.measurement_items?.reduce((sum: number, i: any) => sum + (Number(i.quantity) || 0), 0).toLocaleString()}
                            </td>
                        </tr>
                    </tfoot>
                </table>

                {/* Footer Info */}
                <div className="mt-12 pt-8 border-t border-gray-200 flex justify-between text-xs text-gray-400">
                    <div>
                        Recorded by: Admin<br />
                        Authorized Signature
                    </div>
                    <div>
                        Generated on: {new Date().toLocaleString()}
                    </div>
                </div>
            </div>
        </div>
    );
}
