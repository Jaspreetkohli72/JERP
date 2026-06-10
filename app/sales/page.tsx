"use client";
import React, { useState, useEffect } from "react";
import { useFinance } from "@/context/FinanceContext";
import CustomSelect from "@/components/CustomSelect";
import { ArrowLeft, ShoppingCart, Settings, Plus, Check, X, DollarSign, Wallet, ClipboardList, Clock, ChevronDown } from "lucide-react";
import Link from "next/link";

const DEFAULT_RATES_KEY = "gfe_sales_default_rates";
const CLIENT_RATES_KEY = "gfe_sales_client_rates";

const INITIAL_DEFAULT_RATES = {
    ghodi_nonfolding_5ft: 1200,
    ghodi_nonfolding_6ft: 1500,
    ghodi_folding_5ft: 1500,
    ghodi_folding_6ft: 1800,
    trolley_bucket: 2000,
    trolley_cylinder_single_heavy: 2500,
    trolley_cylinder_single_light: 2000,
    trolley_cylinder_double_heavy: 3500,
    trolley_cylinder_double_light: 3000,
};

interface SaleRecord {
    id: string;
    date: string;
    client_id: string;
    client_name: string;
    product_name: string;
    quantity: number;
    rate: number;
    total_amount: number;
    is_paid: boolean;
    wallet_id: string | null;
}

