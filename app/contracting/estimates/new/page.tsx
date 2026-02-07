"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFinance } from '@/context/FinanceContext';
import { ArrowLeft, Plus, Trash2, Save, FileText, X, ChevronDown, Calculator, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface EstimateItem {
    category?: string;
    inventory_id?: string;
    description: string;
    length?: number;
    breadth?: number;
    depth?: number; // Used for "Nos" or Depth
    unit?: string; // ft, in, sqft, nos
    quantity: number;
    rate: number; // Base Rate (Cost)
    amount: number;
    weight_per_unit?: number;
    total_weight?: number; // For Grill
}

type EstimateType = 'Standard' | 'Grill' | 'Shed';

export default function CreateEstimatePage() {
    const router = useRouter();
    // @ts-ignore
    const { createEstimate, inventory, staffList, settings } = useFinance();
    const [loading, setLoading] = useState(false);
    const [estimateType, setEstimateType] = useState<EstimateType>('Standard');
    const [previewText, setPreviewText] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [profitMargin, setProfitMargin] = useState(20); // Default 20%

    const [formData, setFormData] = useState({
        client_name: '',
        project_name: '',
        valid_until: '',
        notes: '',
        location: '', // Added for Shed "at Sadar Bazar"
        global_rate: 0, // Quoted Rate: For Grill (per kg) or Shed (per sqft)
        shed_length: 0,
        shed_width: 0,
    });

    const [items, setItems] = useState<EstimateItem[]>([
        { category: '', inventory_id: '', description: '', length: 0, breadth: 0, depth: 1, unit: 'sqft', quantity: 0, rate: 0, amount: 0, weight_per_unit: 0, total_weight: 0 }
    ]);

    // Labor State
    const [laborDetails, setLaborDetails] = useState({
        welders: 0,
        helpers: 0,
        welderRate: 0,
        helperRate: 0,
        days: 0
    });

    // Auto-fill rates
    React.useEffect(() => {
        if (settings) {
            setLaborDetails(prev => ({
                ...prev,
                welderRate: settings.welder_rate || prev.welderRate,
                helperRate: settings.helper_rate || prev.helperRate
            }));
            if (settings.profit_margin) setProfitMargin(settings.profit_margin);
        }
    }, [settings]);

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items];
        // @ts-ignore
        newItems[index][field] = value;

        // Auto-Calc Logic
        if (['length', 'breadth', 'depth', 'quantity', 'rate', 'unit', 'weight_per_unit'].includes(field)) {
            const l = Number(newItems[index].length) || 0;
            const b = Number(newItems[index].breadth) || 0;
            const nos = Number(newItems[index].depth) || 0;
            let qty = newItems[index].quantity;
            const u = newItems[index].unit;
            const w_per_unit = Number(newItems[index].weight_per_unit) || 0;

            // Recalculate Qty
            if (field !== 'quantity' && field !== 'rate') {
                if (u === 'nos') qty = nos;
                else if (u === 'ft') qty = l * nos;
                else if (u === 'in') qty = l * nos; // TBD conversion
                else qty = l * b * nos; // sqft
                newItems[index].quantity = Math.round((qty + Number.EPSILON) * 100) / 100;
            }

            // Calculate Amount (Item Cost)
            // Ideally rate here is the Inventory Base Rate (Cost)
            newItems[index].amount = Number(newItems[index].quantity) * Number(newItems[index].rate);

            // Calculate Weight (Grill Mode)
            // Weight = Qty (ft/nos) * Weight Per Unit
            newItems[index].total_weight = Number(newItems[index].quantity) * w_per_unit;
        }

        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { category: '', inventory_id: '', description: '', quantity: 1, rate: 0, amount: 0, weight_per_unit: 0, total_weight: 0 }]);
    };

    const removeItem = (index: number) => {
        if (items.length === 1) return;
        setItems(items.filter((_, i) => i !== index));
    };

    // Calculate Totals based on Type
    const calculateTotals = () => {
        let quotedAmount = 0; // Final Price to Customer
        let totalWt = 0;
        let area = 0;

        let totalMaterialCost = 0;
        let totalLaborCost = 0;

        // 1. Calculate Costs (Internal)
        totalMaterialCost = items.reduce((sum, item) => sum + (item.amount || 0), 0);

        if ((laborDetails.welders > 0 || laborDetails.helpers > 0) && laborDetails.days > 0) {
            totalLaborCost = ((laborDetails.welders || 0) * (laborDetails.welderRate || 0) + (laborDetails.helpers || 0) * (laborDetails.helperRate || 0)) * (laborDetails.days || 0);
        }

        const totalInternalCost = totalMaterialCost + totalLaborCost;

        // 2. Calculate Final Price (Quoted)
        if (estimateType === 'Standard') {
            // Standard: Profit is added on top of Internal Cost
            const profit = totalInternalCost * ((profitMargin || 0) / 100);
            quotedAmount = totalInternalCost + profit;

        } else if (estimateType === 'Grill') {
            totalWt = items.reduce((sum, item) => sum + (item.total_weight || 0), 0);
            quotedAmount = totalWt * (formData.global_rate || 0);

        } else if (estimateType === 'Shed') {
            area = (formData.shed_length || 0) * (formData.shed_width || 0);
            quotedAmount = area * (formData.global_rate || 0);
        }

        return { quotedAmount, totalWt, area, totalMaterialCost, totalLaborCost, totalInternalCost };
    };

    const { quotedAmount, totalWt, area, totalMaterialCost, totalLaborCost, totalInternalCost } = calculateTotals();

    // Suggested Rate Calculation
    const getSuggestedRate = () => {
        const desiredProfit = totalInternalCost * (profitMargin / 100);
        const targetRevenue = totalInternalCost + desiredProfit;

        if (estimateType === 'Grill' && totalWt > 0) {
            return Math.ceil(targetRevenue / totalWt);
        }
        if (estimateType === 'Shed' && area > 0) {
            return Math.ceil(targetRevenue / area);
        }
        return 0;
    };
    const suggestedRate = getSuggestedRate();

    const generatePreview = () => {
        let text = '';

        if (estimateType === 'Grill') {
            text = `
Estimate for your ${formData.project_name || 'Grill'}...
Approx wt ${totalWt.toLocaleString()}kg x ${formData.global_rate}₹ rate
Approx amt ${Math.round(quotedAmount).toLocaleString()}₹ (10% +-)
            `.trim();

        } else if (estimateType === 'Shed') {
            const materials = items.map(i => `: ${i.description}`).join('\n');
            const amt = Math.round(quotedAmount).toLocaleString();

            text = `
Estimate for your ${formData.project_name || 'Shed'} ${formData.shed_length}ft x ${formData.shed_width}ft${formData.location ? ' at ' + formData.location : ''}...
Area (approx) ${area} sqft
Rate (fix) ${formData.global_rate}₹ Rate
Estimated amt..${amt}₹
Material will be used..
${materials}
Note..
: Above figures are only estimate not Quotation
: Area is approx rather rate is fix
: Rate includes Raw material, Fixtures, Labour charges, Cartage
: Rate excludes Civil Work
: GST 18% extra (if bill required or payment received via UPI or Bank transfer)
            `.trim();
        } else {
            text = "Standard Estimate Preview Not Available";
        }

        setPreviewText(text);
        setShowPreview(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // For Shed/Grill, we might want to store the "Global Rate" effectively.
        const submitData = {
            ...formData,
            items: items, // Logic to save specific fields?
            total_amount: quotedAmount,
            client_name: formData.client_name,
            project_name: formData.project_name,
            notes: formData.notes + (estimateType !== 'Standard' ? `\n\nGenerated Text:\n${previewText}` : '')
        };

        // Pass standard structure
        // @ts-ignore
        const { success } = await createEstimate(submitData, items);

        if (success) {
            router.push('/contracting/estimates');
        } else {
            alert('Failed to save estimate');
        }
        setLoading(false);
    };

    return (
        <div className="p-4 md:p-8 text-white max-w-[1200px] mx-auto mb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link href="/contracting/estimates" className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-2xl font-bold">New Estimate</h1>
                </div>

                {/* Type Switcher Dropdown */}
                <div className="relative">
                    <select
                        value={estimateType}
                        onChange={(e) => setEstimateType(e.target.value as EstimateType)}
                        className="bg-black/40 border border-white/10 text-white text-sm rounded-lg focus:ring-[var(--accent)] focus:border-[var(--accent)] block w-full p-2.5 pr-10 appearance-none font-bold uppercase tracking-wider cursor-pointer"
                    >
                        <option value="Standard">Standard Estimate</option>
                        <option value="Grill">Grill / Weight Based</option>
                        <option value="Shed">Shed / Area Based</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={16} />
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="glass p-6 rounded-xl flex flex-col gap-4">
                    <h2 className="text-lg font-semibold text-[var(--accent)] border-b border-white/10 pb-2">Project Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-gray-400">Client Name *</label>
                            <input required type="text" className="input-field bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none" value={formData.client_name} onChange={e => setFormData({ ...formData, client_name: e.target.value })} placeholder="e.g. Rahul Sharma" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-gray-400">Project Name</label>
                            <input type="text" className="input-field bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none" value={formData.project_name} onChange={e => setFormData({ ...formData, project_name: e.target.value })} placeholder={estimateType === 'Shed' ? "e.g. Shed" : "e.g. Flats Grill"} />
                        </div>
                    </div>

                    {/* Shed Specific: Dimensions */}
                    {estimateType === 'Shed' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/5 p-4 rounded-lg">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-[var(--accent)]">Shed Length (ft)</label>
                                <input type="number" className="input-field bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm" value={formData.shed_length || ''} onChange={e => setFormData({ ...formData, shed_length: parseFloat(e.target.value) })} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-[var(--accent)]">Shed Width (ft)</label>
                                <input type="number" className="input-field bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm" value={formData.shed_width || ''} onChange={e => setFormData({ ...formData, shed_width: parseFloat(e.target.value) })} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-gray-400">Location</label>
                                <input type="text" className="input-field bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="e.g. Sadar Bazar" />
                            </div>
                        </div>
                    )}
                </div>

                {/* COST ANALYSIS SECTION (Smart Rate Generator) */}
                {(estimateType === 'Grill' || estimateType === 'Shed') && (
                    <div className="glass p-6 rounded-xl flex flex-col gap-4 border border-[var(--accent)]/30 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Calculator size={100} />
                        </div>
                        <h2 className="text-lg font-bold text-[var(--accent)] flex items-center gap-2">
                            <Calculator size={20} /> Cost Analysis & Rate Generator
                        </h2>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-2">
                            <div className="bg-black/20 p-3 rounded-lg">
                                <p className="text-gray-400">Raw Material Cost</p>
                                <p className="text-xl font-bold text-white">₹{totalMaterialCost.toLocaleString()}</p>
                            </div>
                            <div className="bg-black/20 p-3 rounded-lg">
                                <p className="text-gray-400">Labor Cost</p>
                                <p className="text-xl font-bold text-white">₹{totalLaborCost.toLocaleString()}</p>
                            </div>
                            <div className="bg-white/10 p-3 rounded-lg border border-white/10">
                                <p className="text-gray-300">Total Internal Cost</p>
                                <p className="text-xl font-bold text-white">₹{totalInternalCost.toLocaleString()}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-gray-400 text-xs">Profit Margin (%)</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={profitMargin}
                                        onChange={e => setProfitMargin(parseFloat(e.target.value))}
                                        className="w-full bg-black/50 border border-white/20 rounded px-2 py-1 text-white font-bold text-center"
                                    />
                                    <span className="text-gray-400">%</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between bg-[var(--accent)]/10 p-4 rounded-xl border border-[var(--accent)]/20">
                            <div>
                                <p className="text-[var(--accent)] uppercase text-xs font-bold tracking-wider">Suggested Rate</p>
                                <p className="text-3xl font-bold text-white leading-none">
                                    ₹{suggestedRate.toLocaleString()}
                                    <span className="text-lg text-gray-400 font-normal"> / {estimateType === 'Grill' ? 'kg' : 'sqft'}</span>
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Based on Cost + {profitMargin}% Margin
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, global_rate: suggestedRate }))}
                                className="bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
                            >
                                <RefreshCw size={16} /> Use This Rate
                            </button>
                        </div>
                    </div>
                )}


                {/* Quoted Rate Input */}
                {(estimateType === 'Grill' || estimateType === 'Shed') && (
                    <div className="glass p-6 rounded-xl flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-[var(--accent)] font-bold uppercase tracking-wider">
                                Quoted Rate per {estimateType === 'Grill' ? 'KG' : 'SQFT'} (₹)
                            </label>
                            <input
                                type="number"
                                className="input-field bg-black/30 border border-[var(--accent)] rounded-lg px-4 py-4 text-3xl font-bold w-full md:w-1/2 text-[var(--accent)]"
                                value={formData.global_rate || ''}
                                onChange={e => setFormData({ ...formData, global_rate: parseFloat(e.target.value) })}
                                placeholder="0"
                            />
                            <p className="text-xs text-gray-500">
                                This is the final rate the customer will see.
                            </p>
                        </div>
                    </div>
                )}

                <div className="glass p-6 rounded-xl flex flex-col gap-4">
                    <div className="flex justify-between items-center border-b border-white/10 pb-2">
                        <h2 className="text-lg font-semibold text-[var(--accent)]">
                            {estimateType === 'Shed' ? 'Materials List' : 'Estimate Items'}
                        </h2>

                        {/* Live Calc Display */}
                        <div className="text-right">
                            {estimateType === 'Grill' && <div className="text-sm text-gray-400">Total Weight: <span className="text-white">{totalWt.toLocaleString()} kg</span></div>}
                            {estimateType === 'Shed' && <div className="text-sm text-gray-400">Area: <span className="text-white">{area.toLocaleString()} sqft</span></div>}
                            <div className="text-lg text-[var(--accent)] font-bold">Quoted Amt: ₹{Math.round(quotedAmount).toLocaleString()}</div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        {/* Header Row */}
                        <div className={`grid ${estimateType === 'Grill' ? 'grid-cols-[1.5fr_2.3fr_0.5fr_0.5fr_0.5fr_0.6fr_0.8fr_40px]' : 'grid-cols-[1.5fr_3fr_0.6fr_0.8fr_1fr_40px]'} gap-3 mb-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider`}>
                            <div>Item Type</div>
                            <div>Dimensions/Desc</div>
                            <div className="text-center">Qty</div>

                            {estimateType === 'Grill' && <div className="text-center">Wt/Unit</div>}

                            {/* Standard shows calculation columns, Grill/Shed hide price per item from user view but needed for internal cost */}
                            <div className="text-center">Rate(Cost)</div>
                            {estimateType === 'Grill' && <div className="text-right">Tot. Wt</div>}
                            <div className="text-right">Cost</div>

                            <div></div>
                        </div>

                        {items.map((item, index) => (
                            <div key={index} className={`grid ${estimateType === 'Grill' ? 'grid-cols-[1.5fr_2.3fr_0.5fr_0.5fr_0.5fr_0.6fr_0.8fr_40px]' : 'grid-cols-[1.5fr_3fr_0.6fr_0.8fr_1fr_40px]'} gap-3 items-center mb-2 px-2`}>

                                {/* Item Type Selector */}
                                <select
                                    className="input-field bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none w-full text-white"
                                    value={item.category || ''}
                                    onChange={(e) => {
                                        const newCategory = e.target.value;
                                        const newItems = [...items];
                                        newItems[index] = { ...newItems[index], category: newCategory, inventory_id: '', description: '', rate: 0, amount: 0 };
                                        setItems(newItems);
                                    }}
                                >
                                    <option value="" className="bg-black text-white">Select Type</option>
                                    {/* @ts-ignore */}
                                    {Array.from(new Set(inventory?.map(i => i.category))).sort().map(cat => (
                                        // @ts-ignore
                                        <option key={cat} value={cat} className="bg-black text-white">{cat}</option>
                                    ))}
                                </select>

                                {/* Item Selection / Desc */}
                                <div className="flex gap-2">
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
                                                    weight_per_unit: selected.weight_per_unit || 0, // Load weight
                                                    amount: (selected.base_rate || 0) * (newItems[index].quantity || 1)
                                                };
                                                // Trigger update for total weight
                                                handleItemChange(index, 'inventory_id', newId);
                                            }
                                            setItems(newItems);
                                        }}
                                        disabled={!item.category}
                                    >
                                        <option value="" className="bg-black text-white">Select Spec</option>
                                        {/* @ts-ignore */}
                                        {inventory?.filter(i => i.category === item.category).map(i => (
                                            // @ts-ignore
                                            <option key={i.id} value={i.id} className="bg-black text-white">{i.item_name}</option>
                                        ))}
                                    </select>
                                    {estimateType === 'Shed' && <input type="text" className="w-full bg-black/30 border border-white/10 px-2 rounded" value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} placeholder="Custom Desc" />}
                                </div>


                                {/* Qty */}
                                <input type="number" placeholder="Qty" className="input-field bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-sm text-center text-white" value={item.quantity || ''} onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))} />

                                {/* Grill Mode: Weight Per Unit Input (Manual Override) */}
                                {estimateType === 'Grill' && (
                                    <input type="number" placeholder="Wt" className="input-field bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-sm text-center text-gray-300" value={item.weight_per_unit || ''} onChange={(e) => handleItemChange(index, 'weight_per_unit', parseFloat(e.target.value))} />
                                )}

                                {/* Rate (Internal Cost) */}
                                <input type="number" placeholder="Rate" className="input-field bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-sm text-center text-gray-400" value={item.rate || ''} onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value))} />


                                {/* Grill Mode: Total Wt */}
                                {estimateType === 'Grill' && (
                                    <div className="text-right text-yellow-400 font-mono">
                                        {(item.total_weight || 0).toLocaleString()} kg
                                    </div>
                                )}

                                {/* Amount (Internal Cost) */}
                                <div className="text-right text-gray-500 font-bold pointer-events-none">
                                    {Number(item.amount).toLocaleString()}
                                </div>

                                {/* Shed Mode: Just spacers */}
                                {estimateType === 'Shed' && null}

                                <button type="button" onClick={() => removeItem(index)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center justify-center">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button type="button" onClick={addItem} className="text-[var(--accent)] hover:text-white flex items-center gap-2 mt-4 text-sm font-semibold transition-colors w-fit">
                        <Plus size={16} /> Add Item
                    </button>

                </div>

                {/* Labor Details (Bottom) */}
                <div className="glass p-6 rounded-xl flex flex-col gap-4">
                    <h2 className="text-lg font-semibold text-[var(--accent)] border-b border-white/10 pb-2">Labor Charges (Internal)</h2>
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

                {/* Preview & Save Footer */}
                <div className="glass p-6 rounded-xl border border-white/10 shadow-xl sticky bottom-4 z-20">
                    {(estimateType === 'Grill' || estimateType === 'Shed') && (
                        <div className="mb-4">
                            <button type="button" onClick={generatePreview} className="w-full bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors">
                                <FileText size={18} /> Generate Text
                            </button>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <div className="text-xl font-bold">
                            Quoted Total: <span className="text-[var(--accent)]">₹{Math.round(quotedAmount).toLocaleString()}</span>
                        </div>
                        <button type="submit" disabled={loading} className="bg-[var(--accent)] text-black px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center gap-2">
                            {loading ? 'Saving...' : <><Save size={20} /> Save Estimate</>}
                        </button>
                    </div>
                </div>
            </form>

            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl max-w-lg w-full relative shadow-2xl">
                        <button onClick={() => setShowPreview(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                            <X size={24} />
                        </button>
                        <h3 className="text-xl font-bold mb-4 text-[var(--accent)]">Estimate Preview</h3>
                        <div className="bg-black/50 p-4 rounded-lg font-mono text-xs md:text-sm whitespace-pre-wrap text-gray-300 border border-white/5">
                            {previewText}
                        </div>
                        <div className="mt-4 flex gap-2">
                            <button onClick={() => navigator.clipboard.writeText(previewText)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-semibold">
                                Copy Text
                            </button>
                            <button onClick={() => setShowPreview(false)} className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}



