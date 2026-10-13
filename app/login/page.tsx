"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    AlertCircle,
    CheckCircle2,
    Loader2,
    KeyRound,
    Building2,
    Sparkles,
} from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const { signInWithEmail, sendMagicLink, resetPasswordForEmail } = useAuth();

    const [mode, setMode] = useState<"signin" | "forgot" | "magic">("signin");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const resetFeedback = () => {
        setErrorMsg(null);
        setSuccessMsg(null);
    };

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        resetFeedback();

        if (!email.trim() || !password) {
            setErrorMsg("Please enter both email and password.");
            return;
        }

        try {
            setLoading(true);
            const { error } = await signInWithEmail(email, password);
            if (error) {
                setErrorMsg(error.message || "Failed to sign in. Please verify your credentials.");
            } else {
                window.location.href = "/";
                return;
            }
        } catch (err: any) {
            setErrorMsg(err.message || "An unexpected error occurred during sign in.");
        } finally {
            setLoading(false);
        }
    };

    const handleMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        resetFeedback();

        if (!email.trim()) {
            setErrorMsg("Please enter your email address to receive a magic sign-in link.");
            return;
        }

        try {
            setLoading(true);
            const { error } = await sendMagicLink(email);
            if (error) {
                setErrorMsg(error.message || "Failed to send magic link.");
            } else {
                setSuccessMsg("Magic sign-in link sent! Check your inbox to sign in directly without a password.");
            }
        } catch (err: any) {
            setErrorMsg(err.message || "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        resetFeedback();

        if (!email.trim()) {
            setErrorMsg("Please enter your registered email address.");
            return;
        }

        try {
            setLoading(true);
            const { error } = await resetPasswordForEmail(email);
            if (error) {
                setErrorMsg(error.message || "Failed to send password reset email.");
            } else {
                setSuccessMsg("Password reset link sent! Check your inbox for instructions to reset your password.");
            }
        } catch (err: any) {
            setErrorMsg(err.message || "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 relative z-10">
            {/* Ambient Lighting Orbs */}
            <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-[radial-gradient(circle,rgba(255,215,0,0.12)_0%,transparent_70%)] pointer-events-none blur-3xl -z-10" />
            <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-[radial-gradient(circle,rgba(91,141,255,0.08)_0%,transparent_70%)] pointer-events-none blur-3xl -z-10" />

            <div className="w-full max-w-[440px]">
                {/* Brand Header */}
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-[0_0_25px_rgba(255,215,0,0.3)] border border-[rgba(255,215,0,0.25)] mb-3 transition-transform hover:scale-105 duration-300">
                        <Image
                            src="/logo.png"
                            alt="GFE ERP Logo"
                            width={56}
                            height={56}
                            className="object-cover"
                            priority
                        />
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(255,215,0,0.1)] border border-[rgba(255,215,0,0.25)] text-[#FFD700] text-xs font-medium tracking-wide mb-1.5">
                        <Building2 size={13} />
                        <span>Galaxy Fabricarion Experts</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">GFE ERP</h1>
                    <p className="text-xs text-muted mt-1">Enterprise management & real-time financial control</p>
                </div>

                {/* Main Auth Card */}
                <div className="glass p-6 sm:p-8 rounded-3xl border border-[rgba(255,255,255,0.09)] shadow-[0_24px_60px_rgba(0,0,0,0.85)] relative backdrop-blur-xl">
                    {mode === "forgot" ? (
                        <div className="flex items-center justify-between mb-6 pb-3 border-b border-[rgba(255,255,255,0.08)]">
                            <div className="flex items-center gap-2 text-white font-semibold text-sm">
                                <KeyRound size={16} className="text-[#FFD700]" />
                                <span>Reset Password</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setMode("signin");
                                    resetFeedback();
                                }}
                                className="text-xs text-[#FFD700] hover:underline cursor-pointer"
                            >
                                Back to Sign In
                            </button>
                        </div>
                    ) : mode === "magic" ? (
                        <div className="flex items-center justify-between mb-6 pb-3 border-b border-[rgba(255,255,255,0.08)]">
                            <div className="flex items-center gap-2 text-white font-semibold text-sm">
                                <Sparkles size={16} className="text-[#FFD700]" />
                                <span>Magic Sign-In Link</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setMode("signin");
                                    resetFeedback();
                                }}
                                className="text-xs text-[#FFD700] hover:underline cursor-pointer"
                            >
                                Back to Sign In
                            </button>
                        </div>
                    ) : (
                        <div className="mb-6">
                            <h2 className="text-base font-semibold text-white">Sign In</h2>
                            <p className="text-xs text-muted mt-0.5">Enter your account credentials to continue</p>
                        </div>
                    )}

                    {/* Alert Messages */}
                    {errorMsg && (
                        <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-2.5 text-xs text-red-300 backdrop-blur-md animate-fadeIn">
                            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{errorMsg}</span>
                        </div>
                    )}

                    {successMsg && (
                        <div className="mb-5 p-3 rounded-xl bg-green-500/10 border border-green-500/25 flex items-start gap-2.5 text-xs text-green-300 backdrop-blur-md animate-fadeIn">
                            <CheckCircle2 size={16} className="text-green-400 shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{successMsg}</span>
                        </div>
                    )}

                    {/* 1. Sign In Form */}
                    {mode === "signin" && (
                        <form onSubmit={handleSignIn} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                                    <Mail size={13} className="text-[#FFD700]" />
                                    <span>Email Address</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="admin@galaxy.com"
                                        className="w-full bg-[rgba(15,15,15,0.85)] border border-[rgba(255,255,255,0.1)] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                                        <Lock size={13} className="text-[#FFD700]" />
                                        <span>Password</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMode("forgot");
                                            resetFeedback();
                                        }}
                                        className="text-[0.7rem] text-[#FFD700] hover:underline transition-colors cursor-pointer"
                                    >
                                        Forgot password?
                                    </button>
                                </div>
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
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-black bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] hover:brightness-110 active:scale-[0.99] transition-all duration-200 shadow-[0_4px_16px_rgba(255,215,0,0.35)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Signing In...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Sign In</span>
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>

                            <div className="relative my-1 text-center">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-[rgba(255,255,255,0.08)]" />
                                </div>
                                <div className="relative flex justify-center text-[0.7rem] uppercase">
                                    <span className="bg-[#121212] px-2 text-muted">Or</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setMode("magic");
                                    resetFeedback();
                                }}
                                className="w-full py-2.5 px-4 rounded-xl font-medium text-xs text-white bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.09)] border border-[rgba(255,255,255,0.1)] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Sparkles size={14} className="text-[#FFD700]" />
                                <span>Sign in with Magic Link</span>
                            </button>
                        </form>
                    )}

                    {/* 2. Magic Link Form */}
                    {mode === "magic" && (
                        <form onSubmit={handleMagicLink} className="flex flex-col gap-4">
                            <p className="text-xs text-muted leading-relaxed">
                                Enter your email below. We will send a one-click passwordless sign-in link directly to your inbox that routes to <strong className="text-white">galaxyerp.vercel.app</strong>.
                            </p>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                                    <Mail size={13} className="text-[#FFD700]" />
                                    <span>Registered Email</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="user@example.com"
                                    className="w-full bg-[rgba(15,15,15,0.85)] border border-[rgba(255,255,255,0.1)] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] transition-all"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-1 py-3 px-4 rounded-xl font-semibold text-sm text-black bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] hover:brightness-110 active:scale-[0.99] transition-all duration-200 shadow-[0_4px_16px_rgba(255,215,0,0.35)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Sending Magic Link...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={16} />
                                        <span>Send Magic Sign-In Link</span>
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* 3. Forgot Password Form */}
                    {mode === "forgot" && (
                        <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                            <p className="text-xs text-muted leading-relaxed">
                                Enter your email below. If an account is associated with this address, Supabase will dispatch a password recovery link.
                            </p>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                                    <Mail size={13} className="text-[#FFD700]" />
                                    <span>Registered Email</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="user@example.com"
                                    className="w-full bg-[rgba(15,15,15,0.85)] border border-[rgba(255,255,255,0.1)] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] transition-all"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-1 py-3 px-4 rounded-xl font-semibold text-sm text-black bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] hover:brightness-110 active:scale-[0.99] transition-all duration-200 shadow-[0_4px_16px_rgba(255,215,0,0.35)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Sending Recovery Link...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Send Recovery Link</span>
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
