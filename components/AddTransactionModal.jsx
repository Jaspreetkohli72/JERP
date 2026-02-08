"use client";
import React from "react";
import AddTransactionForm from "./AddTransactionForm";
import { useFinance } from "../context/FinanceContext";

export default function AddTransactionModal({ isOpen, onClose }) {
    const { addTxInitialType, addTxInitialData } = useFinance();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm">
                <AddTransactionForm
                    type={addTxInitialType || "expense"}
                    title={addTxInitialData?.title || (addTxInitialType === "income" ? "Add Income" : "Add Expense")}
                    initialData={addTxInitialData}
                    onClose={onClose}
                />
            </div>
        </div>
    );
}
