"use client";
import React, { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { Store, Package, ShoppingCart, Plus, Calendar, Search, Trash2, Edit2, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';

export default function MarketingPage() {
    // @ts-ignore
    const {
        suppliers, inventory, purchases, shoppingList,
        addSupplier, addInventoryItem, updateInventoryItem, deleteInventoryItem,
        addToShoppingList, updateShoppingListItem, deleteShoppingListItem
    } = useFinance();

    const [activeTab, setActiveTab] = useState('shopping'); // shopping, inventory, suppliers, purchases

    // Modal States
    const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
    const [isAddInventoryOpen, setIsAddInventoryOpen] = useState(false);
    const [isAddShoppingOpen, setIsAddShoppingOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    // Forms
    const [newSupplier, setNewSupplier] = useState({ name: '', phone: '', address: '', gstin: '' });
    const [newItem, setNewItem] = useState({ item_name: '', unit: 'pcs', category: 'Raw Material', base_rate: '' });
    const [newShoppingItem, setNewShoppingItem] = useState({ item_name: '', quantity: '1', unit: 'pcs', date_needed: new Date().toISOString().split('T')[0], notes: '' });

    // Inventory CRUD
    const handleAddOrUpdateItem = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...newItem,
            base_rate: Number(newItem.base_rate) || 0,
            current_stock: Number((newItem as any).current_stock) || 0
        };

        if (editingItem) {
            await updateInventoryItem(editingItem.id, payload);
            setEditingItem(null);
        } else {
            // @ts-ignore
            payload.current_stock = 0; // New items start at 0 unless specified, but my form below might vary
            await addInventoryItem(payload);
        }
        setIsAddInventoryOpen(false);
        setNewItem({ item_name: '', unit: 'pcs', category: 'Raw Material', base_rate: '' });
    };

    const deleteItem = async (id: string, name: string) => {
        if (confirm(`Delete ${name} from inventory?`)) {
            await deleteInventoryItem(id);
        }
    };

    const openEditItem = (item: any) => {
        setNewItem({ ...item });
        setEditingItem(item);
        setIsAddInventoryOpen(true);
    };

    // Shopping List Actions
    const handleAddShoppingItem = async (e: React.FormEvent) => {
        e.preventDefault();
        await addToShoppingList(newShoppingItem);
        setIsAddShoppingOpen(false);
        setNewShoppingItem({ item_name: '', quantity: '1', unit: 'pcs', date_needed: new Date().toISOString().split('T')[0], notes: '' });
    };

    const toggleShoppingStatus = async (item: any) => {
        const newStatus = item.status === 'Pending' ? 'Bought' : 'Pending';
        await updateShoppingListItem(item.id, { status: newStatus });
    };

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 text-white max-w-[1200px] mx-auto mb-20">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] bg-clip-text text-transparent">Marketing & Purchasing</h1>
                <p className="text-muted text-sm mt-1">Manage everything you buy.</p>
            </div>

            {/* 4-Card Navigation */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <button onClick={() => setActiveTab('shopping')} className={`glass p-6 rounded-xl border flex flex-col items-center gap-3 transition-all ${activeTab === 'shopping' ? 'border-[var(--accent)] bg-[var(--accent)]/10 shadow-[0_0_20px_rgba(255,215,0,0.1)]' : 'border-white/5 hover:bg-white/5'}`}>
                    <div className={`p-3 rounded-full ${activeTab === 'shopping' ? 'bg-[var(--accent)] text-black' : 'bg-white/10 text-gray-400'}`}><Calendar size={24} /></div>
                    <div className="text-center">
                        <h3 className={`font-bold ${activeTab === 'shopping' ? 'text-white' : 'text-gray-300'}`}>To Buy</h3>
                        <p className="text-xs text-gray-500">{shoppingList.filter((i: any) => i.status === 'Pending').length} Pending</p>
                    </div>
                </button>

                <button onClick={() => setActiveTab('inventory')} className={`glass p-6 rounded-xl border flex flex-col items-center gap-3 transition-all ${activeTab === 'inventory' ? 'border-blue-400 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'border-white/5 hover:bg-white/5'}`}>
                    <div className={`p-3 rounded-full ${activeTab === 'inventory' ? 'bg-blue-400 text-black' : 'bg-white/10 text-gray-400'}`}><Package size={24} /></div>
                    <div className="text-center">
                        <h3 className={`font-bold ${activeTab === 'inventory' ? 'text-white' : 'text-gray-300'}`}>Inventory</h3>
                        <p className="text-xs text-gray-500">{inventory.length} Items</p>
                    </div>
                </button>

                <button onClick={() => setActiveTab('suppliers')} className={`glass p-6 rounded-xl border flex flex-col items-center gap-3 transition-all ${activeTab === 'suppliers' ? 'border-green-400 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : 'border-white/5 hover:bg-white/5'}`}>
                    <div className={`p-3 rounded-full ${activeTab === 'suppliers' ? 'bg-green-400 text-black' : 'bg-white/10 text-gray-400'}`}><Store size={24} /></div>
                    <div className="text-center">
                        <h3 className={`font-bold ${activeTab === 'suppliers' ? 'text-white' : 'text-gray-300'}`}>Suppliers</h3>
                        <p className="text-xs text-gray-500">{suppliers.length} Vendors</p>
                    </div>
                </button>

                <button onClick={() => setActiveTab('purchases')} className={`glass p-6 rounded-xl border flex flex-col items-center gap-3 transition-all ${activeTab === 'purchases' ? 'border-purple-400 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.1)]' : 'border-white/5 hover:bg-white/5'}`}>
                    <div className={`p-3 rounded-full ${activeTab === 'purchases' ? 'bg-purple-400 text-black' : 'bg-white/10 text-gray-400'}`}><ShoppingCart size={24} /></div>
                    <div className="text-center">
                        <h3 className={`font-bold ${activeTab === 'purchases' ? 'text-white' : 'text-gray-300'}`}>Purchases</h3>
                        <p className="text-xs text-gray-500">{purchases.length} Orders</p>
                    </div>
                </button>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {activeTab === 'shopping' && (
                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold flex items-center gap-2"><CheckCircle className="text-[var(--accent)]" /> Shopping List</h2>
                            <button onClick={() => setIsAddShoppingOpen(true)} className="bg-[var(--accent)] text-black px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:opacity-90">
                                <Plus size={16} /> Add Item
                            </button>
                        </div>

                        <div className="glass rounded-xl overflow-hidden border border-white/5">
                            {shoppingList.length === 0 ? (
                                <div className="p-10 text-center text-gray-500">Nothing to buy! Enjoy your day. 🏖️</div>
                            ) : (
                                <div className="flex flex-col divide-y divide-white/5">
                                    {shoppingList.map((item: any) => (
                                        <div key={item.id} className={`p-4 flex items-center justify-between group ${item.status === 'Bought' ? 'opacity-50' : ''}`}>
                                            <div className="flex items-center gap-4">
                                                <button onClick={() => toggleShoppingStatus(item)} className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${item.status === 'Bought' ? 'bg-green-500 border-green-500' : 'border-gray-500 hover:border-[var(--accent)]'}`}>
                                                    {item.status === 'Bought' && <CheckCircle size={14} className="text-black" />}
                                                </button>
                                                <div>
                                                    <h3 className={`font-bold ${item.status === 'Bought' ? 'line-through text-gray-500' : 'text-white'}`}>{item.item_name}</h3>
                                                    <p className="text-xs text-gray-400 flex items-center gap-2">
                                                        <span>{item.quantity} {item.unit}</span>
                                                        <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                                                        <span className="flex items-center gap-1"><Clock size={10} /> {new Date(item.date_needed).toLocaleDateString()}</span>
                                                        {item.notes && <span className="text-gray-500">• {item.notes}</span>}
                                                    </p>
                                                </div>
                                            </div>
                                            <button onClick={() => deleteShoppingListItem(item.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'inventory' && (
                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold flex items-center gap-2"><Package className="text-blue-400" /> Inventory Management</h2>
                            <button onClick={() => { setEditingItem(null); setNewItem({ item_name: '', unit: 'pcs', category: 'Raw Material', base_rate: '' }); setIsAddInventoryOpen(true); }} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors">
                                <Plus size={16} /> Add Item
                            </button>
                        </div>

                        <div className="glass rounded-xl overflow-hidden border border-white/5 overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-300">
                                <thead className="bg-white/5 text-xs font-bold uppercase text-gray-400">
                                    <tr>
                                        <th className="p-4">Item Name</th>
                                        <th className="p-4">Category</th>
                                        <th className="p-4">Stock</th>
                                        <th className="p-4">Est. Rate</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {inventory.map((item: any) => (
                                        <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="p-4 font-bold text-white">{item.item_name}</td>
                                            <td className="p-4"><span className="bg-white/5 px-2 py-1 rounded text-xs">{item.category}</span></td>
                                            <td className="p-4 text-[var(--accent)] font-mono">{item.current_stock} {item.unit}</td>
                                            <td className="p-4">₹{item.base_rate}</td>
                                            <td className="p-4 text-right flex justify-end gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEditItem(item)} className="p-2 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20"><Edit2 size={14} /></button>
                                                <button onClick={() => deleteItem(item.id, item.item_name)} className="p-2 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20"><Trash2 size={14} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {inventory.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-gray-500 italic">No inventory items found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Suppliers Tab (Simplified for brevity, similar to before but checking connection) */}
                {activeTab === 'suppliers' && (
                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold flex items-center gap-2"><Store className="text-green-400" /> Suppliers</h2>
                            <button onClick={() => setIsAddSupplierOpen(true)} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors">
                                <Plus size={16} /> Add Supplier
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {suppliers.map((sup: any) => (
                                <div key={sup.id} className="glass p-5 rounded-xl border border-white/5 flex flex-col gap-2">
                                    <h3 className="font-bold text-lg text-green-400">{sup.name}</h3>
                                    <div className="text-sm text-gray-300">
                                        <p>📞 {sup.phone || '-'}</p>
                                        <p>📍 {sup.address || '-'}</p>
                                        {sup.gstin && <p className="mt-2 text-xs bg-white/10 p-1 rounded w-fit">GST: {sup.gstin}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Purchases Tab */}
                {activeTab === 'purchases' && (
                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold flex items-center gap-2"><ShoppingCart className="text-purple-400" /> Recent Purchases</h2>
                            <Link href="/marketing/purchases/new" className="bg-[var(--accent)] text-black px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity">
                                <Plus size={16} /> New Purchase
                            </Link>
                        </div>
                        <div className="glass rounded-xl overflow-hidden border border-white/5">
                            <table className="w-full text-left text-sm text-gray-300">
                                <thead className="bg-white/5 text-xs font-bold uppercase text-gray-400">
                                    <tr>
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Supplier</th>
                                        <th className="p-4">Invoice #</th>
                                        <th className="p-4 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {purchases.map((p: any) => (
                                        <tr key={p.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4">{new Date(p.date).toLocaleDateString()}</td>
                                            <td className="p-4 font-bold text-white">{p.suppliers?.name || 'Unknown'}</td>
                                            <td className="p-4 font-mono text-gray-500">{p.invoice_number || '-'}</td>
                                            <td className="p-4 text-right font-bold text-green-400">₹{p.total_amount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {/* Add Supplier Modal */}
            {isAddSupplierOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">Add Supplier</h2>
                        <form onSubmit={(e) => { e.preventDefault(); addSupplier(newSupplier); setIsAddSupplierOpen(false); }} className="flex flex-col gap-4">
                            <input required autoFocus type="text" placeholder="Supplier Name" className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3" value={newSupplier.name} onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })} />
                            <input type="text" placeholder="Phone" className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3" value={newSupplier.phone} onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })} />
                            <input type="text" placeholder="GSTIN (Optional)" className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3" value={newSupplier.gstin} onChange={e => setNewSupplier({ ...newSupplier, gstin: e.target.value })} />
                            <textarea placeholder="Address" className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3 h-20 resize-none" value={newSupplier.address} onChange={e => setNewSupplier({ ...newSupplier, address: e.target.value })} />
                            <div className="flex gap-3 mt-4">
                                <button type="button" onClick={() => setIsAddSupplierOpen(false)} className="flex-1 py-3 text-gray-400 hover:text-white transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 bg-[var(--accent)] text-black font-bold rounded-lg py-3">Add Supplier</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add/Edit Inventory Modal */}
            {isAddInventoryOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">{editingItem ? 'Edit Item' : 'Add Inventory Item'}</h2>
                        <form onSubmit={handleAddOrUpdateItem} className="flex flex-col gap-4">
                            <input required autoFocus type="text" placeholder="Item Name (e.g. Cement)" className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3" value={newItem.item_name} onChange={e => setNewItem({ ...newItem, item_name: e.target.value })} />

                            <div className="flex gap-4">
                                <select className="input-field bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-3 flex-1" value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })}>
                                    <option value="pcs">Pcs</option>
                                    <option value="kg">Kg</option>
                                    <option value="ltr">Litre</option>
                                    <option value="m">Meter</option>
                                    <option value="ft">Feet</option>
                                </select>
                                <select className="input-field bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-3 flex-1" value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}>
                                    <option value="Raw Material">Raw Material</option>
                                    <option value="Consumable">Consumable</option>
                                    <option value="Asset">Asset</option>
                                    <option value="Tool">Tool</option>
                                </select>
                            </div>

                            <input type="number" placeholder="Standard Rate (₹)" className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3" value={newItem.base_rate} onChange={e => setNewItem({ ...newItem, base_rate: e.target.value })} />

                            <div className="flex gap-3 mt-4">
                                <button type="button" onClick={() => setIsAddInventoryOpen(false)} className="flex-1 py-3 text-gray-400 hover:text-white transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 bg-[var(--accent)] text-black font-bold rounded-lg py-3">{editingItem ? 'Update' : 'Add Item'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Shopping Item Modal */}
            {isAddShoppingOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">Add to Shopping List</h2>
                        <form onSubmit={handleAddShoppingItem} className="flex flex-col gap-4">
                            <input required autoFocus type="text" placeholder="Item Name" className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3" value={newShoppingItem.item_name} onChange={e => setNewShoppingItem({ ...newShoppingItem, item_name: e.target.value })} />

                            <div className="flex gap-4">
                                <input type="number" placeholder="Qty" className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3 w-24" value={newShoppingItem.quantity} onChange={e => setNewShoppingItem({ ...newShoppingItem, quantity: e.target.value })} />
                                <select className="input-field bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-3 flex-1" value={newShoppingItem.unit} onChange={e => setNewShoppingItem({ ...newShoppingItem, unit: e.target.value })}>
                                    <option value="pcs">Pcs</option>
                                    <option value="kg">Kg</option>
                                    <option value="ltr">Litre</option>
                                    <option value="m">Meter</option>
                                    <option value="ft">Feet</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-gray-500">Needed By</label>
                                <input type="date" className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3 w-full [color-scheme:dark]" value={newShoppingItem.date_needed} onChange={e => setNewShoppingItem({ ...newShoppingItem, date_needed: e.target.value })} />
                            </div>

                            <input type="text" placeholder="Notes (Optional)" className="input-field bg-white/5 border border-white/10 rounded-lg px-4 py-3" value={newShoppingItem.notes} onChange={e => setNewShoppingItem({ ...newShoppingItem, notes: e.target.value })} />

                            <div className="flex gap-3 mt-4">
                                <button type="button" onClick={() => setIsAddShoppingOpen(false)} className="flex-1 py-3 text-gray-400 hover:text-white transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 bg-[var(--accent)] text-black font-bold rounded-lg py-3">Add to List</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
