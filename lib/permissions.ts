export const SUPER_ADMIN_EMAIL = "jaspreetkohli72@gmail.com";
export const SUPER_ADMIN_EMAILS = [
    "jaspreetkohli72@gmail.com",
    "jaspreetkohli710@gmail.com",
];

export type RoleType = "superadmin" | "admin" | "manager" | "staff" | "viewer";

export interface UserPrivileges {
    can_manage_users: boolean;
    can_view_logs: boolean;
    can_edit_finances: boolean;
    can_manage_staff: boolean;
    can_manage_contracting: boolean;
    can_manage_settings: boolean;
}

export interface UserProfile {
    id: string;
    email: string;
    full_name: string;
    role: RoleType;
    privileges: UserPrivileges;
    status: "active" | "suspended" | "inactive";
    created_at?: string;
    updated_at?: string;
}

export const DEFAULT_ROLE_PRIVILEGES: Record<RoleType, UserPrivileges> = {
    superadmin: {
        can_manage_users: true,
        can_view_logs: true,
        can_edit_finances: true,
        can_manage_staff: true,
        can_manage_contracting: true,
        can_manage_settings: true,
    },
    admin: {
        can_manage_users: true,
        can_view_logs: true,
        can_edit_finances: true,
        can_manage_staff: true,
        can_manage_contracting: true,
        can_manage_settings: true,
    },
    manager: {
        can_manage_users: false,
        can_view_logs: false,
        can_edit_finances: true,
        can_manage_staff: true,
        can_manage_contracting: true,
        can_manage_settings: false,
    },
    staff: {
        can_manage_users: false,
        can_view_logs: false,
        can_edit_finances: true,
        can_manage_staff: false,
        can_manage_contracting: true,
        can_manage_settings: false,
    },
    viewer: {
        can_manage_users: false,
        can_view_logs: false,
        can_edit_finances: false,
        can_manage_staff: false,
        can_manage_contracting: false,
        can_manage_settings: false,
    },
};

export function isSuperAdmin(email?: string | null): boolean {
    if (!email) return false;
    const lower = email.trim().toLowerCase();
    return SUPER_ADMIN_EMAILS.some((admin) => admin.toLowerCase() === lower);
}

export function canAccessAdmin(profileOrEmail?: UserProfile | string | null): boolean {
    if (!profileOrEmail) return false;
    if (typeof profileOrEmail === "string") {
        return isSuperAdmin(profileOrEmail);
    }
    if (isSuperAdmin(profileOrEmail.email)) return true;
    return profileOrEmail.role === "superadmin" || profileOrEmail.role === "admin" || !!profileOrEmail.privileges?.can_view_logs || !!profileOrEmail.privileges?.can_manage_users;
}

export function hasPrivilege(profile: UserProfile | null | undefined, privilege: keyof UserPrivileges): boolean {
    if (!profile) return false;
    if (isSuperAdmin(profile.email)) return true;
    if (profile.role === "superadmin" || profile.role === "admin") return true;
    return !!profile.privileges?.[privilege];
}
