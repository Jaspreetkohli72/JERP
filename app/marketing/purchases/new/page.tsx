"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFinance } from '@/context/FinanceContext';
import { ArrowLeft, Plus, Trash2, Save, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

export default function NewPurchasePage() {
    // @ts-ignore
    const { suppliers, inventory, createPurchase } = useFinance();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        supplier_id: '',
        date: new Date().toISOString().split('T')[0],
        invoice_number: '',
        notes: ''
    });

    const [items, setItems] = useState([
        { inventory_item_id: '', quantity: '', rate: '', amount: 0 }
    ]);

    // Derived Logic
    const calculateTotal = () => items.reduce((sum, item) => sum + item.amount, 0);

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems: any = [...items];
        newItems[index][field] = value;

        // Auto-calculate amount
        if (field === 'quantity' || field === 'rate' || field === 'inventory_item_id') {
            // If item selected, auto-fill rate if empty
            if (field === 'inventory_item_id') {
                // @ts-ignore
                const itemData = inventory.find(i => i.id == value); // ID type mismatch potential
                if (itemData && !newItems[index].rate) {
                    newItems[index].rate = itemData.base_rate;
                }
            }

            const qty = parseFloat(newItems[index].quantity) || 0;
            const rate = parseFloat(newItems[index].rate) || 0;
            newItems[index].amount = qty * rate;
        }
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { inventory_item_id: '', quantity: '', rate: '', amount: 0 }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async () => {
        if (!formData.supplier_id) return alert("Please select a supplier");
        setLoading(true);

        const validItems = items.filter(i => i.inventory_item_id && i.quantity);
        if (validItems.length === 0) {
            setLoading(false);
            return alert("Please add at least one item");
        }

        const { success } = await createPurchase(
            { ...formData, total_amount: calculateTotal() },
            validItems
        );

        if (success) {
            router.push('/marketing');
        } else {
            alert("Failed to save purchase");
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 text-white max-w-[1000px] mx-auto mb-24">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/marketing" className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">New Purchase Entry</h1>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Form Details */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Supplier Info */}
                    <div className="glass p-6 rounded-xl border border-white/5 flex flex-col gap-4">
                        <h3 className="font-bold flex items-center gap-2"><ShoppingCart size={18} className="text-[var(--accent)]" /> Invoice Details</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 md:col-span-1">
                                <label className="text-xs text-gray-500 mb-1 block">Supplier</label>
                                <select
                                    className="input-field bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2 w-full"
                                    value={formData.supplier_id}
                                    onChange={e => setFormData({ ...formData, supplier_id: e.target.value })}
                                >
                                    <option value="">Select Supplier</option>
                                    {suppliers.map((s: any) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="text-xs text-gray-500 mb-1 block">Date</label>
                                <input
                                    type="date"
                                    className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-2 w-full [color-scheme:dark]"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs text-gray-500 mb-1 block">Invoice Number</label>
                                <input
                                    type="text"
                                    placeholder="e.g. INV-2024-001"
                                    className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-2 w-full"
                                    value={formData.invoice_number}
                                    onChange={e => setFormData({ ...formData, invoice_number: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="glass p-6 rounded-xl border border-white/5">
                        <h3 className="font-bold mb-4">Purchased Items</h3>
                        <div className="flex flex-col gap-2">
                            {items.map((item, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-center bg-white/5 p-2 rounded-lg">
                                    <div className="col-span-4">
                                        <select
                                            className="bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 w-full text-sm"
                                            value={item.inventory_item_id}
                                            onChange={e => handleItemChange(index, 'inventory_item_id', e.target.value)}
                                        >
                                            <option value="">Select Item</option>
                                            {inventory.map((i: any) => (
                                                <option key={i.id} value={i.id}>{i.item_name} ({i.unit})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            placeholder="Qty"
                                            className="bg-transparent border-b border-white/20 px-1 py-1 w-full text-center"
                                            value={item.quantity}
                                            onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            placeholder="Rate"
                                            className="bg-transparent border-b border-white/20 px-1 py-1 w-full text-center"
                                            value={item.rate}
                                            onChange={e => handleItemChange(index, 'rate', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-3 text-right font-mono text-green-400">
                                        ₹{item.amount}
                                    </div>
                                    <div className="col-span-1 text-center">
                                        <button onClick={() => removeItem(index)} className="text-red-500 hover:text-red-400 ml-1">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={addItem} className="mt-4 text-sm text-[var(--accent)] hover:underline flex items-center gap-1">
                            <Plus size={16} /> Add another item
                        </button>
                    </div>
                </div>

                {/* Right: Summary */}
                <div className="flex flex-col gap-6">
                    <div className="glass p-6 rounded-xl border border-white/5 sticky top-6">
                        <h3 className="font-bold text-gray-400 text-sm uppercase mb-4">Summary</h3>

                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-400">Items Count</span>
                            <span className="font-bold">{items.filter(i => i.inventory_item_id).length}</span>
                        </div>
                        <div className="flex justify-between items-center text-xl font-bold pt-4 border-t border-white/10 mt-4">
                            <span>Total</span>
                            <span className="text-[var(--accent)]">₹{calculateTotal().toLocaleString()}</span>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full bg-[var(--accent)] text-black font-bold py-4 rounded-xl mt-8 hover:scale-[1.02] transition-transform shadow-xl shadow-[var(--accent)]/10 flex items-center justify-center gap-2"
                        >
                            {loading ? 'Saving...' : <><Save size={20} /> Save Purchase</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
