"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session, AuthError, createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null; data: any }>;
    signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null; data: any }>;
    createAccountByAdmin: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null; data: any }>;
    signOut: () => Promise<{ error: AuthError | null }>;
    resetPasswordForEmail: (email: string) => Promise<{ error: AuthError | null; data: any }>;
    updatePassword: (newPassword: string) => Promise<{ error: AuthError | null; data: any }>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    signInWithEmail: async () => ({ error: null, data: null }),
    signUpWithEmail: async () => ({ error: null, data: null }),
    createAccountByAdmin: async () => ({ error: null, data: null }),
    signOut: async () => ({ error: null }),
    resetPasswordForEmail: async () => ({ error: null, data: null }),
    updatePassword: async () => ({ error: null, data: null }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        // 1. Initial active session check
        supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
            if (error) {
                console.warn("[Auth] Error fetching initial session:", error.message);
            }
            setSession(initialSession);
            setUser(initialSession?.user ?? null);
            setLoading(false);
        }).catch((err) => {
            console.error("[Auth] Session initialization failed:", err);
            setLoading(false);
        });

        // 2. Listen to ongoing auth state mutations (sign in, sign out, token refresh, etc.)
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, currentSession) => {
            setSession(currentSession);
            setUser(currentSession?.user ?? null);
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signInWithEmail = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });
        if (!error && data?.session) {
            setSession(data.session);
            setUser(data.user);
        }
        return { data, error };
    };

    const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
                data: {
                    full_name: fullName?.trim() || undefined,
                },
            },
        });
        return { data, error };
    };

    const createAccountByAdmin = async (email: string, password: string, fullName?: string) => {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

        // Ephemeral client without localStorage persistence to protect the current admin session
        const adminClient = createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });

        const { data, error } = await adminClient.auth.signUp({
            email: email.trim(),
            password,
            options: {
                data: {
                    full_name: fullName?.trim() || undefined,
                },
            },
        });
        return { data, error };
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        return { error };
    };

    const resetPasswordForEmail = async (email: string) => {
        const redirectTo = typeof window !== "undefined"
            ? `${window.location.origin}/reset-password`
            : undefined;

        const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo,
        });
        return { data, error };
    };

    const updatePassword = async (newPassword: string) => {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword,
        });
        return { data, error };
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                loading,
                signInWithEmail,
                signUpWithEmail,
                createAccountByAdmin,
                signOut,
                resetPasswordForEmail,
                updatePassword,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
