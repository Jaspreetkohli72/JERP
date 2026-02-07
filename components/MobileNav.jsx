"use client";

import React, { useState } from "react";
import { Home, BarChart2, Target, User, Plus, CreditCard, Users } from "lucide-react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFinance } from "../context/FinanceContext";

export default function MobileNav() {
    const pathname = usePathname();

    const navItems = [
        { name: "Home", icon: Home, href: "/" },
        { name: "Ops", icon: Target, href: "/operations" },
        { name: "Work", icon: BarChart2, href: "/contracting" },
        { name: "Staff", icon: Users, href: "/staff" },
        { name: "Wallet", icon: CreditCard, href: "/wallets" },
    ];

    return (
        <nav className="fixed left-1/2 bottom-[20px] -translate-x-1/2 w-[min(420px,calc(100%-32px))] rounded-[32px] p-[12px_20px] flex items-center justify-between gap-1 bg-[rgba(20,20,20,0.95)] border border-[rgba(255,215,0,0.1)] shadow-[0_18px_40px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,215,0,0.05)] backdrop-blur-[28px] saturate-[1.2] z-20 md:hidden">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex-1 flex flex-col items-center gap-[4px] text-[0.7rem] transition-all ${isActive ? "text-gray-200 opacity-100" : "text-muted opacity-80"}`}
                    >
                        <Icon size={20} />
                        <span>{item.name}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
