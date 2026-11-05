"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import GlobalModalWrapper from "@/components/GlobalModalWrapper";
import Image from "next/image";
import { ShieldCheck, Loader2 } from "lucide-react";

const PUBLIC_ROUTES = ["/login", "/reset-password"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

    useEffect(() => {
        if (!loading) {
            if (!user && !isPublicRoute) {
                router.replace("/login");
            } else if (user && isPublicRoute && pathname !== "/reset-password") {
                window.location.href = "/";
            }
        }
    }, [user, loading, isPublicRoute, pathname, router]);

    // 1. Initial Auth Loading Splash (only on protected routes)
    if (loading && !isPublicRoute) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative z-50">
                <div className="glass p-8 rounded-3xl flex flex-col items-center gap-4 max-w-sm w-full text-center border border-[rgba(255,215,0,0.15)] shadow-[0_20px_50px_rgba(0,0,0,0.9)] animate-pulse">
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-[0_0_24px_rgba(255,215,0,0.35)] border border-[rgba(255,215,0,0.3)]">
                        <Image
                            src="/logo.png"
                            alt="GFE ERP"
                            width={64}
                            height={64}
                            className="object-cover"
                            priority
                        />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-wide flex items-center justify-center gap-2">
                            GFE ERP <ShieldCheck size={18} className="text-[#FFD700]" />
                        </h2>
                        <p className="text-xs text-muted mt-1">Verifying secure session...</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#FFD700] font-medium mt-1">
                        <Loader2 size={16} className="animate-spin" />
                        <span>Connecting to Supabase</span>
                    </div>
                </div>
            </div>
        );
    }

    // 2. Unauthenticated user on protected route: redirecting to /login
    if (!user && !isPublicRoute) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center p-4">
                <div className="glass p-6 rounded-2xl flex items-center gap-3 text-muted text-sm border border-[rgba(255,255,255,0.08)]">
                    <Loader2 size={18} className="animate-spin text-[#FFD700]" />
                    <span>Redirecting to login...</span>
                </div>
            </div>
        );
    }

    // 3. Authenticated user on /login: redirecting to /
    if (user && isPublicRoute && pathname !== "/reset-password") {
        return (
            <div className="min-h-screen w-full flex items-center justify-center p-4">
                <div className="glass p-6 rounded-2xl flex items-center gap-3 text-muted text-sm border border-[rgba(255,255,255,0.08)]">
                    <Loader2 size={18} className="animate-spin text-[#FFD700]" />
                    <span>Redirecting to dashboard...</span>
                </div>
            </div>
        );
    }

    // 4. Public auth pages (Login, Reset Password) -> Full-screen layout without sidebar
    if (isPublicRoute) {
        return <>{children}</>;
    }

    // 5. Authenticated ERP Dashboard -> Standard Shell with Sidebar and Navigation
    return (
        <>
            <div className="min-h-screen flex gap-[18px] max-w-[1400px] mx-auto md:p-5 lg:p-6">
                <Sidebar />
                <main className="flex-1 min-w-0 flex flex-col gap-4 px-4 pb-28 pt-0 md:p-0">
                    {children}
                </main>
            </div>
            <MobileNav />
            <GlobalModalWrapper />
        </>
    );
}