export default function SalesPage() {
    // @ts-ignore
    const { contacts = [], addContact, addTransaction, wallets = [], sales = [], addSale, updateSale } = useFinance();

    // Default & Client Rates States
    const [defaultRates, setDefaultRates] = useState(INITIAL_DEFAULT_RATES);
    const [clientRates, setClientRates] = useState<Record<string, Record<string, number>>>({});

    // Ghodi Card States
    const [ghodiFolding, setGhodiFolding] = useState<"folding" | "nonfolding">("nonfolding");
    const [ghodiSize, setGhodiSize] = useState<"5ft" | "6ft">("5ft");
    const [ghodiClient, setGhodiClient] = useState("");
    const [ghodiCustomRate, setGhodiCustomRate] = useState("");
    const [isCreatingGhodiClient, setIsCreatingGhodiClient] = useState(false);
    const [newGhodiClientName, setNewGhodiClientName] = useState("");
    const [ghodiWalletId, setGhodiWalletId] = useState("");
    const [isRecordingGhodiSale, setIsRecordingGhodiSale] = useState(false);
    const [ghodiPcsSold, setGhodiPcsSold] = useState(0);
    const [ghodiIsPaid, setGhodiIsPaid] = useState(true);
    const [ghodiSaleDate, setGhodiSaleDate] = useState(() => new Date().toISOString().split("T")[0]);

    // Trolley Card States
    const [trolleyType, setTrolleyType] = useState<"bucket" | "cylinder">("bucket");
    const [trolleyCylinderType, setTrolleyCylinderType] = useState<"single" | "double">("single");
    const [trolleyWeight, setTrolleyWeight] = useState<"heavy" | "light">("heavy");
    const [trolleyClient, setTrolleyClient] = useState("");
    const [trolleyCustomRate, setTrolleyCustomRate] = useState("");
    const [isCreatingTrolleyClient, setIsCreatingTrolleyClient] = useState(false);
    const [newTrolleyClientName, setNewTrolleyClientName] = useState("");
    const [trolleyWalletId, setTrolleyWalletId] = useState("");
    const [isRecordingTrolleySale, setIsRecordingTrolleySale] = useState(false);
    const [trolleyPcsSold, setTrolleyPcsSold] = useState(0);
    const [trolleyIsPaid, setTrolleyIsPaid] = useState(true);
    const [trolleySaleDate, setTrolleySaleDate] = useState(() => new Date().toISOString().split("T")[0]);

    // Outstanding collection wallet map (unpaid_sale_id -> selected_wallet_id)
    const [collectWalletIds, setCollectWalletIds] = useState<Record<string, string>>({});
    // Track which client rows are expanded in Outstanding Collections
    const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});

    // Load rates from localStorage on mount (config only — not sales data)
    useEffect(() => {
        const storedDefaults = localStorage.getItem(DEFAULT_RATES_KEY);
        if (storedDefaults) {
            try {
                const parsed = JSON.parse(storedDefaults);
                setDefaultRates(parsed);
            } catch (e) {
                console.error(e);
            }
        }
        const storedClientRates = localStorage.getItem(CLIENT_RATES_KEY);
        if (storedClientRates) {
            try {
                setClientRates(JSON.parse(storedClientRates));
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    // Helper to fetch custom wallet default when wallets load
    useEffect(() => {
        if (wallets.length > 0) {
            setGhodiWalletId(wallets[0].id);
            setTrolleyWalletId(wallets[0].id);
        }
    }, [wallets]);

    // Product Key Builders
    const getGhodiKey = (folding: string, size: string) => {
        return `ghodi_${folding}_${size}`;
    };

    const getTrolleyKey = (type: string, cylType: string, weight: string) => {
        if (type === "bucket") {
            return "trolley_bucket";
        }
        return `trolley_cylinder_${cylType}_${weight}`;
    };

    // Rate Resolvers
    const getActiveGhodiRate = () => {
        const key = getGhodiKey(ghodiFolding, ghodiSize);
        if (ghodiClient && clientRates[ghodiClient]?.[key] !== undefined) {
            return clientRates[ghodiClient][key];
        }
        // @ts-ignore
        return defaultRates[key] || INITIAL_DEFAULT_RATES[key];
    };

    const getActiveTrolleyRate = () => {
        const key = getTrolleyKey(trolleyType, trolleyCylinderType, trolleyWeight);
        if (trolleyClient && clientRates[trolleyClient]?.[key] !== undefined) {
            return clientRates[trolleyClient][key];
        }
        // @ts-ignore
        return defaultRates[key] || INITIAL_DEFAULT_RATES[key];
    };

    // Client rate input sync on config changes
    useEffect(() => {
        const key = getGhodiKey(ghodiFolding, ghodiSize);
        if (ghodiClient && clientRates[ghodiClient]?.[key] !== undefined) {
            setGhodiCustomRate(String(clientRates[ghodiClient][key]));
        } else {
            setGhodiCustomRate("");
        }
    }, [ghodiFolding, ghodiSize, ghodiClient, clientRates]);

    useEffect(() => {
        const key = getTrolleyKey(trolleyType, trolleyCylinderType, trolleyWeight);
        if (trolleyClient && clientRates[trolleyClient]?.[key] !== undefined) {
            setTrolleyCustomRate(String(clientRates[trolleyClient][key]));
        } else {
            setTrolleyCustomRate("");
        }
    }, [trolleyType, trolleyCylinderType, trolleyWeight, trolleyClient, clientRates]);

    // Client rate save handlers
    const saveGhodiClientRate = () => {
        if (!ghodiClient) return;
        const key = getGhodiKey(ghodiFolding, ghodiSize);
        const rateVal = parseFloat(ghodiCustomRate);
        if (isNaN(rateVal)) return;

        const updated = {
            ...clientRates,
            [ghodiClient]: {
                ...(clientRates[ghodiClient] || {}),
                [key]: rateVal,
            },
        };
        setClientRates(updated);
        localStorage.setItem(CLIENT_RATES_KEY, JSON.stringify(updated));
        alert("Custom client rate saved!");
    };

    const saveTrolleyClientRate = () => {
        if (!trolleyClient) return;
        const key = getTrolleyKey(trolleyType, trolleyCylinderType, trolleyWeight);
        const rateVal = parseFloat(trolleyCustomRate);
        if (isNaN(rateVal)) return;

        const updated = {
            ...clientRates,
            [trolleyClient]: {
                ...(clientRates[trolleyClient] || {}),
                [key]: rateVal,
            },
        };
        setClientRates(updated);
        localStorage.setItem(CLIENT_RATES_KEY, JSON.stringify(updated));
        alert("Custom client rate saved!");
    };



    // Inline Client Creators
    const handleCreateGhodiClient = async () => {
        const trimmed = newGhodiClientName.trim();
        if (!trimmed) return;
        const res = await addContact({ name: trimmed });
        if (res.success && res.data) {
            setGhodiClient(res.data.id);
            setIsCreatingGhodiClient(false);
            setNewGhodiClientName("");
        } else {
            alert(res.error?.message || "Failed to create client");
        }
    };

    const handleCreateTrolleyClient = async () => {
        const trimmed = newTrolleyClientName.trim();
        if (!trimmed) return;
        const res = await addContact({ name: trimmed });
        if (res.success && res.data) {
            setTrolleyClient(res.data.id);
            setIsCreatingTrolleyClient(false);
            setNewTrolleyClientName("");
        } else {
            alert(res.error?.message || "Failed to create client");
        }
    };

    // Sale Record Handlers
    const handleRecordGhodiSale = async () => {
        if (ghodiIsPaid && !ghodiWalletId) {
            alert("Please select a wallet to receive payment.");
            return;
        }

        const rate = getActiveGhodiRate();
        const clientObj = contacts.find((c: any) => c.id === ghodiClient);
        const clientName = clientObj ? clientObj.name : "Walk-in";
        const foldLabel = ghodiFolding === "folding" ? "Folding" : "Non-Folding";
        const productName = `Ghodi - ${foldLabel} ${ghodiSize}`;
        const totalAmount = rate * ghodiPcsSold;
        const desc = `Sale: ${productName} x${ghodiPcsSold} (${clientName})`;

        // Save sale to Supabase
        const newSale: SaleRecord = {
            id: `sale-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            date: ghodiSaleDate,
            client_id: ghodiClient,
            client_name: clientName,
            product_name: productName,
            quantity: ghodiPcsSold,
            rate: rate,
            total_amount: totalAmount,
            is_paid: ghodiIsPaid,
            wallet_id: ghodiIsPaid ? ghodiWalletId : null
        };

        let transactionSuccess = true;
        if (ghodiIsPaid) {
            const res = await addTransaction({
                amount: totalAmount,
                type: "income",
                description: desc,
                wallet_id: ghodiWalletId,
                contact_id: ghodiClient || null,
                is_debt: false,
                transaction_date: ghodiSaleDate,
            });
            transactionSuccess = res.success;
        }

        if (transactionSuccess) {
            await addSale(newSale);
            alert(ghodiIsPaid ? "Sale recorded and payment logged successfully!" : "Unpaid sale recorded under Outstanding Collections.");
            setIsRecordingGhodiSale(false);
            setGhodiPcsSold(0);
            setGhodiSaleDate(new Date().toISOString().split("T")[0]);
        } else {
            alert("Failed to log transaction.");
        }
    };

    const handleRecordTrolleySale = async () => {
        if (trolleyIsPaid && !trolleyWalletId) {
            alert("Please select a wallet to receive payment.");
            return;
        }

        const rate = getActiveTrolleyRate();
        const clientObj = contacts.find((c: any) => c.id === trolleyClient);
        const clientName = clientObj ? clientObj.name : "Walk-in";
        const productName = trolleyType === "bucket"
            ? "Bucket Trolley"
            : `Cylinder Trolley - ${trolleyCylinderType.toUpperCase()} [${trolleyWeight.toUpperCase()}]`;
        const totalAmount = rate * trolleyPcsSold;
        const desc = `Sale: ${productName} x${trolleyPcsSold} (${clientName})`;

        // Save sale to Supabase
        const newSale: SaleRecord = {
            id: `sale-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            date: trolleySaleDate,
            client_id: trolleyClient,
            client_name: clientName,
            product_name: productName,
            quantity: trolleyPcsSold,
            rate: rate,
            total_amount: totalAmount,
            is_paid: trolleyIsPaid,
            wallet_id: trolleyIsPaid ? trolleyWalletId : null
        };

        let transactionSuccess = true;
        if (trolleyIsPaid) {
            const res = await addTransaction({
                amount: totalAmount,
                type: "income",
                description: desc,
                wallet_id: trolleyWalletId,
                contact_id: trolleyClient || null,
                is_debt: false,
                transaction_date: trolleySaleDate,
            });
            transactionSuccess = res.success;
        }

        if (transactionSuccess) {
            await addSale(newSale);
            alert(trolleyIsPaid ? "Sale recorded and payment logged successfully!" : "Unpaid sale recorded under Outstanding Collections.");
            setIsRecordingTrolleySale(false);
            setTrolleyPcsSold(0);
            setTrolleySaleDate(new Date().toISOString().split("T")[0]);
        } else {
            alert("Failed to log transaction.");
        }
    };

    // Outstanding collection confirm handler
    const handleCollectPayment = async (sale: SaleRecord) => {
        const walletId = collectWalletIds[sale.id];
        if (!walletId) {
            alert("Please select a wallet to receive the payment.");
            return;
        }

        const desc = `Payment received: Sale: ${sale.product_name} x${sale.quantity} (${sale.client_name})`;
        const res = await addTransaction({
            amount: sale.total_amount,
            type: "income",
            description: desc,
            wallet_id: walletId,
            contact_id: sale.client_id || null,
            is_debt: false,
        });

        if (res.success) {
            await updateSale(sale.id, { is_paid: true, wallet_id: walletId });
            alert("Outstanding payment collected successfully and logged to transactions!");
        } else {
            alert("Failed to record payment transaction.");
        }
    };

    const unpaidSales = (sales as SaleRecord[]).filter(s => s.is_paid === false);

    return (
        <div className="p-4 md:p-8 text-white max-w-[1200px] mx-auto mb-20 animate-in fade-in duration-500 flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] bg-clip-text text-transparent flex items-center gap-2">
                            <ShoppingCart size={28} className="text-[var(--accent)]" /> Sales Dashboard
                        </h1>
                        <p className="text-muted text-sm mt-1">Configure fabrications product options, override client rates, and log sales.</p>
                    </div>
                </div>
                <Link
                    href="/sales/rates"
                    className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl border border-white/5 transition-all flex items-center justify-center"
                    title="Configure Default Rates"
                >
                    <Settings size={20} />
                </Link>
            </div>

            {/* Configurator Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ghodi Card */}
                <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col gap-5 justify-between relative overflow-hidden">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <h2 className="text-xl font-bold text-gray-200">Ghodi Configurator</h2>
                            <span className="text-[10px] uppercase font-bold tracking-widest bg-[var(--accent)]/15 text-[var(--accent)] px-2.5 py-1 rounded-full">Fabrications</span>
                        </div>

                        {/* Options selectors */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Folding Option</label>
                                <CustomSelect
                                    value={ghodiFolding}
                                    onChange={val => setGhodiFolding(val as any)}
                                    options={[
                                        { value: "nonfolding", label: "Non-Folding" },
                                        { value: "folding", label: "Folding" }
                                    ]}
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Size Option</label>
                                <CustomSelect
                                    value={ghodiSize}
                                    onChange={val => setGhodiSize(val as any)}
                                    options={[
                                        { value: "5ft", label: "5 Feet" },
                                        { value: "6ft", label: "6 Feet" }
                                    ]}
                                />
                            </div>
                        </div>

                        {/* Client Selector inline creator */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Client (Optional)</label>
                            {!isCreatingGhodiClient ? (
                                <CustomSelect
                                    placeholder="Select Client (Default rates apply)"
                                    value={ghodiClient}
                                    onChange={val => {
                                        if (val === "create_new") {
                                            setIsCreatingGhodiClient(true);
                                        } else {
                                            setGhodiClient(val);
                                        }
                                    }}
                                    options={[
                                        { value: "", label: "Select Client (Default rates apply)" },
                                        ...contacts.map((c: any) => ({ value: c.id, label: c.name })),
                                        { value: "create_new", label: "+ Create New Client..." }
                                    ]}
                                />
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-sm focus:border-[var(--accent)] focus:outline-none text-white"
                                        placeholder="New Client Name"
                                        value={newGhodiClientName}
                                        onChange={e => setNewGhodiClientName(e.target.value)}
                                        onKeyDown={e => { if (e.key === "Enter") handleCreateGhodiClient(); }}
                                    />
                                    <button type="button" onClick={handleCreateGhodiClient} className="p-3 bg-[var(--accent)]/20 text-[var(--accent)] rounded-xl hover:bg-[var(--accent)]/30"><Check size={18} /></button>
                                    <button type="button" onClick={() => { setIsCreatingGhodiClient(false); setNewGhodiClientName(""); }} className="p-3 bg-white/5 text-gray-400 rounded-xl hover:bg-white/10"><X size={18} /></button>
                                </div>
                            )}
                        </div>

                        {/* Quantity and Date */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Quantity (pcs)</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none text-white"
                                    value={ghodiPcsSold}
                                    onChange={e => setGhodiPcsSold(Math.max(0, parseInt(e.target.value) || 0))}
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Sale Date</label>
                                <input
                                    type="date"
                                    className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none text-white [color-scheme:dark]"
                                    value={ghodiSaleDate}
                                    onChange={e => setGhodiSaleDate(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Paid Status & Receiving Wallet */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 accent-[var(--accent)] rounded"
                                    checked={ghodiIsPaid}
                                    onChange={e => setGhodiIsPaid(e.target.checked)}
                                />
                                Paid immediately
                            </label>

                            {ghodiIsPaid && (
                                <div className="flex flex-col gap-1.5">
                                    <CustomSelect
                                        value={ghodiWalletId}
                                        onChange={val => setGhodiWalletId(val as string)}
                                        triggerClassName="p-2.5 text-xs font-medium"
                                        options={wallets.map((w: any) => ({
                                            value: w.id,
                                            label: `${w.name} (Bal: ₹${Number(w.balance).toLocaleString()})`
                                        }))}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Pricing section */}
                        <div className="bg-black/20 p-4 rounded-xl border border-white/5 flex flex-col gap-3">
                            <div className="flex justify-between items-center text-sm text-gray-300">
                                <span>Unit Rate:</span>
                                <span>₹{getActiveGhodiRate().toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center border-t border-white/5 pt-2">
                                <span className="text-sm font-semibold text-gray-200">Total Price:</span>
                                <span className="text-xl font-bold text-[var(--accent)]">₹{(getActiveGhodiRate() * ghodiPcsSold).toLocaleString()}</span>
                            </div>

                            {/* Client Override option */}
                            {ghodiClient && (
                                <div className="flex flex-col gap-1.5 pt-3 border-t border-white/5">
                                    <label className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Set Client Override Rate (₹)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none text-white"
                                            placeholder="Enter Custom Rate"
                                            value={ghodiCustomRate}
                                            onChange={e => setGhodiCustomRate(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={saveGhodiClientRate}
                                            className="bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-black px-4 py-2 rounded-xl text-xs font-bold"
                                        >
                                            Save Rate
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Record Sale button */}
                    <div className="border-t border-white/10 pt-4">
                        <button
                            type="button"
                            onClick={handleRecordGhodiSale}
                            className="w-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-lg shadow-[var(--accent)]/15"
                        >
                            <DollarSign size={18} /> Record Ghodi Sale
                        </button>
                    </div>
                </div>

                {/* Trolley Card */}
                <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col gap-5 justify-between relative overflow-hidden">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <h2 className="text-xl font-bold text-gray-200">Trolley Configurator</h2>
                            <span className="text-[10px] uppercase font-bold tracking-widest bg-[var(--accent)]/15 text-[var(--accent)] px-2.5 py-1 rounded-full">Fabrications</span>
                        </div>

                        {/* Options Selectors */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Trolley Type</label>
                                <CustomSelect
                                    value={trolleyType}
                                    onChange={val => setTrolleyType(val as any)}
                                    options={[
                                        { value: "bucket", label: "Bucket" },
                                        { value: "cylinder", label: "Cylinder" }
                                    ]}
                                />
                            </div>

                            {trolleyType === "cylinder" ? (
                                <>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Capacity</label>
                                        <CustomSelect
                                            value={trolleyCylinderType}
                                            onChange={val => setTrolleyCylinderType(val as any)}
                                            options={[
                                                { value: "single", label: "Single" },
                                                { value: "double", label: "Double" }
                                            ]}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Weight</label>
                                        <CustomSelect
                                            value={trolleyWeight}
                                            onChange={val => setTrolleyWeight(val as any)}
                                            options={[
                                                { value: "heavy", label: "Heavy" },
                                                { value: "light", label: "Light" }
                                            ]}
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex flex-col gap-1.5 opacity-40">
                                        <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Capacity</label>
                                        <CustomSelect
                                            disabled={true}
                                            value="na"
                                            options={[{ value: "na", label: "N/A" }]}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5 opacity-40">
                                        <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Weight</label>
                                        <CustomSelect
                                            disabled={true}
                                            value="na"
                                            options={[{ value: "na", label: "N/A" }]}
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Client selector inline creator */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Client (Optional)</label>
                            {!isCreatingTrolleyClient ? (
                                <CustomSelect
                                    placeholder="Select Client (Default rates apply)"
                                    value={trolleyClient}
                                    onChange={val => {
                                        if (val === "create_new") {
                                            setIsCreatingTrolleyClient(true);
                                        } else {
                                            setTrolleyClient(val);
                                        }
                                    }}
                                    options={[
                                        { value: "", label: "Select Client (Default rates apply)" },
                                        ...contacts.map((c: any) => ({ value: c.id, label: c.name })),
                                        { value: "create_new", label: "+ Create New Client..." }
                                    ]}
                                />
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-sm focus:border-[var(--accent)] focus:outline-none text-white"
                                        placeholder="New Client Name"
                                        value={newTrolleyClientName}
                                        onChange={e => setNewTrolleyClientName(e.target.value)}
                                        onKeyDown={e => { if (e.key === "Enter") handleCreateTrolleyClient(); }}
                                    />
                                    <button type="button" onClick={handleCreateTrolleyClient} className="p-3 bg-[var(--accent)]/20 text-[var(--accent)] rounded-xl hover:bg-[var(--accent)]/30"><Check size={18} /></button>
                                    <button type="button" onClick={() => { setIsCreatingTrolleyClient(false); setNewTrolleyClientName(""); }} className="p-3 bg-white/5 text-gray-400 rounded-xl hover:bg-white/10"><X size={18} /></button>
                                </div>
                            )}
                        </div>

                        {/* Quantity and Date */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Quantity (pcs)</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none text-white"
                                    value={trolleyPcsSold}
                                    onChange={e => setTrolleyPcsSold(Math.max(0, parseInt(e.target.value) || 0))}
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Sale Date</label>
                                <input
                                    type="date"
                                    className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none text-white [color-scheme:dark]"
                                    value={trolleySaleDate}
                                    onChange={e => setTrolleySaleDate(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Paid Status & Receiving Wallet */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 accent-[var(--accent)] rounded"
                                    checked={trolleyIsPaid}
                                    onChange={e => setTrolleyIsPaid(e.target.checked)}
                                />
                                Paid immediately
                            </label>

                            {trolleyIsPaid && (
                                <div className="flex flex-col gap-1.5">
                                    <CustomSelect
                                        value={trolleyWalletId}
                                        onChange={val => setTrolleyWalletId(val as string)}
                                        triggerClassName="p-2.5 text-xs font-medium"
                                        options={wallets.map((w: any) => ({
                                            value: w.id,
                                            label: `${w.name} (Bal: ₹${Number(w.balance).toLocaleString()})`
                                        }))}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Pricing display */}
                        <div className="bg-black/20 p-4 rounded-xl border border-white/5 flex flex-col gap-3">
                            <div className="flex justify-between items-center text-sm text-gray-300">
                                <span>Unit Rate:</span>
                                <span>₹{getActiveTrolleyRate().toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center border-t border-white/5 pt-2">
                                <span className="text-sm font-semibold text-gray-200">Total Price:</span>
                                <span className="text-xl font-bold text-[var(--accent)]">₹{(getActiveTrolleyRate() * trolleyPcsSold).toLocaleString()}</span>
                            </div>

                            {/* Client custom override */}
                            {trolleyClient && (
                                <div className="flex flex-col gap-1.5 pt-3 border-t border-white/5">
                                    <label className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Set Client Override Rate (₹)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none text-white"
                                            placeholder="Enter Custom Rate"
                                            value={trolleyCustomRate}
                                            onChange={e => setTrolleyCustomRate(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={saveTrolleyClientRate}
                                            className="bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-black px-4 py-2 rounded-xl text-xs font-bold"
                                        >
                                            Save Rate
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Record Sale button */}
                    <div className="border-t border-white/10 pt-4">
                        <button
                            type="button"
                            onClick={handleRecordTrolleySale}
                            className="w-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-lg shadow-[var(--accent)]/15"
                        >
                            <DollarSign size={18} /> Record Trolley Sale
                        </button>
                    </div>
                </div>
            </div>

            {/* Outstanding Collections Card */}
            <div className="glass p-6 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col gap-4 w-full">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2">
                        <ClipboardList className="text-yellow-400" size={22} /> Outstanding Collections
                    </h2>
                    <span className="text-[10px] uppercase font-bold tracking-widest bg-yellow-400/10 text-yellow-400 px-3 py-1 rounded-full flex items-center gap-1">
                        <Clock size={12} /> {unpaidSales.length} Pending
                    </span>
                </div>

                <div className="flex flex-col gap-2 overflow-y-auto max-h-[440px] pr-1 pb-32">
                    {unpaidSales.length > 0 ? (() => {
                        // Group by client
                        const grouped: Record<string, { clientName: string; clientId: string; totalOwed: number; sales: SaleRecord[] }> = {};
                        unpaidSales.forEach(sale => {
                            const key = sale.client_id || sale.client_name;
                            if (!grouped[key]) {
                                grouped[key] = { clientName: sale.client_name, clientId: sale.client_id, totalOwed: 0, sales: [] };
                            }
                            grouped[key].totalOwed += Number(sale.total_amount);
                            grouped[key].sales.push(sale);
                        });

                        return Object.entries(grouped).map(([key, group]) => {
                            const isExpanded = !!expandedClients[key];
                            return (
                                <div key={key} className="rounded-xl border border-white/10 overflow-hidden">
                                    {/* Client summary row — click to expand */}
                                    <button
                                        type="button"
                                        onClick={() => setExpandedClients(prev => ({ ...prev, [key]: !prev[key] }))}
                                        className="w-full flex items-center justify-between px-5 py-4 bg-white/5 hover:bg-white/8 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 font-bold text-sm">
                                                {group.clientName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="text-left">
                                                <div className="font-semibold text-white text-base">{group.clientName}</div>
                                                <div className="text-xs text-gray-400">{group.sales.length} {group.sales.length === 1 ? 'delivery' : 'deliveries'} pending</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Total Owed</div>
                                                <div className="text-xl font-bold text-yellow-400">₹{group.totalOwed.toLocaleString()}</div>
                                            </div>
                                            <ChevronDown
                                                size={18}
                                                className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                            />
                                        </div>
                                    </button>

                                    {/* Expanded delivery rows */}
                                    {isExpanded && (
                                        <div className="flex flex-col divide-y divide-white/5 bg-black/20">
                                            {group.sales.map(sale => (
                                                <div key={sale.id} className="px-5 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="font-medium text-gray-200 text-sm">{sale.product_name}</div>
                                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                                            <span><strong className="text-gray-300">{sale.quantity} pcs</strong></span>
                                                            <span>•</span>
                                                            <span>{new Date(sale.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                            <span>•</span>
                                                            <span className="text-yellow-400 font-semibold">₹{Number(sale.total_amount).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <CustomSelect
                                                            placeholder="Choose Wallet"
                                                            value={collectWalletIds[sale.id] || ""}
                                                            onChange={val => setCollectWalletIds({ ...collectWalletIds, [sale.id]: val as string })}
                                                            triggerClassName="p-2 text-xs"
                                                            options={[
                                                                { value: "", label: "Choose Wallet" },
                                                                ...wallets.map((w: any) => ({ value: w.id, label: w.name }))
                                                            ]}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCollectPayment(sale)}
                                                            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors whitespace-nowrap"
                                                        >
                                                            Collect
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        });
                    })() : (
                        <div className="flex flex-col items-center justify-center text-center text-muted py-16 gap-3">
                            <Check size={48} className="text-green-400 opacity-30" />
                            <p className="text-gray-300 font-medium text-lg">All caught up!</p>
                            <p className="text-xs text-gray-500 max-w-xs">There are no outstanding client balances from sales records.</p>
                        </div>
                    )}
                </div>
            </div>


        </div>
    );
}
