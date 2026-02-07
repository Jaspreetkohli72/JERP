"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFinance } from '@/context/FinanceContext';
import { ArrowLeft, Plus, Trash2, Save, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';

export default function CreateMeasurementPage() {
    const router = useRouter();
    // @ts-ignore
    const { createMeasurement, estimates } = useFinance();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        date: new Date().toISOString().split('T')[0],
        estimate_id: ''
    });

    // M-Book Items: Description, Length, Width (Breadth), Nos (Depth), Quantity
    // depth is repurposed as 'Nos' (Count) for Steel Fabrication mode
    const [items, setItems] = useState([
        { description: '', length: 0, breadth: 0, depth: 1, unit: 'sqft', quantity: 0 }
    ]);

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items];
        // @ts-ignore
        newItems[index][field] = value;

        // Auto-calculate quantity
        // Logic: Length * Width * Nos
        if (['length', 'breadth', 'depth'].includes(field)) {
            const l = Number(newItems[index].length) || 0;
            const b = Number(newItems[index].breadth) || 0;
            const nos = Number(newItems[index].depth) || 0; // 'depth' stored as Nos

            let qty = 0;
            // Default calculation: L * W * Nos
            qty = l * b * nos;

            // Round to 2 decimals
            newItems[index].quantity = Math.round((qty + Number.EPSILON) * 100) / 100;
        }

        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { description: '', length: 0, breadth: 0, depth: 1, unit: 'sqft', quantity: 0 }]);
    };

    const removeItem = (index: number) => {
        if (items.length === 1) return;
        setItems(items.filter((_, i) => i !== index));
    };

    const calculateTotalQty = () => {
        return items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const submitData = {
            ...formData,
            estimate_id: formData.estimate_id === '' ? null : formData.estimate_id
        };

        const { success } = await createMeasurement(submitData, items);

        if (success) {
            router.push('/contracting/measurements');
        } else {
            alert('Failed to save measurement');
        }
        setLoading(false);
    };

    return (
        <div className="p-4 md:p-8 text-white max-w-[1000px] mx-auto mb-20">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/contracting/measurements" className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">New Measurement (Steel/Fabrication)</h1>
                    <p className="text-sm text-gray-400">Record dimensions for Grills, Gates, Sheds (Sq.ft)</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {/* Info */}
                <div className="glass p-6 rounded-xl flex flex-col gap-4">
                    <h2 className="text-lg font-semibold text-[var(--accent)] border-b border-white/10 pb-2">Record Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-gray-400">Title / Location *</label>
                            <input required type="text" className="input-field bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Window Grills for Mr. Sharma" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-gray-400">Date</label>
                            <input type="date" className="input-field bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none [color-scheme:dark]" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm text-gray-400 flex items-center gap-2">
                            <LinkIcon size={14} /> Link to Estimate (Optional)
                        </label>
                        <select
                            className="input-field bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none appearance-none"
                            value={formData.estimate_id}
                            onChange={e => setFormData({ ...formData, estimate_id: e.target.value })}
                        >
                            <option value="" className="bg-gray-900 text-gray-400">-- Select Estimate --</option>
                            {estimates && estimates.map((est: any) => (
                                <option key={est.id} value={est.id} className="bg-gray-900 text-white">
                                    {est.client_name} - {est.project_name} (Total: ₹{est.total_amount})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* measurement Items */}
                <div className="glass p-6 rounded-xl flex flex-col gap-4">
                    <h2 className="text-lg font-semibold text-[var(--accent)] border-b border-white/10 pb-2">Measurements</h2>

                    <div className="flex flex-col gap-2">
                        {/* Header Row */}
                        <div className="grid grid-cols-[1fr_70px_70px_50px_60px_80px_40px] gap-2 text-xs text-gray-400 font-semibold px-2 mb-1 hidden md:grid text-center">
                            <div className="text-left">DESCRIPTION</div>
                            <div>LENGTH</div>
                            <div>WIDTH</div>
                            <div>NOS</div>
                            <div>UNIT</div>
                            <div>SQ.FT</div>
                            <div></div>
                        </div>

                        {items.map((item, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_70px_70px_50px_60px_80px_40px] gap-2 items-start bg-white/5 p-3 rounded-lg md:bg-transparent md:p-0">
                                <input type="text" placeholder="Description (e.g. Window W1)" className="input-field bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none w-full" value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} required />

                                <div className="flex items-center gap-1 md:hidden">
                                    <span className="text-xs text-gray-500 w-16">Length:</span>
                                    <input type="number" placeholder="L" className="input-field bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-sm w-full text-center" value={item.length || ''} onChange={e => handleItemChange(index, 'length', e.target.value)} min="0" step="0.01" />
                                </div>
                                <input type="number" placeholder="L" className="input-field bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-sm text-center hidden md:block focus:border-[var(--accent)] focus:outline-none" value={item.length || ''} onChange={e => handleItemChange(index, 'length', e.target.value)} min="0" step="0.01" />

                                <div className="flex items-center gap-1 md:hidden">
                                    <span className="text-xs text-gray-500 w-16">Width:</span>
                                    <input type="number" placeholder="W" className="input-field bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-sm w-full text-center" value={item.breadth || ''} onChange={e => handleItemChange(index, 'breadth', e.target.value)} min="0" step="0.01" />
                                </div>
                                <input type="number" placeholder="W" className="input-field bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-sm text-center hidden md:block focus:border-[var(--accent)] focus:outline-none" value={item.breadth || ''} onChange={e => handleItemChange(index, 'breadth', e.target.value)} min="0" step="0.01" />

                                <div className="flex items-center gap-1 md:hidden">
                                    <span className="text-xs text-gray-500 w-16">Nos:</span>
                                    <input type="number" placeholder="Nos" className="input-field bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-sm w-full text-center" value={item.depth || ''} onChange={e => handleItemChange(index, 'depth', e.target.value)} min="0" step="1" />
                                </div>
                                <input type="number" placeholder="Nos" className="input-field bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-sm text-center hidden md:block focus:border-[var(--accent)] focus:outline-none" value={item.depth || ''} onChange={e => handleItemChange(index, 'depth', e.target.value)} min="0" step="1" />

                                <select className="input-field bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-sm text-center focus:border-[var(--accent)] focus:outline-none bg-gray-900" value={item.unit} onChange={e => handleItemChange(index, 'unit', e.target.value)}>
                                    <option value="sqft">SQFT</option>
                                    <option value="rft">RFT</option>
                                    <option value="nos">NOS</option>
                                </select>

                                <div className="flex items-center gap-1 md:hidden">
                                    <span className="text-xs text-gray-500 w-16">Total:</span>
                                    <div className="input-field flex items-center justify-end bg-black/20 text-[var(--accent)] font-bold pointer-events-none rounded-lg px-4 py-2 text-sm w-full">
                                        {Number(item.quantity).toLocaleString()}
                                    </div>
                                </div>
                                <div className="input-field flex items-center justify-center bg-black/20 text-[var(--accent)] font-bold pointer-events-none rounded-lg px-2 py-2 text-sm hidden md:flex">
                                    {Number(item.quantity).toLocaleString()}
                                </div>

                                <button type="button" onClick={() => removeItem(index)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center justify-center h-full">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button type="button" onClick={addItem} className="mt-2 text-[var(--accent)] text-sm font-semibold hover:underline flex items-center gap-1 w-fit">
                        <Plus size={16} /> Add Entry
                    </button>
                </div>

                {/* Footer */}
                <div className="glass p-6 rounded-xl flex items-center justify-between sticky bottom-4 z-10 border border-white/10 shadow-xl">
                    <div className="text-xl font-bold">
                        Total {items[0]?.unit === 'rft' ? 'RFT' : 'SQFT'}: <span className="text-[var(--accent)]">{calculateTotalQty().toLocaleString()}</span>
                    </div>
                    <button type="submit" disabled={loading} className="bg-[var(--accent)] text-black px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center gap-2">
                        {loading ? 'Saving...' : <><Save size={20} /> Save Measurement</>}
                    </button>
                </div>
            </form>
        </div>
    );
}
