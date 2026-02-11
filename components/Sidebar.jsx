"use client";

import React from "react";
import { Home, BarChart2, CreditCard, Target, Users, Settings } from "lucide-react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFinance } from "../context/FinanceContext";

import Image from "next/image";

export default function Sidebar() {
    const pathname = usePathname();
    const { financials, loading, contacts } = useFinance();

    // Calculate Debt/Credit Metrics
    const toReceive = contacts?.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0) || 0;
    const toPay = Math.abs(contacts?.reduce((sum, c) => sum + (c.balance < 0 ? c.balance : 0), 0) || 0);

    const navItems = [
        { name: "Overview", icon: Home, href: "/" },
        { name: "Wallets", icon: CreditCard, href: "/wallets" },
        { name: "Operations", icon: Target, href: "/operations" },
        { name: "Contracting", icon: BarChart2, href: "/contracting" },
        { name: "Staff", icon: Users, href: "/staff" },
        { name: "Marketing", icon: Target, href: "/marketing" },
        { name: "Reports", icon: BarChart2, href: "/reports" },
        { name: "Pending", icon: CreditCard, href: "/pending" },
        { name: "Contacts", icon: Users, href: "/contacts" },
        { name: "Transactions", icon: CreditCard, href: "/transactions" },
        { name: "Settings", icon: Settings, href: "/contracting/settings" },
    ];

    return (
        <aside className="hidden md:flex flex-col gap-4 w-[250px] sticky top-4 self-start shrink-0">
            <div className="glass p-4 md:p-[18px]">
                {/* Logo */}
                <div className="flex items-center gap-3 mb-[18px]">
                    <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-[0_0_12px_rgba(91,141,255,0.5)]">
                        <Image src="/logo.png" alt="Jasper Logo" width={36} height={36} className="object-cover" />
                    </div>
                    <div className="font-semibold tracking-wide text-[1.1rem] text-text">GFE ERP</div>
                </div>

                <div className="text-[0.78rem] text-muted mb-[18px]">
                    Personal finance cockpit. Track, tame, and tune your cashflow.
                </div>

                {/* Navigation */}
                <nav className="flex flex-col gap-1.5 mb-3.5">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-2 px-2.5 py-2 rounded-full text-[0.82rem] transition-all duration-200 ${isActive
                                    ? "text-black bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] shadow-[0_4px_12px_rgba(255,215,0,0.3)] font-medium"
                                    : "text-muted hover:text-white hover:bg-[rgba(255,255,255,0.08)]"
                                    }`}
                            >
                                <Icon size={16} strokeWidth={2} />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Metrics */}
                <div className="flex flex-col gap-2.5 pt-2 border-t border-[rgba(255,255,255,0.08)]">
                    <div className="text-[0.78rem] text-muted">This month’s pulse</div>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                        <div className="text-[0.72rem] px-2.5 py-1 rounded-full bg-[rgba(255,215,0,0.1)] text-[#FFD700] border border-[rgba(255,215,0,0.2)] whitespace-nowrap">
                            Savings rate {loading ? "..." : `${financials.savingsRate}%`}
                        </div>
                        <div className="text-[0.72rem] px-2.5 py-1 rounded-full bg-[rgba(15,23,42,0.85)] border border-[rgba(148,163,184,0.5)] text-muted whitespace-nowrap">
                            {loading ? "..." : `${financials.topCategory.name} ₹${financials.topCategory.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                        </div>
                        {/* 
                        <div className="text-[0.72rem] px-2.5 py-1 rounded-full bg-[rgba(15,23,42,0.85)] border border-[rgba(148,163,184,0.5)] text-muted whitespace-nowrap">
                            Subscriptions: ₹2.3k/mo
                        </div>
                        */}
                    </div>

                    <div className="flex flex-col gap-2 text-[0.74rem] text-muted mt-2">
                        <div className="flex justify-between items-center gap-2">
                            <span>Runway</span>
                            <span className="text-[0.7rem] px-1.5 py-0.5 rounded-full border border-[rgba(148,163,184,0.5)] text-gray-200 whitespace-nowrap">
                                {loading ? "..." : (financials.runway === "No Burn" ? "No Burn" : `${financials.runway} mo`)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                            <span>Spending vs budget</span>
                            <span className="text-[0.7rem] px-1.5 py-0.5 rounded-full border border-[rgba(148,163,184,0.5)] text-gray-200 whitespace-nowrap">
                                {loading ? "..." : `${financials.spendingPercentage}% used`}
                            </span>
                        </div>

                        {/* Debt / Credit Badges */}
                        {(toReceive > 0 || toPay > 0) && (
                            <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-[rgba(148,163,184,0.15)]">
                                {toReceive > 0 && (
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="text-green-400/80">To Receive</span>
                                        <span className="text-[0.7rem] px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 font-medium whitespace-nowrap">
                                            ₹{toReceive.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </span>
                                    </div>
                                )}
                                {toPay > 0 && (
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="text-red-400/80">To Pay</span>
                                        <span className="text-[0.7rem] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-medium whitespace-nowrap">
                                            ₹{toPay.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {!loading && financials.solvency?.isInsolvent && (
                        <div className="mt-5 mb-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col gap-1.5 backdrop-blur-md">
                            <div className="flex items-center gap-2 text-red-200 text-[0.78rem] font-medium">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                </span>
                                Budget Exceeds Balance
                            </div>
                            <div className="text-[0.72rem] text-red-200/80 pl-4">
                                Short by ₹{financials.solvency.gap.toLocaleString()}
                            </div>
                        </div>
                    )}



                    <div className="mt-3 text-[0.74rem] text-muted opacity-90">
                        Global monthly budget applies to all categories.
                    </div>
                </div>
            </div>
        </aside>
    );
}
