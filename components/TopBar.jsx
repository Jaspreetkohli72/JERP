"use client";

import DateTimeDisplay from "./DateTimeDisplay";
import { useAuth } from "@/context/AuthContext";
import { LogOut } from "lucide-react";

export default function TopBar() {
    const { user, signOut } = useAuth();

    return (
        <header className="flex items-center justify-between px-3 pt-0 pb-2">
            <div className="flex flex-col gap-0.5">
                <DateTimeDisplay />
                <span className="text-[1.2rem] font-semibold text-text">Your money, at a glance</span>
            </div>

            {user && (
                <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] backdrop-blur-md">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#FFD700] to-[#B8860B] text-black font-bold text-[0.65rem] flex items-center justify-center shrink-0">
                            {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <span className="text-xs text-gray-200 font-medium max-w-[140px] truncate">
                            {user.user_metadata?.full_name || user.email?.split("@")[0]}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={() => signOut()}
                        title="Sign Out"
                        className="p-2 rounded-full bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-white/10 transition-colors cursor-pointer"
                    >
                        <LogOut size={15} />
                    </button>
                </div>
            )}
        </header>
    );
}
