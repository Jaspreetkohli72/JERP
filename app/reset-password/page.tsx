"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, KeyRound } from "lucide-react";

export default function ResetPasswordPage() {
    const router = useRouter();
    const { updatePassword } = useAuth();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        if (!password || password.length < 6) {
            setErrorMsg("Password must be at least 6 characters long.");
            return;
        }

        if (password !== confirmPassword) {
            setErrorMsg("Passwords do not match.");
            return;
        }

        try {
            setLoading(true);
            const { error } = await updatePassword(password);
            if (error) {
                setErrorMsg(error.message || "Failed to update password. Recovery link may have expired.");
            } else {
                setSuccessMsg("Your password has been successfully updated! Redirecting to dashboard...");
                setTimeout(() => {
                    router.replace("/");
                }, 1500);
            }
        } catch (err: any) {
            setErrorMsg(err.message || "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 relative z-10">
            <div className="w-full max-w-[420px]">
                {/* Brand Header */}
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-[0_0_25px_rgba(255,215,0,0.3)] border border-[rgba(255,215,0,0.25)] mb-3">
                        <Image
                            src="/logo.png"
                            alt="GFE ERP Logo"
                            width={56}
                            height={56}
                            className="object-cover"
                            priority
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Set New Password</h1>
                    <p className="text-xs text-muted mt-1">Enter your new credentials to restore account access</p>
                </div>

                <div className="glass p-6 sm:p-8 rounded-3xl border border-[rgba(255,255,255,0.09)] shadow-[0_24px_60px_rgba(0,0,0,0.85)] relative backdrop-blur-xl">
                    {errorMsg && (
                        <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-2.5 text-xs text-red-300 backdrop-blur-md">
                            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{errorMsg}</span>
                        </div>
                    )}

                    {successMsg && (
                        <div className="mb-5 p-3 rounded-xl bg-green-500/10 border border-green-500/25 flex items-start gap-2.5 text-xs text-green-300 backdrop-blur-md">
                            <CheckCircle2 size={16} className="text-green-400 shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{successMsg}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                                <Lock size={13} className="text-[#FFD700]" />
                                <span>New Password (min 6 chars)</span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full bg-[rgba(15,15,15,0.85)] border border-[rgba(255,255,255,0.1)] rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                                <Lock size={13} className="text-[#FFD700]" />
                                <span>Confirm New Password</span>
                            </label>
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••••••"
                                className="w-full bg-[rgba(15,15,15,0.85)] border border-[rgba(255,255,255,0.1)] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-black bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] hover:brightness-110 active:scale-[0.99] transition-all duration-200 shadow-[0_4px_16px_rgba(255,215,0,0.35)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Updating Password...</span>
                                </>
                            ) : (
                                <>
                                    <KeyRound size={16} />
                                    <span>Update Password</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
