"use client";

import React, { useState } from "react";
import { Home, BarChart2, Target, CreditCard, Users, Settings, ShoppingCart, LogOut, Shield } from "lucide-react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function MobileNav() {
    const pathname = usePathname();
    const { user, signOut, canAccessAdminPanel, isSuperAdminUser } = useAuth();

    const navItems = [
        { name: "Overview", icon: Home, href: "/" },
        { name: "Sales", icon: ShoppingCart, href: "/sales" },
        { name: "Ops", icon: Target, href: "/operations" },
        { name: "Work", icon: BarChart2, href: "/contracting" },
        { name: "Staff", icon: Users, href: "/staff" },
        { name: "Mktg", icon: Target, href: "/marketing" },
        { name: "Reports", icon: BarChart2, href: "/reports" },
        { name: "Pending", icon: CreditCard, href: "/pending" },
        { name: "Wallets", icon: CreditCard, href: "/wallets" },
        { name: "Transactions", icon: CreditCard, href: "/transactions" },
        { name: "Settings", icon: Settings, href: "/contracting/settings" },
        ...((canAccessAdminPanel || isSuperAdminUser) ? [{ name: "Admin", icon: Shield, href: "/admin" }] : []),
    ];

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

            {user && (
                <button
                    type="button"
                    onClick={() => signOut()}
                    className="flex-shrink-0 flex flex-col items-center gap-[4px] min-w-[50px] text-[0.65rem] text-red-400 opacity-80 hover:opacity-100 cursor-pointer"
                >
                    <div className="p-2 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400">
                        <LogOut size={18} />
                    </div>
                    <span className="whitespace-nowrap">Logout</span>
                </button>
            )}
        </nav>
    );
}
