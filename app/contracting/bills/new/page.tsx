"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFinance } from '@/context/FinanceContext';
import { ArrowLeft, Plus, Trash2, Save, Wand2 } from 'lucide-react';
import Link from 'next/link';

interface BillItem {
    category?: string;
    inventory_id?: string;
    description: string;
    length?: number;
    breadth?: number;
    depth?: number;
    unit?: string;
    quantity: number;
    rate: number;
    amount: number;
}

export default function CreateBillPage() {
    const router = useRouter();
    // @ts-ignore
    const { createBill, estimates, inventory } = useFinance();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        client_name: '',
        project_name: '',
        bill_date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        estimate_id: ''
    });

    const [items, setItems] = useState<BillItem[]>([
        { category: '', inventory_id: '', description: '', length: 0, breadth: 0, depth: 1, unit: 'sqft', quantity: 0, rate: 0, amount: 0 }
    ]);

    // Quick Add State
    const [quickAdd, setQuickAdd] = useState({
        type: '',
        dimension: '',
        qty: 1
    });

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
                        // Map estimate items to bill items (checking for new unit fields)
                        const mapped = est.estimate_items.map((i: any) => ({
                            description: i.description,
                            length: i.length || 0,
                            breadth: i.breadth || 0,
                            depth: i.depth || 1, // Nos
                            unit: i.unit === 'rft' ? 'ft' : (i.unit || 'sqft'),
                            quantity: i.quantity,
                            rate: i.rate,
                            amount: i.amount
                        }));
                        setItems(mapped);
                    }
                }
            }
        }
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items];
        // @ts-ignore
        newItems[index][field] = value;

        // Auto-Calc
        if (['length', 'breadth', 'depth', 'quantity', 'rate', 'unit'].includes(field)) {
            const l = Number(newItems[index].length) || 0;
            const b = Number(newItems[index].breadth) || 0;
            const nos = Number(newItems[index].depth) || 0;
            let qty = newItems[index].quantity;
            const u = newItems[index].unit;

            if (field !== 'quantity' && field !== 'rate') {
                if (u === 'nos') qty = nos;
                else if (u === 'ft') qty = l * nos;
                else if (u === 'in') qty = l * nos;
                else qty = l * b * nos; // sqft

                newItems[index].quantity = Math.round((qty + Number.EPSILON) * 100) / 100;
            }

            newItems[index].amount = Number(newItems[index].quantity) * Number(newItems[index].rate);
        }

        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { category: '', inventory_id: '', description: '', quantity: 1, rate: 0, amount: 0 }]);
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
                            <select
                                className="bg-transparent focus:outline-none text-white max-w-[150px] truncate"
                                value={formData.estimate_id}
                                onChange={handleEstimateSelect}
                            >
                                <option value="" className="bg-gray-900">Select Estimate...</option>
                                {estimates && estimates.map((est: any) => (
                                    <option key={est.id} value={est.id} className="bg-gray-900">
                                        {est.client_name} - {est.project_name}
                                    </option>
                                ))}
                            </select>
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
                            <select className="input-field bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none bg-gray-900" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                <option value="Pending">Pending</option>
                                <option value="Paid">Paid</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="glass p-6 rounded-xl flex flex-col gap-4">
                    <h2 className="text-lg font-semibold text-[var(--accent)] border-b border-white/10 pb-2">Bill Items</h2>

                    <div className="flex flex-col gap-2">
                        {/* Header Row */}
                        <div className="grid grid-cols-[1.5fr_3fr_0.6fr_0.8fr_1fr_40px] gap-3 mb-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <div>Item Type</div>
                            <div>Dimensions</div>
                            <div className="text-center">Qty</div>
                            <div className="text-center">Rate</div>
                            <div className="text-right">Amount</div>
                            <div></div>
                        </div>

                        {items.map((item, index) => (
                            <div key={index} className="grid grid-cols-[1.5fr_3fr_0.6fr_0.8fr_1fr_40px] gap-3 items-center mb-2">

                                {/* Item Type */}
                                <select
                                    className="input-field bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none w-full text-white"
                                    value={item.category || ''}
                                    onChange={(e) => {
                                        const newCategory = e.target.value;
                                        const newItems = [...items];
                                        newItems[index] = {
                                            ...newItems[index],
                                            category: newCategory,
                                            inventory_id: '',
                                            description: '',
                                            rate: 0,
                                            amount: 0
                                        };
                                        setItems(newItems);
                                    }}
                                >
                                    <option value="" className="bg-black text-white">Select Type</option>
                                    {/* @ts-ignore */}
                                    {Array.from(new Set(inventory?.map(i => {
                                        if (i.category && i.category !== 'Raw Material' && i.category !== 'Hardware') return i.category;

                                        // Whitelist for structural types
                                        const name = i.item_name || '';
                                        const KNOWN_TYPES = ['Angle', 'Channel', 'Flat Bar', 'Round', 'Square', 'Rectangular', 'Garder', 'Beam', 'Pipe', 'Sheet', 'Plate', 'Welding', 'CNC'];

                                        for (const type of KNOWN_TYPES) {
                                            if (name.startsWith(type)) return type;
                                        }

                                        return 'Hardware';
                                    }))).sort().map(cat => (
                                        // @ts-ignore
                                        <option key={cat} value={cat} className="bg-black text-white">{cat}</option>
                                    ))}
                                </select>

                                {/* Dimensions */}
                                <select
                                    className="input-field bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none w-full text-white"
                                    value={item.inventory_id || ''}
                                    onChange={(e) => {
                                        const newId = e.target.value;
                                        if (!newId) return;
                                        // @ts-ignore
                                        const selected = inventory.find(i => String(i.id) === String(newId));

                                        const newItems = [...items];
                                        if (selected) {
                                            newItems[index] = {
                                                ...newItems[index],
                                                inventory_id: newId,
                                                description: selected.item_name,
                                                rate: selected.base_rate || 0,
                                                amount: (selected.base_rate || 0) * (newItems[index].quantity || 1)
                                            };
                                        }
                                        setItems(newItems);
                                    }}
                                    disabled={!item.category}
                                >
                                    <option value="" className="bg-black text-white">Select Size</option>
                                    {/* @ts-ignore */}
                                    {inventory?.filter(i => {
                                        let type = i.category;
                                        if (!type || type === 'Raw Material' || type === 'Hardware') {
                                            const name = i.item_name || '';
                                            const KNOWN_TYPES = ['Angle', 'Channel', 'Flat Bar', 'Round', 'Square', 'Rectangular', 'Garder', 'Beam', 'Pipe', 'Sheet', 'Plate', 'Welding', 'CNC'];
                                            let found = false;
                                            for (const t of KNOWN_TYPES) {
                                                if (name.startsWith(t)) {
                                                    type = t;
                                                    found = true;
                                                    break;
                                                }
                                            }
                                            if (!found) type = 'Hardware';
                                        }
                                        return type === item.category;
                                    }).map(i => {
                                        let display = i.item_name;
                                        // Only strip type if it matches strictly
                                        if (item.category && display.startsWith(item.category)) {
                                            display = display.replace(item.category, '').trim();
                                        }
                                        return <option key={i.id} value={i.id} className="bg-black text-white">{display}</option>;
                                    })}
                                </select>

                                {/* Qty */}
                                <input
                                    type="number"
                                    placeholder="00"
                                    className="input-field bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-sm focus:border-[var(--accent)] focus:outline-none w-full text-white text-center"
                                    value={item.quantity || ''}
                                    onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                                />

                                {/* Rate */}
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    className="input-field bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-sm focus:border-[var(--accent)] focus:outline-none w-full text-white text-center"
                                    value={item.rate || ''}
                                    onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value))}
                                />

                                {/* Amount */}
                                <div className="text-right text-green-400 font-bold pointer-events-none">
                                    {Number(item.amount).toLocaleString()}
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
