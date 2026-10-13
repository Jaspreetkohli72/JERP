"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session, AuthError, createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/auditLogger";
import { registerUserProfileSyncAction, getUserProfilesAction } from "@/app/actions/users";
import { isSuperAdmin, canAccessAdmin, UserProfile, RoleType, UserPrivileges } from "@/lib/permissions";

interface AuthContextType {
    user: User | null;
    session: Session | null;
    userProfile: UserProfile | null;
    isSuperAdminUser: boolean;
    canAccessAdminPanel: boolean;
    loading: boolean;
    signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null; data: any }>;
    sendMagicLink: (email: string) => Promise<{ error: AuthError | null; data: any }>;
    signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null; data: any }>;
    createAccountByAdmin: (
        email: string,
        password: string,
        fullName?: string,
        role?: RoleType,
        privileges?: Partial<UserPrivileges>
    ) => Promise<{ error: AuthError | null; data: any }>;
    signOut: () => Promise<{ error: AuthError | null }>;
    resetPasswordForEmail: (email: string) => Promise<{ error: AuthError | null; data: any }>;
    updatePassword: (newPassword: string) => Promise<{ error: AuthError | null; data: any }>;
    refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    userProfile: null,
    isSuperAdminUser: false,
    canAccessAdminPanel: false,
    loading: true,
    signInWithEmail: async () => ({ error: null, data: null }),
    sendMagicLink: async () => ({ error: null, data: null }),
    signUpWithEmail: async () => ({ error: null, data: null }),
    createAccountByAdmin: async () => ({ error: null, data: null }),
    signOut: async () => ({ error: null }),
    resetPasswordForEmail: async () => ({ error: null, data: null }),
    updatePassword: async () => ({ error: null, data: null }),
    refreshUserProfile: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const loadProfileForUser = async (currentUser: User | null) => {
        if (!currentUser?.email) {
            setUserProfile(null);
            return;
        }

        // Fast-path: Immediate profile for superadmin so UI never hangs or waits for DB roundtrip
        if (isSuperAdmin(currentUser.email)) {
            setUserProfile({
                id: currentUser.id,
                email: currentUser.email,
                full_name: currentUser.user_metadata?.full_name || "Jaspreet Singh Kohli",
                role: "superadmin",
                privileges: {
                    can_manage_users: true,
                    can_view_logs: true,
                    can_edit_finances: true,
                    can_manage_staff: true,
                    can_manage_contracting: true,
                    can_manage_settings: true,
                },
                status: "active",
            });
        }

        try {
            const profiles = await getUserProfilesAction();
            const found = profiles.find((p) => p.email.toLowerCase() === currentUser.email?.toLowerCase());
            if (found) {
                setUserProfile(found);
            }
        } catch (e) {
            console.warn("[Auth] Error fetching profile:", e);
        }
    };

    useEffect(() => {
        let isMounted = true;

        const initAuth = async () => {
            try {
                const { data: { session: initialSession }, error } = await supabase.auth.getSession();
                if (!isMounted) return;

                if (error) {
                    console.warn("[Auth] Error fetching initial session:", error.message);
                }

                const currentUser = initialSession?.user ?? null;
                setSession(initialSession);
                setUser(currentUser);

                if (currentUser) {
                    await loadProfileForUser(currentUser);
                } else {
                    setUserProfile(null);
                }
            } catch (err) {
                console.error("[Auth] Session initialization failed:", err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        initAuth();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            if (!isMounted) return;

            setSession(currentSession);
            const currentUser = currentSession?.user ?? null;
            setUser(currentUser);

            if (currentUser) {
                await loadProfileForUser(currentUser);
            } else {
                setUserProfile(null);
            }

            setLoading(false);
        });

        return () => {
            isMounted = false;
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
            await loadProfileForUser(data.user);

            // Audit Log Login
            logActivity({
                action: "AUTH",
                module: "auth",
                description: `User ${data.user.email} signed in successfully`,
                details: { event: "login" },
                user: data.user,
            });
        }
        return { data, error };
    };

    const getAppUrl = () => {
        if (typeof window !== "undefined" && window.location.origin && !window.location.origin.includes("localhost")) {
            return window.location.origin;
        }
        return process.env.NEXT_PUBLIC_SITE_URL || "https://galaxyerp.vercel.app";
    };

    const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
        const siteUrl = getAppUrl();
        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
                data: {
                    full_name: fullName?.trim() || undefined,
                },
                emailRedirectTo: `${siteUrl}/login`,
            },
        });
        return { data, error };
    };

    const sendMagicLink = async (email: string) => {
        const siteUrl = getAppUrl();
        const { data, error } = await supabase.auth.signInWithOtp({
            email: email.trim(),
            options: {
                emailRedirectTo: `${siteUrl}`,
            },
        });

        logActivity({
            action: "AUTH",
            module: "auth",
            description: `Magic link sign-in requested for ${email}`,
            details: { email, siteUrl },
            user: { email },
        });

        return { data, error };
    };

    const createAccountByAdmin = async (
        email: string,
        password: string,
        fullName?: string,
        role: RoleType = "staff",
        privileges?: Partial<UserPrivileges>
    ) => {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://acirakiaxrhfgtksmahm.supabase.co";
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

        // Ephemeral client without localStorage persistence to protect the current admin session
        const adminClient = createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });

        const siteUrl = getAppUrl();
        const { data, error } = await adminClient.auth.signUp({
            email: email.trim(),
            password,
            options: {
                data: {
                    full_name: fullName?.trim() || undefined,
                    role,
                },
                emailRedirectTo: `${siteUrl}/login`,
            },
        });

        if (!error && data?.user) {
            // Register into user profiles & emit audit log
            await registerUserProfileSyncAction({
                id: data.user.id,
                email: data.user.email!,
                full_name: fullName,
                role,
                privileges,
                actorEmail: user?.email || "admin@galaxy.com",
                actorName: user?.user_metadata?.full_name || user?.email || "Admin",
            });
        }

        return { data, error };
    };

    const signOut = async () => {
        if (user) {
            logActivity({
                action: "AUTH",
                module: "auth",
                description: `User ${user.email} signed out`,
                details: { event: "logout" },
                user,
            });
        }

        const { error } = await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setUserProfile(null);
        return { error };
    };

    const resetPasswordForEmail = async (email: string) => {
        const siteUrl = getAppUrl();
        const redirectTo = `${siteUrl}/reset-password`;

        const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo,
        });

        logActivity({
            action: "AUTH",
            module: "auth",
            description: `Password reset link requested for ${email}`,
            details: { email },
            user: { email },
        });

        return { data, error };
    };

    const updatePassword = async (newPassword: string) => {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (user) {
            logActivity({
                action: "AUTH",
                module: "auth",
                description: `Password updated for ${user.email}`,
                details: { event: "password_update" },
                user,
            });
        }

        return { data, error };
    };

    const isSuperAdminUser = isSuperAdmin(user?.email);
    const canAccessAdminPanel = canAccessAdmin(userProfile || user?.email);

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                userProfile,
                isSuperAdminUser,
                canAccessAdminPanel,
                loading,
                signInWithEmail,
                sendMagicLink,
                signUpWithEmail,
                createAccountByAdmin,
                signOut,
                resetPasswordForEmail,
                updatePassword,
                refreshUserProfile: () => loadProfileForUser(user),
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
