"use client";
import React from "react";
import { useFinance } from "../context/FinanceContext";
import AddTransactionModal from "./AddTransactionModal";

export default function GlobalModalWrapper() {
    const { isAddTxModalOpen, closeAddTxModal } = useFinance();
    return (
        <AddTransactionModal isOpen={isAddTxModalOpen} onClose={closeAddTxModal} />
    );
}
