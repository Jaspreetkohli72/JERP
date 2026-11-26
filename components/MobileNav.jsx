"use client";

import React, { useRef, useEffect } from "react";
import { Home, BarChart2, Target, CreditCard, Users, Settings, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileNav() {
    const pathname = usePathname();
    const navRef = useRef(null);

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
    ];

    // Auto-scroll active item into view
    useEffect(() => {
        if (!navRef.current) return;
        const activeLink = navRef.current.querySelector('[data-active="true"]');
        if (activeLink) {
            activeLink.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
    }, [pathname]);

    return (
        <div className="fixed left-1/2 bottom-[14px] -translate-x-1/2 w-[min(440px,calc(100%-24px))] z-50 md:hidden pointer-events-none">
            <nav
                ref={navRef}
                className="pointer-events-auto rounded-[24px] px-2.5 py-1.5 flex items-center gap-2 bg-[rgba(18,18,18,0.94)] border border-[rgba(255,215,0,0.15)] shadow-[0_12px_32px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,215,0,0.06)] backdrop-blur-[24px] saturate-[1.3] overflow-x-auto no-scrollbar scroll-smooth"
            >
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            data-active={isActive ? "true" : undefined}
                            className={`flex-shrink-0 flex flex-col items-center gap-1 min-w-[50px] py-1 text-[0.68rem] transition-all rounded-xl ${
                                isActive
                                    ? "text-gray-100 font-semibold"
                                    : "text-muted opacity-60 hover:opacity-100"
                            }`}
                        >
                            <div className={`p-1.5 rounded-full transition-all ${isActive ? "bg-white/10 text-[var(--accent)] ring-1 ring-[var(--accent)]/30" : "bg-transparent text-gray-400"}`}>
                                <Icon size={17} />
                            </div>
                            <span className="whitespace-nowrap">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
