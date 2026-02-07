"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFinance } from '@/context/FinanceContext';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface EstimateItem {
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

export default function EditEstimatePage() {
    const router = useRouter();
    const { id } = useParams();
    // @ts-ignore
    const { updateEstimate, estimates, inventory, staffList, settings } = useFinance();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const [formData, setFormData] = useState({
        client_name: '',
        project_name: '',
        valid_until: '',
        notes: ''
    });

    const [items, setItems] = useState<EstimateItem[]>([
        { description: '', length: 0, breadth: 0, depth: 1, unit: 'sqft', quantity: 0, rate: 0, amount: 0 }
    ]);

    // Labor State
    const [laborDetails, setLaborDetails] = useState({
        welders: 0,
        helpers: 0,
        welderRate: 0,
        helperRate: 0,
        days: 0
    });

    // Auto-fill rates from settings or staff average
    useEffect(() => {
        if (settings) {
            setLaborDetails(prev => ({
                ...prev,
                welderRate: settings.welder_rate || prev.welderRate,
                helperRate: settings.helper_rate || prev.helperRate
            }));
        } else if (staffList && staffList.length > 0) {
            // Fallback logic could be added here if needed
        }
    }, [settings, staffList]);

    // Quick Add State
    const [quickAdd, setQuickAdd] = useState({
        type: '',
        dimension: '',
        qty: 1
    });

    useEffect(() => {
        const loadEstimate = async () => {
            // @ts-ignore
            let found = estimates.find(e => e.id === id);
            if (!found) {
                const { data } = await supabase.from('estimates').select('*, estimate_items(*)').eq('id', id).single();
                found = data;
            }

            if (found) {
                setFormData({
                    client_name: found.client_name,
                    project_name: found.project_name || '',
                    valid_until: found.valid_until || '',
                    notes: found.notes || ''
                });
                if (found.estimate_items && found.estimate_items.length > 0) {
                    // Check for Labor item
                    const laborItem = found.estimate_items.find((i: any) => i.category === 'Labor');
                    if (laborItem) {
                        // Parses "Labor Charges (2 Welders, 3 Helpers @ 5 Days)"
                        const match = laborItem.description.match(/Charges \((\d+) Welders, (\d+) Helpers @ (\d+) Days\)/);
                        if (match) {
                            setLaborDetails(prev => ({
                                ...prev,
                                welders: Number(match[1]),
                                helpers: Number(match[2]),
                                days: Number(match[3])
                            }));
                        } else {
                            // Fallback for old format: "Labor Charges (X Men x Y Days)"
                            const matchOld = laborItem.description.match(/Charges \((\d+) Men x (\d+) Days\)/);
                            if (matchOld) {
                                setLaborDetails(prev => ({
                                    ...prev,
                                    welders: Number(matchOld[1]), // Assume all are welders if not specified? Or split? Let's just put in Welders.
                                    helpers: 0,
                                    days: Number(matchOld[2])
                                }));
                            }
                        }
                    }

                    // Filter out labor item for display list
                    const displayItems = found.estimate_items.filter((i: any) => i.category !== 'Labor');

                    // Map 'rft' to 'ft' if legacy data exists
                    const mappedItems = displayItems.map((i: any) => ({
                        ...i,
                        length: i.length || 0,
                        breadth: i.breadth || 0,
                        depth: i.depth || 1,
                        unit: i.unit === 'rft' ? 'ft' : (i.unit || 'sqft')
                    }));
                    setItems(mappedItems);
                }
            }
            setFetching(false);
        };
        loadEstimate();
    }, [id, estimates]);

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items];
        // @ts-ignore
        newItems[index][field] = value;

        if (['length', 'breadth', 'depth', 'quantity', 'rate', 'unit'].includes(field)) {
            const l = Number(newItems[index].length) || 0;
            const b = Number(newItems[index].breadth) || 0;
            const nos = Number(newItems[index].depth) || 0;
            let qty = newItems[index].quantity;
            const u = newItems[index].unit;

            if (field !== 'quantity' && field !== 'rate') {
                if (u === 'nos') {
                    qty = nos;
                } else if (u === 'ft') {
                    qty = l * nos; // Linear Feet
                } else if (u === 'in') {
                    qty = l * nos; // Linear Inches
                } else {
                    // sqft default
                    qty = l * b * nos;
                }
                newItems[index].quantity = Math.round((qty + Number.EPSILON) * 100) / 100;
            }

            newItems[index].amount = Number(newItems[index].quantity) * Number(newItems[index].rate);
        } else if (field === 'category' || field === 'inventory_id') {
            // If category or inventory_id changes, reset related fields
            if (field === 'category') {
                newItems[index].inventory_id = '';
                newItems[index].description = '';
                newItems[index].rate = 0;
                newItems[index].amount = 0;
            }
            if (field === 'inventory_id' && value) {
                // @ts-ignore
                const selected = inventory.find(i => String(i.id) === String(value));
                if (selected) {
                    newItems[index].description = selected.category ? `${selected.category} ${selected.item_name}` : selected.item_name;
                    newItems[index].rate = selected.base_rate || 0;
                    newItems[index].unit = selected.unit || 'nos'; // Set unit from inventory
                    // Recalculate quantity based on new unit if dimensions are present
                    const l = Number(newItems[index].length) || 0;
                    const b = Number(newItems[index].breadth) || 0;
                    const nos = Number(newItems[index].depth) || 0;
                    let qty = 0;
                    if (newItems[index].unit === 'nos') {
                        qty = nos;
                    } else if (newItems[index].unit === 'ft') {
                        qty = l * nos;
                    } else if (newItems[index].unit === 'in') {
                        qty = l * nos;
                    } else { // sqft default
                        qty = l * b * nos;
                    }
                    newItems[index].quantity = Math.round((qty + Number.EPSILON) * 100) / 100;
                    newItems[index].amount = Number(newItems[index].quantity) * Number(newItems[index].rate);
                }
            }
        }

        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { category: '', inventory_id: '', description: '', length: 0, breadth: 0, depth: 1, unit: 'sqft', quantity: 0, rate: 0, amount: 0 }]);
    };

    const removeItem = (index: number) => {
        if (items.length === 1) return;
        setItems(items.filter((_, i) => i !== index));
    };

    const calculateTotal = () => {
        // @ts-ignore
        const itemsTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
        const laborTotal = ((laborDetails.welders || 0) * (laborDetails.welderRate || 0) + (laborDetails.helpers || 0) * (laborDetails.helperRate || 0)) * (laborDetails.days || 0);
        const subtotal = itemsTotal + laborTotal;
        const profit = subtotal * ((settings?.profit_margin || 0) / 100);
        return subtotal + profit;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const total_amount = calculateTotal();

        // Prepare items - Append Labor as an item if exists
        const finalItems = [...items];
        if ((laborDetails.welders > 0 || laborDetails.helpers > 0) && laborDetails.days > 0) {
            const welderText = laborDetails.welders > 0 ? `${laborDetails.welders} Welders` : '';
            const helperText = laborDetails.helpers > 0 ? `${laborDetails.helpers} Helpers` : '';
            const separator = welderText && helperText ? ', ' : '';
            const description = `Labor Charges (${welderText}${separator}${helperText} @ ${laborDetails.days} Days)`;

            finalItems.push({
                category: 'Labor',
                inventory_id: undefined, // No inventory ID
                description: description,
                quantity: (laborDetails.welders || 0) + (laborDetails.helpers || 0), // Total men
                rate: ((laborDetails.welders || 0) * (laborDetails.welderRate || 0) + (laborDetails.helpers || 0) * (laborDetails.helperRate || 0)) / ((laborDetails.welders || 0) + (laborDetails.helpers || 0) || 1), // Average daily rate per person
                amount: ((laborDetails.welders || 0) * (laborDetails.welderRate || 0) + (laborDetails.helpers || 0) * (laborDetails.helperRate || 0)) * (laborDetails.days || 0)
            });
        }

        const { success } = await updateEstimate(id, { ...formData, total_amount }, finalItems);

        if (success) {
            router.push(`/contracting/estimates/${id}`);
        } else {
            alert('Failed to update estimate');
        }
        setLoading(false);
    };

    if (fetching) return <div className="p-10 text-center text-white">Loading...</div>;

    return (
        <div className="p-4 md:p-8 text-white max-w-[1000px] mx-auto mb-20">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link href={`/contracting/estimates/${id}`} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-2xl font-bold">Edit Estimate</h1>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {/* Client Info */}
                <div className="glass p-6 rounded-xl flex flex-col gap-4">
                    <h2 className="text-lg font-semibold text-[var(--accent)] border-b border-white/10 pb-2">Client Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-gray-400">Client Name *</label>
                            <input required type="text" className="input-field bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none" value={formData.client_name} onChange={e => setFormData({ ...formData, client_name: e.target.value })} placeholder="e.g. Rahul Sharma" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-gray-400">Project Name</label>
                            <input type="text" className="input-field bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none" value={formData.project_name} onChange={e => setFormData({ ...formData, project_name: e.target.value })} placeholder="e.g. Villa Renovation" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-gray-400">Valid Until</label>
                            <input type="date" className="input-field bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none [color-scheme:dark]" value={formData.valid_until} onChange={e => setFormData({ ...formData, valid_until: e.target.value })} />
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="glass p-6 rounded-xl flex flex-col gap-4">
                    <div className="flex justify-between items-center border-b border-white/10 pb-2">
                        <h2 className="text-lg font-semibold text-[var(--accent)]">Estimate Items</h2>
                        <div className="text-sm text-gray-400">
                            Total: <span className="text-[var(--accent)] font-bold">₹{calculateTotal().toLocaleString()}</span>
                        </div>
                    </div>



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
                                        handleItemChange(index, 'category', newCategory);
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
                                        handleItemChange(index, 'inventory_id', e.target.value);
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
                                    placeholder="0"
                                    className="input-field bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none w-full text-white text-center"
                                    value={item.quantity || ''}
                                    onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                                />

                                {/* Rate */}
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="input-field bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none w-full text-white text-center"
                                    value={item.rate || ''}
                                    onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value))}
                                />

                                {/* Amount */}
                                <div className="text-right text-[var(--accent)] font-bold pointer-events-none">
                                    {Number(item.amount).toLocaleString()}
                                </div>

                                <button type="button" onClick={() => removeItem(index)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center justify-center">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}

                        <button type="button" onClick={addItem} className="text-[var(--accent)] hover:text-white flex items-center gap-2 mt-4 text-sm font-semibold transition-colors">
                            <Plus size={16} /> Add Item
                        </button>
                    </div>
                </div>

                {/* Labor Details (Bottom) */}
                <div className="glass p-6 rounded-xl flex flex-col gap-4">
                    <h2 className="text-lg font-semibold text-[var(--accent)] border-b border-white/10 pb-2">Labor Charges</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-gray-400">No. of Welders</label>
                            <input
                                type="number"
                                className="input-field bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-[var(--accent)] focus:outline-none"
                                value={laborDetails.welders || ''}
                                onChange={(e) => setLaborDetails({ ...laborDetails, welders: parseFloat(e.target.value) })}
                                placeholder="0"
                            />
                            <span className="text-xs text-gray-500">Rate: ₹{laborDetails.welderRate}/day</span>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-gray-400">No. of Helpers</label>
                            <input
                                type="number"
                                className="input-field bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-[var(--accent)] focus:outline-none"
                                value={laborDetails.helpers || ''}
                                onChange={(e) => setLaborDetails({ ...laborDetails, helpers: parseFloat(e.target.value) })}
                                placeholder="0"
                            />
                            <span className="text-xs text-gray-500">Rate: ₹{laborDetails.helperRate}/day</span>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-gray-400">Total Days</label>
                            <input
                                type="number"
                                className="input-field bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-[var(--accent)] focus:outline-none"
                                value={laborDetails.days || ''}
                                onChange={(e) => setLaborDetails({ ...laborDetails, days: parseFloat(e.target.value) })}
                                placeholder="0"
                            />
                        </div>
                    </div>
                </div>

                <div className="glass p-6 rounded-xl flex items-center justify-between sticky bottom-4 z-10 border border-white/10 shadow-xl">
                    <div className="text-xl font-bold">
                        Total: <span className="text-[var(--accent)]">₹{calculateTotal().toLocaleString()}</span>
                    </div>
                    <button type="submit" disabled={loading} className="bg-[var(--accent)] text-black px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center gap-2">
                        {loading ? 'Saving...' : <><Save size={20} /> Update Estimate</>}
                    </button>
                </div>
            </form>
        </div>
    );
}
