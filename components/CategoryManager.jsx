"use client";
import React, { useState } from "react";
import { X, Trash2, Plus } from "lucide-react";
import { useFinance } from "../context/FinanceContext";
import { CATEGORY_ICONS, getCategoryIcon } from "../lib/categoryIcons";

export default function CategoryManager({ onClose }) {
    const { categories, addCategory, deleteCategory } = useFinance();
    const [activeTab, setActiveTab] = useState("expense"); // 'expense' | 'income'
    const [newCatName, setNewCatName] = useState("");
    const [selectedIcon, setSelectedIcon] = useState("ShoppingCart");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [showIconPicker, setShowIconPicker] = useState(false);

    const displayedCategories = categories.filter(c => c.type === activeTab);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newCatName.trim()) return;

        setIsSubmitting(true);
        setErrorMsg("");

        // Use selected icon or default based on tab
        const iconToUse = selectedIcon || (activeTab === 'income' ? 'ArrowDownLeft' : 'ShoppingCart');

        const result = await addCategory(newCatName, activeTab, iconToUse);
        setIsSubmitting(false);

        if (result.success) {
            setNewCatName("");
            setShowIconPicker(false);
            // Reset to default for next
            setSelectedIcon(activeTab === 'income' ? 'ArrowDownLeft' : 'ShoppingCart');
        } else {
            setErrorMsg("Failed to add category");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this category?")) return;

        const result = await deleteCategory(id);
        if (!result.success) {
            // Check if it's the specific "used" error
            if (result.error?.message) {
                alert(result.error.message);
            } else {
                alert("Failed to delete category");
            }
        }
    };

    // Get list of available icons for picker
    const availableIconKeys = Object.keys(CATEGORY_ICONS);
    const SelectedIconComp = getCategoryIcon(selectedIcon);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#0f172a] rounded-[24px] border border-white/10 shadow-2xl flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/5">
                    <h2 className="text-lg font-semibold text-gray-100">Manage Categories</h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-full text-muted transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex bg-black/20 p-1 mx-5 mt-5 rounded-xl">
                    {['expense', 'income'].map(type => (
                        <button
                            key={type}
                            onClick={() => {
                                setActiveTab(type);
                                setSelectedIcon(type === 'income' ? 'ArrowDownLeft' : 'ShoppingCart');
                            }}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-lg capitalize transition-all ${activeTab === type
                                ? 'bg-white/10 text-white shadow-sm'
                                : 'text-muted hover:text-gray-300'
                                }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-5 space-y-2 custom-scrollbar">
                    {displayedCategories.length > 0 ? (
                        displayedCategories.map(cat => {
                            const CatIcon = getCategoryIcon(cat.icon);
                            return (
                                <div key={cat.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${activeTab === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                            <CatIcon size={18} />
                                        </div>
                                        <span className="text-sm font-medium text-gray-200">{cat.name}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(cat.id);
                                        }}
                                        className="p-1.5 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Delete category"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-8 text-muted text-sm">No custom categories yet.</div>
                    )}
                </div>

                {/* Add Form */}
                <form onSubmit={handleAdd} className="p-5 border-t border-white/5 bg-black/20 rounded-b-[24px]">
                    {errorMsg && <div className="text-xs text-red-400 mb-2">{errorMsg}</div>}

                    {/* Icon Picker Toggle / Display */}
                    <div className="mb-3">
                        {showIconPicker ? (
                            <div className="grid grid-cols-6 gap-2 p-2 bg-black/40 rounded-xl mb-2 max-h-32 overflow-y-auto custom-scrollbar">
                                {availableIconKeys.map(iconKey => {
                                    const IconComp = CATEGORY_ICONS[iconKey];
                                    return (
                                        <button
                                            key={iconKey}
                                            type="button"
                                            onClick={() => {
                                                setSelectedIcon(iconKey);
                                                setShowIconPicker(false);
                                            }}
                                            className={`p-2 rounded-lg flex items-center justify-center transition-colors ${selectedIcon === iconKey ? 'bg-indigo-500 text-white' : 'text-muted hover:bg-white/10'}`}
                                            title={iconKey}
                                        >
                                            <IconComp size={18} />
                                        </button>
                                    );
                                })}
                            </div>
                        ) : null}
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setShowIconPicker(!showIconPicker)}
                            className="p-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-muted hover:text-white transition-colors"
                            title="Select Icon"
                        >
                            <SelectedIconComp size={20} />
                        </button>

                        <input
                            type="text"
                            value={newCatName}
                            onChange={(e) => setNewCatName(e.target.value)}
                            placeholder={`New ${activeTab} category...`}
                            className="flex-1 px-4 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                        />
                        <button
                            type="submit"
                            disabled={!newCatName.trim() || isSubmitting}
                            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
