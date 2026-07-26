"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFinance } from '@/context/FinanceContext';
import { ArrowLeft, Plus, Trash2, Save, Wand2 } from 'lucide-react';
import Link from 'next/link';
import CustomSelect from '@/components/CustomSelect';

interface BillItem {
    description: string;
    quantity: number;
    weight: number;
    rate: number;
    amount: number;
}

export default function CreateBillPage() {
    const router = useRouter();
    // @ts-ignore
    const { createBill, estimates } = useFinance();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        client_name: '',
        project_name: '',
        bill_date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        estimate_id: ''
    });

    const [items, setItems] = useState<BillItem[]>([
        { description: '', quantity: 1, weight: 0, rate: 0, amount: 0 }
    ]);

    // Import from Estimate Logic
    const handleEstimateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const estId = e.target.value;
        setFormData({ ...formData, estimate_id: estId });

        if (estId && estimates) {
            // @ts-ignore
            const est = estimates.find(e => e.id === estId);
            if (est) {
                if (confirm(`Import items from estimate: ${est.client_name}? This will replace current items.`)) {
                    setFormData(prev => ({
                        ...prev,
                        client_name: est.client_name,
                        project_name: est.project_name || ''
                    }));

                    if (est.estimate_items) {
                        const mapped = est.estimate_items.map((i: any) => {
                            const qty = Number(i.quantity) || 1;
                            const wt = Number(i.total_weight || i.weight) || 0;
                            const rate = Number(i.rate) || 0;
                            const amount = Number(i.amount) || (wt > 0 ? wt * rate : qty * rate);
                            return {
                                description: i.description || i.category || '',
                                quantity: qty,
                                weight: wt,
                                rate: rate,
                                amount: amount
                            };
                        });
                        setItems(mapped);
                    }
                }
            }
        }
    };

    const handleItemChange = (index: number, field: keyof BillItem, value: any) => {
        const newItems = [...items];
        // @ts-ignore
        newItems[index][field] = value;

        if (['quantity', 'weight', 'rate'].includes(field)) {
            const qty = Number(newItems[index].quantity) || 0;
            const wt = Number(newItems[index].weight) || 0;
            const rate = Number(newItems[index].rate) || 0;

            const calcAmount = wt > 0 ? wt * rate : qty * rate;
            newItems[index].amount = Math.round((calcAmount + Number.EPSILON) * 100) / 100;
        }

        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { description: '', quantity: 1, weight: 0, rate: 0, amount: 0 }]);
    };

    const removeItem = (index: number) => {
        if (items.length === 1) return;
        setItems(items.filter((_, i) => i !== index));
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.amount || 0), 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const total_amount = calculateTotal();

        const submitData = {
            ...formData,
            total_amount,
            estimate_id: formData.estimate_id === '' ? null : formData.estimate_id
        };

        const { success } = await createBill(submitData, items);

        if (success) {
            router.push('/contracting/bills');
        } else {
            alert('Failed to save bill');
        }
        setLoading(false);
    };

    return (
        <div className="p-4 md:p-8 text-white max-w-[1200px] mx-auto mb-20">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/contracting/bills" className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-2xl font-bold">New Bill Invoice</h1>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {/* Client Info */}
                <div className="glass p-6 rounded-xl flex flex-col gap-4">
                    <div className="flex justify-between items-center border-b border-white/10 pb-2">
                        <h2 className="text-lg font-semibold text-[var(--accent)]">Billing Details</h2>
                        <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 px-3 py-1.5 rounded-lg">
                            <Wand2 size={12} className="text-[var(--accent)]" />
                            <span>Quick Import:</span>
                            <CustomSelect
                                placeholder="Select Estimate..."
                                value={formData.estimate_id}
                                onChange={val => handleEstimateSelect({ target: { value: val } } as any)}
                                className="relative max-w-[150px] inline-block"
                                triggerClassName="px-2 py-1 bg-transparent text-white text-xs border-none"
                                options={[
                                    { value: "", label: "Select Estimate..." },
                                    ...(estimates || []).map((est: any) => ({
                                        value: est.id,
                                        label: `${est.client_name} - ${est.project_name}`
                                    }))
                                ]}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-gray-400">Client Name *</label>
                            <input required type="text" className="input-field bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none" value={formData.client_name} onChange={e => setFormData({ ...formData, client_name: e.target.value })} placeholder="e.g. Rahul Sharma" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-gray-400">Project Name</label>
                            <input type="text" className="input-field bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none" value={formData.project_name} onChange={e => setFormData({ ...formData, project_name: e.target.value })} placeholder="e.g. Grill Work" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-gray-400">Bill Date</label>
                            <input type="date" className="input-field bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none [color-scheme:dark]" value={formData.bill_date} onChange={e => setFormData({ ...formData, bill_date: e.target.value })} />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-gray-400">Status</label>
                            <CustomSelect
                                value={formData.status}
                                onChange={val => setFormData({ ...formData, status: val as string })}
                                triggerClassName="px-4 py-2 text-sm"
                                options={[
                                    { value: "Pending", label: "Pending" },
                                    { value: "Paid", label: "Paid" }
                                ]}
                            />
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="glass p-6 rounded-xl flex flex-col gap-4">
                    <h2 className="text-lg font-semibold text-[var(--accent)] border-b border-white/10 pb-2">Bill Items</h2>

                    <div className="flex flex-col gap-2">
                        {/* Header Row */}
                        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] gap-3 mb-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <div>Item Type</div>
                            <div className="text-center">No. of Items</div>
                            <div className="text-center">Weight (kg)</div>
                            <div className="text-center">Rate (₹)</div>
                            <div className="text-right">Amount</div>
                            <div></div>
                        </div>

                        {items.map((item, index) => (
                            <div key={index} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] gap-3 items-center mb-2">

                                {/* Item Type */}
                                <input
                                    type="text"
                                    placeholder="e.g. Angle 50x5"
                                    className="input-field bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none w-full text-white"
                                    value={item.description || ''}
                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                />

                                {/* Number of Items */}
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="input-field bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-sm focus:border-[var(--accent)] focus:outline-none w-full text-white text-center"
                                    value={item.quantity || ''}
                                    onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                />

                                {/* Weight in kg */}
                                <input
                                    type="number"
                                    placeholder="0 kg"
                                    className="input-field bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-sm focus:border-[var(--accent)] focus:outline-none w-full text-white text-center"
                                    value={item.weight || ''}
                                    onChange={(e) => handleItemChange(index, 'weight', parseFloat(e.target.value) || 0)}
                                />

                                {/* Rate in rs */}
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    className="input-field bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-sm focus:border-[var(--accent)] focus:outline-none w-full text-white text-center"
                                    value={item.rate || ''}
                                    onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                                />

                                {/* Amount */}
                                <div className="text-right text-green-400 font-bold pointer-events-none">
                                    ₹{Number(item.amount || 0).toLocaleString()}
                                </div>

                                <button type="button" onClick={() => removeItem(index)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center justify-center">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button type="button" onClick={addItem} className="mt-4 text-[var(--accent)] text-sm font-semibold hover:underline flex items-center gap-1 w-fit">
                        <Plus size={16} /> Add Item
                    </button>
                </div>

                {/* Footer */}
                <div className="glass p-6 rounded-xl flex items-center justify-between sticky bottom-4 z-10 border border-white/10 shadow-xl">
                    <div className="text-xl font-bold">
                        Grand Total: <span className="text-[var(--accent)]">₹{calculateTotal().toLocaleString()}</span>
                    </div>
                    <button type="submit" disabled={loading} className="bg-[var(--accent)] text-black px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center gap-2">
                        {loading ? 'Saving...' : <><Save size={20} /> Generate Bill</>}
                    </button>
                </div>
            </form>
        </div>
    );
}
