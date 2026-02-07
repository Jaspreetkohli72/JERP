"use client";
import React, { useState } from "react";
import { useFinance } from "../../context/FinanceContext";
import { Save } from "lucide-react";

// Define Interfaces
type CategoryMetric = {
    id: string;
    name: string;
    icon: string;
    limit: number;
    used: number;
    pct: number;
};

export default function GoalsPage() {
    const { financials, updateGlobalBudget, updateCategoryBudget, loading } = useFinance();
    const [newBudget, setNewBudget] = useState("");

    const handleUpdate = async () => {
        if (!newBudget) return;
        await updateGlobalBudget(Number(newBudget));
        setNewBudget("");
    };

    if (loading) return <div className="p-4 glass rounded-[26px] h-64 animate-pulse" />;

    return (
        <div className="flex flex-col gap-4">
            <header className="flex items-center justify-between px-3 pt-0 pb-2">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[1.2rem] font-semibold text-text">Budget Settings</span>
                </div>
            </header>

            <div className="glass p-5 rounded-[26px]">
                {/* Title removed */}
                <p className="text-muted text-sm mb-6">Manage your global monthly spending limit.</p>

                <div className="flex flex-col gap-1 mb-6">
                    <span className="text-[0.8rem] text-muted uppercase tracking-wider">Current Monthly Limit</span>
                    <div className="text-[2rem] font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                        ₹{financials.budgetLimit.toLocaleString()}
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <label className="text-sm text-gray-300">Set New Limit</label>
                    <div className="flex gap-3">
                        <input
                            type="number"
                            placeholder="e.g. 50000"
                            value={newBudget}
                            onChange={(e) => setNewBudget(e.target.value)}
                            className="flex-1 bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                        />
                        <button
                            onClick={handleUpdate}
                            disabled={!newBudget}
                            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                        >
                            <Save size={18} />
                            Save
                        </button>
                    </div>
                </div>
            </div>

            {/* Category Budgets */}
            <div className="glass p-5 rounded-[26px]">
                <h2 className="text-[1.1rem] font-semibold mb-4 text-text">Category Limits</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {financials.categoryMetrics?.map((cat: CategoryMetric) => (
                        <CategoryBudgetCard key={cat.id} cat={cat} updateBudget={updateCategoryBudget} />
                    ))}
                </div>
            </div>
        </div>
    );
}

// Sub-component for individual category card
function CategoryBudgetCard({ cat, updateBudget }: { cat: CategoryMetric; updateBudget: (id: string, limit: number) => Promise<any> }) {
    const [isEditing, setIsEditing] = useState(false);
    const [val, setVal] = useState(cat.limit || "");

    const handleSave = async () => {
        if (!val) return;
        await updateBudget(cat.id, Number(val));
        setIsEditing(false);
    };

    return (
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="text-xl">{cat.icon}</span>
                    <span className="font-medium text-gray-200">{cat.name}</span>
                </div>
                <div className="text-xs text-muted">
                    {cat.limit > 0 ? `${cat.pct}% used` : "No limit"}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden">
                <div
                    className={`h-full rounded-full ${cat.pct > 100 ? "bg-rose-500" : "bg-blue-500"} transition-all duration-500`}
                    style={{ width: `${Math.min(cat.pct, 100)}%` }}
                />
            </div>

            <div className="flex justify-between items-center text-sm">
                <span className="text-muted">Spent: ₹{cat.used.toLocaleString()}</span>

                {isEditing ? (
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            className="w-20 bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.1)] rounded px-2 py-1 text-xs text-white"
                            value={val}
                            onChange={(e) => setVal(e.target.value)}
                            autoFocus
                        />
                        <button onClick={handleSave} className="p-1 bg-blue-600 rounded hover:bg-blue-500">
                            <Save size={14} />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="text-blue-400 hover:text-blue-300 text-xs font-medium"
                    >
                        {cat.limit > 0 ? `Limit: ₹${cat.limit.toLocaleString()}` : "Set Limit"}
                    </button>
                )}
            </div>
        </div>
    );
}
