"use client";
import React, { useState, useEffect } from "react";
import { X, Upload, FileText, Check, AlertTriangle, ArrowRight } from "lucide-react";
import { useFinance } from "../context/FinanceContext";
import * as pdfjsLib from "pdfjs-dist/build/pdf";

// Worker setup for Next.js (Client Side)
// We use a CDN to avoid webpack complexity with worker-loader
pdfjsLib.GlobalWorkerOptions.workerSrc = '/worker.js';

export default function ImportModal({ onClose }) {
    const { addTransaction, categories } = useFinance();
    const [file, setFile] = useState(null);
    const [step, setStep] = useState(1); // 1: Upload, 2: Review, 3: Importing
    const [parsedTxs, setParsedTxs] = useState([]);
    const [isParsing, setIsParsing] = useState(false);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
    const [debugText, setDebugText] = useState("");
    const [showDebug, setShowDebug] = useState(false);

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setFile(e.target.files[0]);
            parsePDF(e.target.files[0]);
        }
    };

    const parsePDF = async (file) => {
        setIsParsing(true);
        setDebugText("");
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

            let fullText = "";
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(" ");
                fullText += pageText + "\n";
            }

            setDebugText(fullText);
            console.log("Raw PDF Text:", fullText); // Debugging

            if (!fullText.trim()) {
                alert("PDF parsed but returned NO text. It might be an image scan. Try a digital statement.");
                setIsParsing(false);
                setShowDebug(true);
                return;
            }

            // Regex for common bank formats
            // Target: DD/MM/YYYY Description Amount (Dr/Cr)
            // Or: DD MMM YYYY ...

            // Heuristic Parser
            const lines = fullText.split(/\n/); // PDF text extraction often loses newlines, splitting by dates might be better if single line string

            // Better strategy: Look for Date-like patterns in the giant string
            // Regex Strategy:
            // 1. Strict Date: DD-Mon-YYYY (e.g., 12-Dec-2025) OR DD/MM/YYYY
            // 2. Description: Greedy capture until...
            // 3. Amount: A number with a decimal (e.g., 25.00). 
            // 4. Lookahead: Often followed by Balance (another number) or end of line/next date.

            // Regex for: 12-Dec-2025   WANI /P2M   25.00   96,984.88
            // Groups: 1=Date, 2=Description, 3=Amount
            const transactionRegex = /(\d{2}-[A-Za-z]{3}-\d{4}|\d{2}\/\d{2}\/\d{4})\s+(.*?)\s+([\d,]+\.\d{2})(?:\s+[\d,]+\.\d{2})?/g;

            const matches = [...fullText.matchAll(transactionRegex)];

            if (matches.length === 0) {
                alert("No transactions found matching the format! Showing raw text for debugging.");
                setShowDebug(true);
                setIsParsing(false);
                return;
            }

            const transactions = matches.map((m, index) => {
                const dateStr = m[1];
                const amountStr = m[3].replace(/,/g, ''); // Amount is now Group 3
                const rawDesc = m[2]; // Group 2 is description

                // Cleanup Description:
                // Removing any leading/trailing special chars, extra spaces
                let desc = rawDesc.trim();

                // If description contains a long number (like UPI ref), keep it, it's useful.
                // But try to remove "AT" or "POS" prefixes if generic? No, keep it simple.

                if (desc.length < 3) desc = "Bank Transaction";

                let type = 'expense';
                let finalAmount = parseFloat(amountStr);

                // In this format, credits usually have "CR" or are in a separate column?
                const lowerDesc = desc.toLowerCase();
                const upperDesc = desc.toUpperCase(); // check for /CR/ specifically

                // Keywords for Income:
                // "/CR/" (Common in UPI), " CR " (Suffix), "Credit", "Refund", "Salary", "Deposit", "IMPS", "Inward", "Received", "Return"
                if (
                    upperDesc.includes('/CR/') ||
                    upperDesc.includes(' CR ') ||
                    lowerDesc.includes('credit') ||
                    lowerDesc.includes('refund') ||
                    lowerDesc.includes('salary') ||
                    lowerDesc.includes('deposit') ||
                    lowerDesc.includes('imps') ||
                    lowerDesc.includes('inward') ||
                    lowerDesc.includes('received') ||
                    lowerDesc.includes('return') ||
                    lowerDesc.includes('reversal')
                ) {
                    type = 'income';
                }

                // Category Guess logic
                // const lowerDesc = desc.toLowerCase(); // Already defined above
                let categoryId = '';
                if (lowerDesc.includes('swiggy') || lowerDesc.includes('zomato') || lowerDesc.includes('food')) categoryId = categories.find(c => c.name === 'Food')?.id;
                else if (lowerDesc.includes('uber') || lowerDesc.includes('ola') || lowerDesc.includes('fuel')) categoryId = categories.find(c => c.name === 'Transport')?.id;

                return {
                    id: index,
                    date: dateStr,
                    description: desc,
                    amount: finalAmount,
                    type,
                    category_id: categoryId || categories.find(c => c.name === 'Other')?.id,
                    selected: true
                };
            });

            setParsedTxs(transactions);
            setStep(2);
        } catch (error) {
            console.error(error);
            alert("Failed to parse PDF. Is it a valid bank statement? Error: " + error.message);
        } finally {
            setIsParsing(false);
        }
    };

    const handleImport = async () => {
        setStep(3);
        const toImport = parsedTxs.filter(t => t.selected);
        setImportProgress({ current: 0, total: toImport.length });

        for (let i = 0; i < toImport.length; i++) {
            const tx = toImport[i];

            // Format Date for Supabase (YYYY-MM-DD)
            // Parse DD/MM/YYYY or DD MMM YYYY
            const d = new Date(tx.date); // JS Date might parse it, but let's be safe
            // If DD/MM/YYYY
            let isoDate = new Date().toISOString();
            if (tx.date.includes('/')) {
                const parts = tx.date.split('/');
                if (parts.length === 3) isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
            } else {
                isoDate = new Date(tx.date).toISOString().split('T')[0];
            }

            await addTransaction({
                amount: tx.amount,
                type: tx.type,
                category_id: tx.category_id,
                description: tx.description,
                transaction_date: isoDate
            });

            setImportProgress(prev => ({ ...prev, current: i + 1 }));
        }

        // Done
        onClose();
    };

    // ... UI Rendering ...
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-2xl bg-[#0f172a] rounded-[24px] border border-white/10 flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/5">
                    <h2 className="text-lg font-semibold text-gray-100">Import Statement</h2>
                    <button onClick={onClose}><X size={20} className="text-muted" /></button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 relative">
                    {step === 1 && (
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-white/10 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group relative">
                                <input type="file" accept=".pdf" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                <Upload size={32} className="text-muted mb-3 group-hover:text-accent transition-colors" />
                                <p className="text-sm font-medium text-gray-300">Drop PDF here or click to upload</p>
                                <p className="text-xs text-muted mt-1">Supports standard bank formats</p>
                                {isParsing && <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl"><span className="text-accent animate-pulse">Parsing PDF...</span></div>}
                            </div>

                            {/* Debug Section */}
                            {showDebug && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <h3 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2"><AlertTriangle size={16} /> Debug: Raw Text Extracted</h3>
                                    <p className="text-xs text-muted mb-2">If this is empty, your PDF is an image. If it has text but no transactions, the format is unique.</p>
                                    <textarea
                                        readOnly
                                        value={debugText}
                                        className="w-full h-32 bg-black/50 text-[10px] font-mono p-2 rounded border border-white/10 text-gray-400"
                                    />
                                    <button onClick={() => setShowDebug(false)} className="text-xs text-red-400 underline mt-2">Close Debug</button>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-center text-sm text-muted">
                                <span>Found {parsedTxs.length} transactions</span>
                                <button onClick={() => setStep(1)} className="text-accent hover:underline">Re-upload</button>
                            </div>

                            <div className="space-y-2">
                                {parsedTxs.map((tx, i) => (
                                    <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${tx.selected ? 'bg-white/5 border-white/10' : 'opacity-50 border-transparent'}`}>
                                        <input
                                            type="checkbox"
                                            checked={tx.selected}
                                            onChange={(e) => {
                                                const newTxs = [...parsedTxs];
                                                newTxs[i].selected = e.target.checked;
                                                setParsedTxs(newTxs);
                                            }}
                                            className="accent-accent"
                                        />
                                        <div className="flex-1 min-w-0 grid grid-cols-[80px_1fr_100px_80px] gap-2 items-center">
                                            <span className="text-xs text-muted">{tx.date}</span>
                                            <input
                                                value={tx.description}
                                                onChange={(e) => {
                                                    const newTxs = [...parsedTxs];
                                                    newTxs[i].description = e.target.value;
                                                    setParsedTxs(newTxs);
                                                }}
                                                className="bg-transparent border-none focus:outline-none text-sm text-gray-200 w-full"
                                            />
                                            <div className="flex items-center gap-1">
                                                <select
                                                    value={tx.type}
                                                    onChange={(e) => {
                                                        const newTxs = [...parsedTxs];
                                                        newTxs[i].type = e.target.value;
                                                        setParsedTxs(newTxs);
                                                    }}
                                                    className="bg-black/20 text-xs rounded px-1 py-0.5 border border-white/10"
                                                >
                                                    <option value="expense">Exp</option>
                                                    <option value="income">Inc</option>
                                                </select>
                                                <span className="text-sm font-medium">{tx.amount}</span>
                                            </div>
                                            {/* Category Select - Simplified */}
                                            <div className="text-xs text-muted truncate">
                                                {categories.find(c => c.id === tx.category_id)?.name || 'Other'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin mb-4" />
                            <h3 className="text-lg font-medium">Importing Transactions...</h3>
                            <p className="text-muted">{importProgress.current} / {importProgress.total}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 2 && (
                    <div className="p-5 border-t border-white/5 bg-black/20 rounded-b-[24px]">
                        <button
                            onClick={handleImport}
                            className="w-full py-3 bg-accent hover:bg-accent/90 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            Import {parsedTxs.filter(t => t.selected).length} Transactions <ArrowRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
