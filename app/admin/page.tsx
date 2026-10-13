"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    Shield,
    ShieldAlert,
    ShieldCheck,
    Users,
    UserPlus,
    Trash2,
    Edit3,
    Search,
    Filter,
    Download,
    RefreshCw,
    FileText,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Eye,
    Copy,
    Check,
    Lock,
    Key,
    Database,
    Clock,
    Activity,
    SlidersHorizontal,
    UserCheck,
    UserX,
    Sparkles,
    X
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getAuditLogsAction, AuditLogEntry } from "@/app/actions/audit";
import {
    getUserProfilesAction,
    updateUserPrivilegesAction,
    deleteUserAction,
    createAdminUserAction,
} from "@/app/actions/users";
import {
    SUPER_ADMIN_EMAIL,
    DEFAULT_ROLE_PRIVILEGES,
    RoleType,
    UserPrivileges,
    UserProfile,
} from "@/lib/permissions";
import Link from "next/link";

export default function AdminDashboardPage() {
    const { user, isSuperAdminUser, canAccessAdminPanel, createAccountByAdmin, sendMagicLink } = useAuth();

    // Tabs
    const [activeTab, setActiveTab] = useState<"logs" | "users" | "schema">("logs");

    // Audit Logs State
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [logsLoading, setLogsLoading] = useState(true);
    const [logSearchQuery, setLogSearchQuery] = useState("");
    const [selectedModule, setSelectedModule] = useState<string>("ALL");
    const [selectedAction, setSelectedAction] = useState<string>("ALL");
    const [inspectLog, setInspectLog] = useState<AuditLogEntry | null>(null);

    // Users State
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [editUserModal, setEditUserModal] = useState<UserProfile | null>(null);
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);

    // Add User Form State
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserPassword, setNewUserPassword] = useState("");
    const [newUserFullName, setNewUserFullName] = useState("");
    const [newUserRole, setNewUserRole] = useState<RoleType>("staff");
    const [newUserPrivileges, setNewUserPrivileges] = useState<UserPrivileges>(DEFAULT_ROLE_PRIVILEGES.staff);
    const [userSubmitting, setUserSubmitting] = useState(false);

    // SQL Copy State
    const [copiedSql, setCopiedSql] = useState(false);
    const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const showNotify = (message: string, type: "success" | "error" = "success") => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 4000);
    };

    // Load Audit Logs
    const loadLogs = async () => {
        setLogsLoading(true);
        try {
            const res = await getAuditLogsAction({ limit: 300 });
            setLogs(res || []);
        } catch (err) {
            console.error("Error loading logs:", err);
            showNotify("Failed to fetch logs", "error");
        } finally {
            setLogsLoading(false);
        }
    };

    // Load User Profiles
    const loadUsers = async () => {
        setUsersLoading(true);
        try {
            const res = await getUserProfilesAction();
            setProfiles(res || []);
        } catch (err) {
            console.error("Error loading users:", err);
            showNotify("Failed to fetch user profiles", "error");
        } finally {
            setUsersLoading(false);
        }
    };

    useEffect(() => {
        loadLogs();
        loadUsers();
    }, []);

    // Filtered Logs
    const filteredLogs = useMemo(() => {
        return logs.filter((log) => {
            const matchesModule = selectedModule === "ALL" || log.module?.toLowerCase() === selectedModule.toLowerCase();
            const matchesAction = selectedAction === "ALL" || log.action?.toUpperCase() === selectedAction.toUpperCase();
            const query = logSearchQuery.toLowerCase();
            const matchesSearch =
                !logSearchQuery ||
                log.description?.toLowerCase().includes(query) ||
                log.user_email?.toLowerCase().includes(query) ||
                log.module?.toLowerCase().includes(query) ||
                log.action?.toLowerCase().includes(query) ||
                (log.entity_id && String(log.entity_id).toLowerCase().includes(query));

            return matchesModule && matchesAction && matchesSearch;
        });
    }, [logs, selectedModule, selectedAction, logSearchQuery]);

    // Filtered Users
    const filteredUsers = useMemo(() => {
        return profiles.filter((p) => {
            const q = userSearchQuery.toLowerCase();
            return !userSearchQuery || p.email.toLowerCase().includes(q) || (p.full_name && p.full_name.toLowerCase().includes(q));
        });
    }, [profiles, userSearchQuery]);

    // Handle Edit User Privileges Save
    const handleSavePrivileges = async () => {
        if (!editUserModal) return;
        try {
            const res = await updateUserPrivilegesAction({
                userId: editUserModal.id,
                email: editUserModal.email,
                role: editUserModal.role,
                privileges: editUserModal.privileges,
                status: editUserModal.status,
                actorEmail: user?.email || SUPER_ADMIN_EMAIL,
                actorName: user?.user_metadata?.full_name || "Admin",
            });

            if (res.success) {
                showNotify(`Privileges updated for ${editUserModal.email}`);
                setEditUserModal(null);
                await loadUsers();
            } else {
                showNotify("Error saving privileges", "error");
            }
        } catch (err) {
            console.error("Save error:", err);
            showNotify("Error saving privileges", "error");
        }
    };

    // Handle Delete User
    const handleDeleteUser = async (target: UserProfile) => {
        if (target.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
            showNotify("The Super Administrator account cannot be deleted.", "error");
            return;
        }

        const confirmed = window.confirm(`Are you sure you want to permanently delete user ${target.email}?`);
        if (!confirmed) return;

        try {
            const res = await deleteUserAction({
                userId: target.id,
                targetEmail: target.email,
                actorEmail: user?.email || SUPER_ADMIN_EMAIL,
                actorName: user?.user_metadata?.full_name || "Admin",
            });

            if (res.success) {
                showNotify(`User ${target.email} removed.`);
                await loadUsers();
                await loadLogs();
            } else {
                showNotify(res.error || "Failed to delete user", "error");
            }
        } catch (err) {
            console.error(err);
            showNotify("Failed to delete user", "error");
        }
    };

    const [sendingMagicLinkEmail, setSendingMagicLinkEmail] = useState<string | null>(null);

    // Handle Send Magic Sign-In Link
    const handleSendMagicLink = async (targetEmail: string) => {
        try {
            setSendingMagicLinkEmail(targetEmail);
            const { error } = await sendMagicLink(targetEmail);
            if (error) {
                showNotify(`Failed to send magic link: ${error.message}`, "error");
            } else {
                showNotify(`Magic sign-in link sent to ${targetEmail} (redirecting to https://galaxyerp.vercel.app)`);
            }
        } catch (err: any) {
            showNotify(err.message || "Failed to dispatch magic link", "error");
        } finally {
            setSendingMagicLinkEmail(null);
        }
    };

    // Handle Create New User
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUserEmail || !newUserPassword) {
            showNotify("Please provide email and password", "error");
            return;
        }

        setUserSubmitting(true);
        try {
            const res = await createAdminUserAction({
                email: newUserEmail,
                password: newUserPassword,
                fullName: newUserFullName,
                role: newUserRole,
                privileges: newUserPrivileges,
                actorEmail: user?.email || SUPER_ADMIN_EMAIL,
                actorName: user?.user_metadata?.full_name || "Admin",
            });

            if (res.success) {
                showNotify(`Account created successfully for ${newUserEmail}`);
                setIsAddUserOpen(false);
                setNewUserEmail("");
                setNewUserPassword("");
                setNewUserFullName("");
                setNewUserRole("staff");
                setNewUserPrivileges(DEFAULT_ROLE_PRIVILEGES.staff);
                await loadUsers();
                await loadLogs();
            } else {
                showNotify(res.error || "Error creating account", "error");
            }
        } catch (err: any) {
            showNotify(err.message || "Failed to create account", "error");
        } finally {
            setUserSubmitting(false);
        }
    };

    // Export Logs as JSON
    const handleExportLogs = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `gfe_audit_logs_${new Date().toISOString().split("T")[0]}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showNotify(`Exported ${filteredLogs.length} audit logs`);
    };

    // Helper for Action Badge Colors
    const getActionBadge = (action: string) => {
        const act = action?.toUpperCase();
        if (act === "CREATE") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
        if (act === "UPDATE") return "bg-amber-500/15 text-amber-400 border-amber-500/30";
        if (act === "DELETE") return "bg-rose-500/15 text-rose-400 border-rose-500/30";
        if (act === "SETTLE") return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
        if (act === "PERMISSION_CHANGE") return "bg-purple-500/15 text-purple-400 border-purple-500/30";
        if (act === "LOGIN" || act === "LOGOUT") return "bg-blue-500/15 text-blue-400 border-blue-500/30";
        return "bg-slate-500/15 text-slate-300 border-slate-500/30";
    };

    // Check Access Permission
    if (!canAccessAdminPanel && !isSuperAdminUser) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4 shadow-[0_0_25px_rgba(244,63,94,0.2)]">
                    <ShieldAlert size={32} />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Restricted Access</h1>
                <p className="text-muted max-w-md mb-6 text-sm">
                    Only authorized administrative users or the primary Super Administrator (<span className="text-[#FFD700]">{SUPER_ADMIN_EMAIL}</span>) can view audit logs and manage user privileges.
                </p>
                <Link
                    href="/"
                    className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-all"
                >
                    Return to Overview
                </Link>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col gap-6 max-w-7xl mx-auto w-full pb-16">
            {/* Notification Toast */}
            {notification && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 ${
                    notification.type === "success"
                        ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-200"
                        : "bg-rose-950/90 border-rose-500/30 text-rose-200"
                }`}>
                    {notification.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span className="text-sm font-medium">{notification.message}</span>
                </div>
            )}

            {/* Header Card */}
            <div className="glass p-6 rounded-3xl border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--accent)]/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-1.5">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[var(--accent)] to-[var(--accent-3)] flex items-center justify-center text-black font-bold shadow-[0_0_15px_rgba(255,215,0,0.3)]">
                                <Shield size={20} />
                            </div>
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                                    Admin Command Center
                                </h1>
                                <p className="text-xs md:text-sm text-muted">
                                    Comprehensive audit trail, granular privilege delegation, and account governance
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actor Identity Badge */}
                    <div className="flex items-center gap-3 bg-white/[0.04] border border-white/10 px-4 py-2.5 rounded-2xl">
                        <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] font-semibold text-sm">
                            {user?.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                                {user?.email}
                                {user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && (
                                    <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-[var(--accent)]/20 text-[#FFD700] border border-[var(--accent)]/40 font-bold">
                                        Super Admin
                                    </span>
                                )}
                            </span>
                            <span className="text-[0.7rem] text-muted">
                                Active &bull; Full Audit Inspection Rights
                            </span>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/10 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab("logs")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === "logs"
                                ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] text-black shadow-[0_4px_12px_rgba(255,215,0,0.25)]"
                                : "text-muted hover:text-white hover:bg-white/[0.06]"
                        }`}
                    >
                        <Activity size={16} />
                        <span>System Audit Logs</span>
                        <span className={`text-[0.65rem] px-1.5 py-0.2 rounded-full font-bold ${
                            activeTab === "logs" ? "bg-black/20 text-black" : "bg-white/10 text-muted"
                        }`}>
                            {logs.length}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab("users")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === "users"
                                ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] text-black shadow-[0_4px_12px_rgba(255,215,0,0.25)]"
                                : "text-muted hover:text-white hover:bg-white/[0.06]"
                        }`}
                    >
                        <Users size={16} />
                        <span>Users & Privileges</span>
                        <span className={`text-[0.65rem] px-1.5 py-0.2 rounded-full font-bold ${
                            activeTab === "users" ? "bg-black/20 text-black" : "bg-white/10 text-muted"
                        }`}>
                            {profiles.length}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab("schema")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === "schema"
                                ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] text-black shadow-[0_4px_12px_rgba(255,215,0,0.25)]"
                                : "text-muted hover:text-white hover:bg-white/[0.06]"
                        }`}
                    >
                        <Database size={16} />
                        <span>Database SQL Schema</span>
                    </button>
                </div>
            </div>

            {/* TAB 1: AUDIT LOGS */}
            {activeTab === "logs" && (
                <div className="flex flex-col gap-4">
                    {/* Filters & Actions Bar */}
                    <div className="glass p-4 rounded-2xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3 flex-1">
                            {/* Search */}
                            <div className="relative min-w-[240px] flex-1 max-w-md">
                                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                                <input
                                    type="text"
                                    placeholder="Search logs by keyword, user, module..."
                                    value={logSearchQuery}
                                    onChange={(e) => setLogSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-muted focus:outline-none focus:border-[var(--accent)]"
                                />
                            </div>

                            {/* Module Filter */}
                            <select
                                value={selectedModule}
                                onChange={(e) => setSelectedModule(e.target.value)}
                                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--accent)]"
                            >
                                <option value="ALL">All Modules</option>
                                <option value="Transactions">Transactions</option>
                                <option value="Contacts">Contacts</option>
                                <option value="Sales">Sales</option>
                                <option value="Wallets">Wallets</option>
                                <option value="Staff">Staff</option>
                                <option value="Attendance">Attendance</option>
                                <option value="Estimates">Estimates</option>
                                <option value="Measurements">Measurements</option>
                                <option value="Billing">Billing</option>
                                <option value="Inventory">Inventory</option>
                                <option value="Procurement">Procurement</option>
                                <option value="Operations">Operations</option>
                                <option value="Inquiries">Inquiries</option>
                                <option value="Notes">Notes</option>
                                <option value="ShoppingList">Shopping List</option>
                                <option value="Projects">Projects</option>
                                <option value="Settings">Settings</option>
                                <option value="Auth">Auth</option>
                                <option value="Users">Users</option>
                            </select>

                            {/* Action Filter */}
                            <select
                                value={selectedAction}
                                onChange={(e) => setSelectedAction(e.target.value)}
                                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--accent)]"
                            >
                                <option value="ALL">All Actions</option>
                                <option value="CREATE">CREATE</option>
                                <option value="UPDATE">UPDATE</option>
                                <option value="DELETE">DELETE</option>
                                <option value="SETTLE">SETTLE</option>
                                <option value="PERMISSION_CHANGE">PERMISSION_CHANGE</option>
                                <option value="LOGIN">LOGIN</option>
                                <option value="LOGOUT">LOGOUT</option>
                            </select>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={loadLogs}
                                disabled={logsLoading}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/10 text-xs text-white font-medium transition-all cursor-pointer"
                            >
                                <RefreshCw size={14} className={logsLoading ? "animate-spin" : ""} />
                                <span>Refresh</span>
                            </button>

                            <button
                                onClick={handleExportLogs}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/10 text-xs text-white font-medium transition-all cursor-pointer"
                            >
                                <Download size={14} />
                                <span>Export JSON</span>
                            </button>
                        </div>
                    </div>

                    {/* Logs Stream Container */}
                    <div className="glass rounded-2xl border border-white/10 overflow-hidden">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between text-xs text-muted">
                            <span>Showing {filteredLogs.length} of {logs.length} logged mutations</span>
                            <span className="flex items-center gap-1.5 text-emerald-400">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                Dual-Storage Active (Supabase &amp; Local Persistence)
                            </span>
                        </div>

                        {logsLoading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted">
                                <RefreshCw size={24} className="animate-spin text-[var(--accent)]" />
                                <span className="text-sm">Loading system audit stream...</span>
                            </div>
                        ) : filteredLogs.length === 0 ? (
                            <div className="py-16 text-center text-muted text-sm">
                                No logs match the selected filter criteria.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-white/[0.03] text-muted border-b border-white/10 text-[0.72rem] uppercase tracking-wider">
                                        <tr>
                                            <th className="py-3 px-4">Timestamp</th>
                                            <th className="py-3 px-4">Action</th>
                                            <th className="py-3 px-4">Module</th>
                                            <th className="py-3 px-4">Actor</th>
                                            <th className="py-3 px-4">Description</th>
                                            <th className="py-3 px-4 text-right">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.06]">
                                        {filteredLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                                                {/* Timestamp */}
                                                <td className="py-3 px-4 whitespace-nowrap text-muted font-mono text-[0.72rem]">
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock size={12} className="opacity-60" />
                                                        {log.timestamp ? new Date(log.timestamp).toLocaleString("en-IN", {
                                                            month: "short",
                                                            day: "2-digit",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                            second: "2-digit",
                                                        }) : "Just now"}
                                                    </div>
                                                </td>

                                                {/* Action */}
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <span className={`px-2 py-0.5 rounded-full border text-[0.65rem] font-bold ${getActionBadge(log.action)}`}>
                                                        {log.action}
                                                    </span>
                                                </td>

                                                {/* Module */}
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/10 text-white font-medium text-[0.7rem]">
                                                        {log.module}
                                                    </span>
                                                </td>

                                                {/* Actor */}
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-white font-medium">
                                                            {log.user_email || "System"}
                                                        </span>
                                                        {log.user_email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && (
                                                            <span className="text-[0.6rem] text-[#FFD700]">Primary Admin</span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Description */}
                                                <td className="py-3 px-4 text-gray-200 max-w-md truncate">
                                                    {log.description}
                                                </td>

                                                {/* Action */}
                                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                                    {log.details && Object.keys(log.details).length > 0 ? (
                                                        <button
                                                            onClick={() => setInspectLog(log)}
                                                            className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/15 border border-white/10 text-[0.7rem] text-white flex items-center gap-1 ml-auto cursor-pointer transition-all"
                                                        >
                                                            <Eye size={12} />
                                                            <span>Inspect</span>
                                                        </button>
                                                    ) : (
                                                        <span className="text-muted text-[0.7rem]">&mdash;</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: USER MANAGEMENT & PRIVILEGES */}
            {activeTab === "users" && (
                <div className="flex flex-col gap-4">
                    {/* Header Controls */}
                    <div className="glass p-4 rounded-2xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="relative min-w-[260px] flex-1 max-w-md">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                            <input
                                type="text"
                                placeholder="Search users by email or name..."
                                value={userSearchQuery}
                                onChange={(e) => setUserSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-muted focus:outline-none focus:border-[var(--accent)]"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={loadUsers}
                                disabled={usersLoading}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/10 text-xs text-white font-medium transition-all cursor-pointer"
                            >
                                <RefreshCw size={14} className={usersLoading ? "animate-spin" : ""} />
                                <span>Refresh</span>
                            </button>

                            <button
                                onClick={() => setIsAddUserOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] text-black text-xs font-semibold shadow-[0_4px_12px_rgba(255,215,0,0.25)] hover:opacity-95 transition-all cursor-pointer"
                            >
                                <UserPlus size={15} />
                                <span>Provision User</span>
                            </button>
                        </div>
                    </div>

                    {/* Users Table */}
                    <div className="glass rounded-2xl border border-white/10 overflow-hidden">
                        {usersLoading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted">
                                <RefreshCw size={24} className="animate-spin text-[var(--accent)]" />
                                <span className="text-sm">Loading user directory...</span>
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="py-16 text-center text-muted text-sm">
                                No users found.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-white/[0.03] text-muted border-b border-white/10 text-[0.72rem] uppercase tracking-wider">
                                        <tr>
                                            <th className="py-3 px-4">User</th>
                                            <th className="py-3 px-4">Role</th>
                                            <th className="py-3 px-4">Status</th>
                                            <th className="py-3 px-4">Active Privileges</th>
                                            <th className="py-3 px-4">Created</th>
                                            <th className="py-3 px-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.06]">
                                        {filteredUsers.map((u) => {
                                            const isSuperAdmin = u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                                            return (
                                                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                                                    {/* User Info */}
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold border ${
                                                                isSuperAdmin
                                                                    ? "bg-[var(--accent)]/15 border-[var(--accent)]/40 text-[var(--accent)]"
                                                                    : "bg-white/[0.06] border-white/10 text-white"
                                                            }`}>
                                                                {u.email.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-white flex items-center gap-1.5">
                                                                    {u.full_name || u.email.split("@")[0]}
                                                                    {isSuperAdmin && (
                                                                        <span className="text-[0.62rem] px-1.5 py-0.2 rounded-full bg-[var(--accent)]/20 text-[#FFD700] border border-[var(--accent)]/30 font-bold">
                                                                            Permanent Admin
                                                                        </span>
                                                                    )}
                                                                </span>
                                                                <span className="text-muted text-[0.7rem]">{u.email}</span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Role */}
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        <span className={`px-2.5 py-0.5 rounded-full border text-[0.68rem] font-bold uppercase tracking-wider ${
                                                            u.role === "superadmin"
                                                                ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                                                : u.role === "admin"
                                                                ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                                                                : u.role === "manager"
                                                                ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                                                                : "bg-slate-500/15 text-slate-300 border-slate-500/30"
                                                        }`}>
                                                            {u.role}
                                                        </span>
                                                    </td>

                                                    {/* Status */}
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        <span className={`px-2 py-0.5 rounded-full border text-[0.68rem] font-medium flex items-center gap-1 w-fit ${
                                                            u.status === "active"
                                                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                                                : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                                                        }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${u.status === "active" ? "bg-emerald-400" : "bg-rose-400"}`} />
                                                            {u.status}
                                                        </span>
                                                    </td>

                                                    {/* Privileges Badges */}
                                                    <td className="py-3 px-4">
                                                        <div className="flex flex-wrap gap-1 max-w-sm">
                                                            {u.privileges?.can_manage_users && (
                                                                <span className="px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[0.62rem]">
                                                                    Users
                                                                </span>
                                                            )}
                                                            {u.privileges?.can_view_logs && (
                                                                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[0.62rem]">
                                                                    Logs
                                                                </span>
                                                            )}
                                                            {u.privileges?.can_edit_finances && (
                                                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[0.62rem]">
                                                                    Finances
                                                                </span>
                                                            )}
                                                            {u.privileges?.can_manage_staff && (
                                                                <span className="px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[0.62rem]">
                                                                    Staff
                                                                </span>
                                                            )}
                                                            {u.privileges?.can_manage_contracting && (
                                                                <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[0.62rem]">
                                                                    Contracting
                                                                </span>
                                                            )}
                                                            {u.privileges?.can_manage_settings && (
                                                                <span className="px-1.5 py-0.5 rounded bg-pink-500/10 border border-pink-500/20 text-pink-300 text-[0.62rem]">
                                                                    Settings
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Created Date */}
                                                    <td className="py-3 px-4 whitespace-nowrap text-muted text-[0.72rem]">
                                                        {u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN") : "Initial"}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="py-3 px-4 text-right whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {/* Send Magic Sign-In Link */}
                                                            <button
                                                                onClick={() => handleSendMagicLink(u.email)}
                                                                disabled={sendingMagicLinkEmail === u.email}
                                                                className="p-1.5 rounded-lg bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 border border-[var(--accent)]/25 text-[#FFD700] cursor-pointer transition-all disabled:opacity-50"
                                                                title="Send Magic Sign-In Link"
                                                            >
                                                                {sendingMagicLinkEmail === u.email ? (
                                                                    <RefreshCw size={13} className="animate-spin" />
                                                                ) : (
                                                                    <Sparkles size={13} />
                                                                )}
                                                            </button>

                                                            {/* Edit Privileges */}
                                                            <button
                                                                onClick={() => setEditUserModal(JSON.parse(JSON.stringify(u)))}
                                                                className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/15 border border-white/10 text-white cursor-pointer transition-all"
                                                                title="Edit Role & Privileges"
                                                            >
                                                                <Edit3 size={13} />
                                                            </button>

                                                            {/* Delete User */}
                                                            <button
                                                                onClick={() => handleDeleteUser(u)}
                                                                disabled={isSuperAdmin}
                                                                className={`p-1.5 rounded-lg border transition-all ${
                                                                    isSuperAdmin
                                                                        ? "bg-white/[0.02] border-white/5 text-muted/30 cursor-not-allowed"
                                                                        : "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-400 cursor-pointer"
                                                                }`}
                                                                title={isSuperAdmin ? "Super Admin cannot be deleted" : "Delete User"}
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: SQL SCHEMA */}
            {activeTab === "schema" && (
                <div className="flex flex-col gap-4">
                    <div className="glass p-6 rounded-2xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-base font-bold text-white mb-1">PostgreSQL &amp; Supabase Database Migrations</h2>
                            <p className="text-xs text-muted max-w-2xl">
                                The system is operating in a fail-safe dual-storage architecture. All actions and privileges are actively recorded in both Supabase and persistent storage. To configure the native PostgreSQL tables and indexing in your Supabase project, execute this migration script.
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                const sql = `-- GFE ERP Audit & Users Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    entity_id TEXT,
    description TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    user_id UUID,
    user_email TEXT NOT NULL,
    user_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs (module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'staff',
    privileges JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.user_profiles (email, full_name, role, privileges, status)
VALUES ('jaspreetkohli72@gmail.com', 'Jaspreet Singh Kohli', 'superadmin', '{"can_manage_users": true, "can_view_logs": true, "can_edit_finances": true, "can_manage_staff": true, "can_manage_contracting": true, "can_manage_settings": true}'::jsonb, 'active')
ON CONFLICT (email) DO UPDATE SET role = 'superadmin', status = 'active';`;

                                navigator.clipboard.writeText(sql);
                                setCopiedSql(true);
                                setTimeout(() => setCopiedSql(false), 2500);
                                showNotify("SQL migration script copied to clipboard!");
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] text-black text-xs font-bold shadow-[0_4px_12px_rgba(255,215,0,0.25)] hover:opacity-95 transition-all cursor-pointer whitespace-nowrap self-start md:self-auto"
                        >
                            {copiedSql ? <Check size={16} /> : <Copy size={16} />}
                            <span>{copiedSql ? "Copied SQL!" : "Copy SQL Script"}</span>
                        </button>
                    </div>

                    <div className="glass p-5 rounded-2xl border border-white/10 font-mono text-xs text-gray-300 overflow-x-auto bg-black/60 max-h-[500px]">
                        <pre className="text-[0.75rem] leading-relaxed">
{`-- GFE ERP (Galaxy Fabricarion Experts) - Audit Logging & User Privileges Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    entity_id TEXT,
    description TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    user_id UUID,
    user_email TEXT NOT NULL,
    user_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs (module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'staff',
    privileges JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.user_profiles (email, full_name, role, privileges, status)
VALUES (
    'jaspreetkohli72@gmail.com',
    'Jaspreet Singh Kohli',
    'superadmin',
    '{"can_manage_users": true, "can_view_logs": true, "can_edit_finances": true, "can_manage_staff": true, "can_manage_contracting": true, "can_manage_settings": true}'::jsonb,
    'active'
)
ON CONFLICT (email) DO UPDATE SET role = 'superadmin', status = 'active';`}
                        </pre>
                    </div>
                </div>
            )}

            {/* MODAL: INSPECT LOG DETAILS */}
            {inspectLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="glass p-6 rounded-3xl border border-white/10 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
                        <div className="flex items-center justify-between pb-4 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full border text-[0.65rem] font-bold ${getActionBadge(inspectLog.action)}`}>
                                    {inspectLog.action}
                                </span>
                                <h3 className="text-sm font-bold text-white">Log Inspection: {inspectLog.module}</h3>
                            </div>
                            <button
                                onClick={() => setInspectLog(null)}
                                className="p-1 rounded-lg text-muted hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-3 py-4 text-xs overflow-y-auto flex-1">
                            <div>
                                <span className="text-muted block mb-1">Description:</span>
                                <p className="text-white bg-black/40 p-2.5 rounded-xl border border-white/5 font-medium">
                                    {inspectLog.description}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <span className="text-muted block mb-1">Actor Email:</span>
                                    <span className="text-gray-200 font-mono">{inspectLog.user_email}</span>
                                </div>
                                <div>
                                    <span className="text-muted block mb-1">Timestamp:</span>
                                    <span className="text-gray-200 font-mono">
                                        {inspectLog.timestamp ? new Date(inspectLog.timestamp).toISOString() : "N/A"}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <span className="text-muted block mb-1">Captured Payload Details (JSON):</span>
                                <pre className="p-3 bg-black/70 rounded-xl border border-white/10 text-[0.72rem] font-mono text-emerald-300 overflow-x-auto max-h-60 leading-relaxed">
                                    {JSON.stringify(inspectLog.details, null, 2)}
                                </pre>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-white/10 flex justify-end">
                            <button
                                onClick={() => setInspectLog(null)}
                                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium cursor-pointer transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: PROVISION NEW USER */}
            {isAddUserOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <form onSubmit={handleCreateUser} className="glass p-6 rounded-3xl border border-white/10 max-w-lg w-full flex flex-col gap-4 shadow-2xl">
                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <UserPlus size={18} className="text-[var(--accent)]" />
                                <h3 className="text-base font-bold text-white">Provision New User Account</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAddUserOpen(false)}
                                className="p-1 rounded-lg text-muted hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-3 text-xs">
                            <div>
                                <label className="text-muted block mb-1 font-medium">Full Name (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Jaspreet Singh"
                                    value={newUserFullName}
                                    onChange={(e) => setNewUserFullName(e.target.value)}
                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white placeholder-muted focus:outline-none focus:border-[var(--accent)]"
                                />
                            </div>

                            <div>
                                <label className="text-muted block mb-1 font-medium">Email Address *</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="user@example.com"
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white placeholder-muted focus:outline-none focus:border-[var(--accent)]"
                                />
                            </div>

                            <div>
                                <label className="text-muted block mb-1 font-medium">Initial Password *</label>
                                <input
                                    type="password"
                                    required
                                    placeholder="Minimum 6 characters"
                                    value={newUserPassword}
                                    onChange={(e) => setNewUserPassword(e.target.value)}
                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white placeholder-muted focus:outline-none focus:border-[var(--accent)]"
                                />
                            </div>

                            <div>
                                <label className="text-muted block mb-1 font-medium">Assigned Role</label>
                                <select
                                    value={newUserRole}
                                    onChange={(e) => {
                                        const r = e.target.value as RoleType;
                                        setNewUserRole(r);
                                        setNewUserPrivileges(DEFAULT_ROLE_PRIVILEGES[r]);
                                    }}
                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[var(--accent)]"
                                >
                                    <option value="admin">Administrator</option>
                                    <option value="manager">Manager</option>
                                    <option value="staff">Staff Member</option>
                                    <option value="viewer">Viewer (Read Only)</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-muted block mb-1.5 font-medium">Granular Privileges</label>
                                <div className="grid grid-cols-2 gap-2 p-3 bg-black/30 rounded-xl border border-white/5">
                                    <label className="flex items-center gap-2 text-[0.72rem] text-gray-200 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newUserPrivileges.can_manage_users}
                                            onChange={(e) => setNewUserPrivileges(prev => ({ ...prev, can_manage_users: e.target.checked }))}
                                            className="rounded accent-[var(--accent)]"
                                        />
                                        <span>Manage Users</span>
                                    </label>

                                    <label className="flex items-center gap-2 text-[0.72rem] text-gray-200 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newUserPrivileges.can_view_logs}
                                            onChange={(e) => setNewUserPrivileges(prev => ({ ...prev, can_view_logs: e.target.checked }))}
                                            className="rounded accent-[var(--accent)]"
                                        />
                                        <span>View Audit Logs</span>
                                    </label>

                                    <label className="flex items-center gap-2 text-[0.72rem] text-gray-200 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newUserPrivileges.can_edit_finances}
                                            onChange={(e) => setNewUserPrivileges(prev => ({ ...prev, can_edit_finances: e.target.checked }))}
                                            className="rounded accent-[var(--accent)]"
                                        />
                                        <span>Finances &amp; Wallets</span>
                                    </label>

                                    <label className="flex items-center gap-2 text-[0.72rem] text-gray-200 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newUserPrivileges.can_manage_staff}
                                            onChange={(e) => setNewUserPrivileges(prev => ({ ...prev, can_manage_staff: e.target.checked }))}
                                            className="rounded accent-[var(--accent)]"
                                        />
                                        <span>Staff &amp; Attendance</span>
                                    </label>

                                    <label className="flex items-center gap-2 text-[0.72rem] text-gray-200 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newUserPrivileges.can_manage_contracting}
                                            onChange={(e) => setNewUserPrivileges(prev => ({ ...prev, can_manage_contracting: e.target.checked }))}
                                            className="rounded accent-[var(--accent)]"
                                        />
                                        <span>Estimates &amp; Bills</span>
                                    </label>

                                    <label className="flex items-center gap-2 text-[0.72rem] text-gray-200 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newUserPrivileges.can_manage_settings}
                                            onChange={(e) => setNewUserPrivileges(prev => ({ ...prev, can_manage_settings: e.target.checked }))}
                                            className="rounded accent-[var(--accent)]"
                                        />
                                        <span>System Settings</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsAddUserOpen(false)}
                                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium cursor-pointer transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={userSubmitting}
                                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] text-black text-xs font-bold shadow-[0_4px_12px_rgba(255,215,0,0.25)] hover:opacity-95 transition-all cursor-pointer flex items-center gap-1.5"
                            >
                                {userSubmitting && <RefreshCw size={12} className="animate-spin" />}
                                <span>Provision Account</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL: EDIT USER PRIVILEGES */}
            {editUserModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="glass p-6 rounded-3xl border border-white/10 max-w-lg w-full flex flex-col gap-4 shadow-2xl">
                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                            <div>
                                <h3 className="text-base font-bold text-white">Edit User Privileges</h3>
                                <p className="text-xs text-muted font-mono">{editUserModal.email}</p>
                            </div>
                            <button
                                onClick={() => setEditUserModal(null)}
                                className="p-1 rounded-lg text-muted hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-3 text-xs">
                            {/* Role Selection */}
                            <div>
                                <label className="text-muted block mb-1 font-medium">Assigned Role</label>
                                <select
                                    value={editUserModal.role}
                                    disabled={editUserModal.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()}
                                    onChange={(e) => {
                                        const r = e.target.value as RoleType;
                                        setEditUserModal(prev => prev ? {
                                            ...prev,
                                            role: r,
                                            privileges: DEFAULT_ROLE_PRIVILEGES[r],
                                        } : null);
                                    }}
                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[var(--accent)] disabled:opacity-60"
                                >
                                    <option value="superadmin">Super Administrator</option>
                                    <option value="admin">Administrator</option>
                                    <option value="manager">Manager</option>
                                    <option value="staff">Staff Member</option>
                                    <option value="viewer">Viewer</option>
                                </select>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="text-muted block mb-1 font-medium">Account Status</label>
                                <select
                                    value={editUserModal.status}
                                    disabled={editUserModal.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()}
                                    onChange={(e) => {
                                        const st = e.target.value as "active" | "suspended" | "inactive";
                                        setEditUserModal(prev => prev ? { ...prev, status: st } : null);
                                    }}
                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[var(--accent)] disabled:opacity-60"
                                >
                                    <option value="active">Active</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                            </div>

                            {/* Granular Toggles */}
                            <div>
                                <label className="text-muted block mb-1.5 font-medium">Granular Delegation Rights</label>
                                <div className="grid grid-cols-2 gap-2 p-3 bg-black/30 rounded-xl border border-white/5">
                                    <label className="flex items-center gap-2 text-[0.72rem] text-gray-200 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            disabled={editUserModal.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()}
                                            checked={editUserModal.privileges?.can_manage_users}
                                            onChange={(e) => setEditUserModal(prev => prev ? {
                                                ...prev,
                                                privileges: { ...prev.privileges, can_manage_users: e.target.checked }
                                            } : null)}
                                            className="rounded accent-[var(--accent)]"
                                        />
                                        <span>Manage Users</span>
                                    </label>

                                    <label className="flex items-center gap-2 text-[0.72rem] text-gray-200 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            disabled={editUserModal.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()}
                                            checked={editUserModal.privileges?.can_view_logs}
                                            onChange={(e) => setEditUserModal(prev => prev ? {
                                                ...prev,
                                                privileges: { ...prev.privileges, can_view_logs: e.target.checked }
                                            } : null)}
                                            className="rounded accent-[var(--accent)]"
                                        />
                                        <span>View Audit Logs</span>
                                    </label>

                                    <label className="flex items-center gap-2 text-[0.72rem] text-gray-200 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            disabled={editUserModal.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()}
                                            checked={editUserModal.privileges?.can_edit_finances}
                                            onChange={(e) => setEditUserModal(prev => prev ? {
                                                ...prev,
                                                privileges: { ...prev.privileges, can_edit_finances: e.target.checked }
                                            } : null)}
                                            className="rounded accent-[var(--accent)]"
                                        />
                                        <span>Finances &amp; Wallets</span>
                                    </label>

                                    <label className="flex items-center gap-2 text-[0.72rem] text-gray-200 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            disabled={editUserModal.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()}
                                            checked={editUserModal.privileges?.can_manage_staff}
                                            onChange={(e) => setEditUserModal(prev => prev ? {
                                                ...prev,
                                                privileges: { ...prev.privileges, can_manage_staff: e.target.checked }
                                            } : null)}
                                            className="rounded accent-[var(--accent)]"
                                        />
                                        <span>Staff &amp; Attendance</span>
                                    </label>

                                    <label className="flex items-center gap-2 text-[0.72rem] text-gray-200 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            disabled={editUserModal.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()}
                                            checked={editUserModal.privileges?.can_manage_contracting}
                                            onChange={(e) => setEditUserModal(prev => prev ? {
                                                ...prev,
                                                privileges: { ...prev.privileges, can_manage_contracting: e.target.checked }
                                            } : null)}
                                            className="rounded accent-[var(--accent)]"
                                        />
                                        <span>Estimates &amp; Bills</span>
                                    </label>

                                    <label className="flex items-center gap-2 text-[0.72rem] text-gray-200 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            disabled={editUserModal.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()}
                                            checked={editUserModal.privileges?.can_manage_settings}
                                            onChange={(e) => setEditUserModal(prev => prev ? {
                                                ...prev,
                                                privileges: { ...prev.privileges, can_manage_settings: e.target.checked }
                                            } : null)}
                                            className="rounded accent-[var(--accent)]"
                                        />
                                        <span>System Settings</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setEditUserModal(null)}
                                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium cursor-pointer transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSavePrivileges}
                                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] text-black text-xs font-bold shadow-[0_4px_12px_rgba(255,215,0,0.25)] hover:opacity-95 transition-all cursor-pointer"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
