"use client";

import React, { useState } from "react";
import { Home, BarChart2, Target, User, Plus, CreditCard, Users, Settings } from "lucide-react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFinance } from "../context/FinanceContext";

export default function MobileNav() {
    const pathname = usePathname();

    const navItems = [
        { name: "Overview", icon: Home, href: "/" }, // Home -> Overview
        { name: "Wallets", icon: CreditCard, href: "/wallets" }, // New
        { name: "Ops", icon: Target, href: "/operations" },
        { name: "Work", icon: BarChart2, href: "/contracting" }, // "Contracting" -> Work (Short name ok)
        { name: "Staff", icon: Users, href: "/staff" },
        { name: "Mktg", icon: Target, href: "/marketing" }, // New
        { name: "Reports", icon: BarChart2, href: "/reports" }, // New
        { name: "Pending", icon: CreditCard, href: "/pending" }, // New
        { name: "Transactions", icon: CreditCard, href: "/transactions" }, // New
        { name: "Settings", icon: Settings, href: "/contracting/settings" }, // New (using Settings icon if available import)
    ];

    // Need Settings icon import if it wasn't there
    // Re-import icons to be sure
    // import { Home, BarChart2, Target, Users, CreditCard, Settings } from "lucide-react";

    return (
        <nav className="fixed left-1/2 bottom-[20px] -translate-x-1/2 w-[min(420px,calc(100%-32px))] rounded-[24px] p-[10px_16px] flex items-center gap-4 bg-[rgba(20,20,20,0.95)] border border-[rgba(255,215,0,0.1)] shadow-[0_18px_40px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,215,0,0.05)] backdrop-blur-[28px] saturate-[1.2] z-50 md:hidden overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex-shrink-0 flex flex-col items-center gap-[4px] min-w-[50px] text-[0.65rem] transition-all ${isActive ? "text-gray-200 opacity-100 scale-105" : "text-muted opacity-60 hover:opacity-100"}`}
                    >
                        <div className={`p-2 rounded-full transition-all ${isActive ? "bg-white/10 text-[#FFD700]" : "bg-transparent"}`}>
                            <Icon size={18} />
                        </div>
                        <span className="whitespace-nowrap">{item.name}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
