'use server';

import fs from 'fs';
import path from 'path';
import { createClient as createBaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { supabase as fallbackClient } from '@/lib/supabase';
import { SUPER_ADMIN_EMAIL, UserProfile, RoleType, UserPrivileges, DEFAULT_ROLE_PRIVILEGES } from '@/lib/permissions';
import { recordAuditLogAction } from './audit';

async function getClient() {
    try {
        return await createClient();
    } catch {
        return fallbackClient;
    }
}

function getAdminAuthClient() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return null;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://acirakiaxrhfgtksmahm.supabase.co';
    return createBaseClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
}

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'user_profiles.json');

function ensureDataFile() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(USERS_FILE)) {
        const initialUsers: UserProfile[] = [
            {
                id: 'superadmin_jaspreet',
                email: SUPER_ADMIN_EMAIL,
                full_name: 'Jaspreet Singh Kohli',
                role: 'superadmin',
                privileges: DEFAULT_ROLE_PRIVILEGES.superadmin,
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
        ];
        fs.writeFileSync(USERS_FILE, JSON.stringify(initialUsers, null, 2), 'utf-8');
    }
}

function readLocalUsers(): UserProfile[] {
    try {
        ensureDataFile();
        const content = fs.readFileSync(USERS_FILE, 'utf-8');
        return JSON.parse(content || '[]');
    } catch (e) {
        return [];
    }
}

function writeLocalUsers(users: UserProfile[]) {
    try {
        ensureDataFile();
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
    } catch (e) {
        console.warn('[Users] Error writing local users:', e);
    }
}

export async function getUserProfilesAction(): Promise<UserProfile[]> {
    // 1. Direct from Supabase Auth admin API (reads directly from auth.users)
    const admin = getAdminAuthClient();
    if (admin) {
        try {
            const { data, error } = await admin.auth.admin.listUsers();
            if (!error && data?.users && data.users.length > 0) {
                return data.users.map(u => {
                    const isSuper = u.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                    const role: RoleType = isSuper 
                        ? 'superadmin' 
                        : ((u.user_metadata?.role as RoleType) || 'staff');
                    const privileges: UserPrivileges = isSuper
                        ? DEFAULT_ROLE_PRIVILEGES.superadmin
                        : (u.user_metadata?.privileges || DEFAULT_ROLE_PRIVILEGES[role]);
                    const fullName = isSuper
                        ? 'Jaspreet Singh Kohli'
                        : (u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'User');

                    return {
                        id: u.id,
                        email: u.email || '',
                        full_name: fullName,
                        role,
                        privileges,
                        status: 'active',
                        created_at: u.created_at,
                        updated_at: u.updated_at || u.created_at,
                    };
                });
            }
        } catch (e) {
            console.warn('[Users] Admin listUsers error:', e);
        }
    }

    // 2. Direct from Supabase Auth via RPC get_auth_users (reads auth.users directly)
    try {
        const client = await getClient();
        const { data: rpcUsers, error: rpcErr } = await client.rpc('get_auth_users');
        if (!rpcErr && Array.isArray(rpcUsers) && rpcUsers.length > 0) {
            return rpcUsers.map((u: any) => ({
                id: u.id,
                email: u.email,
                full_name: u.full_name || u.email.split('@')[0],
                role: (u.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ? 'superadmin' : (u.role as RoleType)) || 'staff',
                privileges: u.privileges || DEFAULT_ROLE_PRIVILEGES[(u.role as RoleType) || 'staff'],
                status: 'active',
                created_at: u.created_at,
                updated_at: u.created_at,
            }));
        }
    } catch (e) {}

    // 3. Fallback: Try Supabase user_profiles table
    let profiles: UserProfile[] = [];
    try {
        const client = await getClient();
        const { data, error } = await client.from('user_profiles').select('*').order('created_at', { ascending: true });
        if (!error && Array.isArray(data) && data.length > 0) {
            profiles = data;
        } else if (error) {
            console.warn('[Users] Supabase query error:', error.message);
        }
    } catch (e) {
        console.warn('[Users] Exception querying user_profiles:', e);
    }

    // 2. Read local fallback
    const localUsers = readLocalUsers();

    if (profiles.length === 0) {
        profiles = localUsers;
    }

    // Always ensure Super Admin exists
    const hasSuperAdmin = profiles.some(u => u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());
    if (!hasSuperAdmin) {
        const superAdmin: UserProfile = {
            id: 'superadmin_jaspreet',
            email: SUPER_ADMIN_EMAIL,
            full_name: 'Jaspreet Singh Kohli',
            role: 'superadmin',
            privileges: DEFAULT_ROLE_PRIVILEGES.superadmin,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        profiles.unshift(superAdmin);
        writeLocalUsers(profiles);
    }

    return profiles;
}

export async function registerUserProfileSyncAction(profile: {
    id: string;
    email: string;
    full_name?: string;
    role?: RoleType;
    privileges?: Partial<UserPrivileges>;
    actorEmail: string;
    actorName?: string;
}) {
    const role: RoleType = profile.role || 'staff';
    const privileges: UserPrivileges = {
        ...DEFAULT_ROLE_PRIVILEGES[role],
        ...(profile.privileges || {}),
    };

    const newProfile: UserProfile = {
        id: profile.id,
        email: profile.email.toLowerCase().trim(),
        full_name: profile.full_name || profile.email.split('@')[0],
        role,
        privileges,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    // 1. Save locally
    const users = readLocalUsers();
    const index = users.findIndex(u => u.email.toLowerCase() === newProfile.email);
    if (index >= 0) {
        users[index] = { ...users[index], ...newProfile, updated_at: new Date().toISOString() };
    } else {
        users.push(newProfile);
    }
    writeLocalUsers(users);

    // 2. Save to Supabase user_profiles table if available
    try {
        const client = await getClient();
        const { error } = await client.from('user_profiles').upsert([newProfile]);
        if (error) console.warn('[Users] Supabase upsert error:', error.message);
    } catch (e) {
        console.warn('[Users] Exception upserting profile:', e);
    }

    // 3. Log audit event
    await recordAuditLogAction({
        action: 'CREATE',
        module: 'users',
        entity_id: newProfile.id,
        description: `Admin provisioned user ${newProfile.email} (${newProfile.full_name}) with role '${newProfile.role}'`,
        details: { profile: newProfile },
        user_email: profile.actorEmail,
        user_name: profile.actorName || profile.actorEmail,
    });

    return { success: true, profile: newProfile };
}

export async function updateUserPrivilegesAction(payload: {
    userId: string;
    email: string;
    role: RoleType;
    privileges: UserPrivileges;
    status?: 'active' | 'suspended' | 'inactive';
    actorEmail: string;
    actorName?: string;
}) {
    const isTargetSuperAdmin = payload.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    // Prevent modifying the superadmin's master privileges
    const role: RoleType = isTargetSuperAdmin ? 'superadmin' : payload.role;
    const privileges: UserPrivileges = isTargetSuperAdmin ? DEFAULT_ROLE_PRIVILEGES.superadmin : payload.privileges;
    const status = isTargetSuperAdmin ? 'active' : (payload.status || 'active');

    const users = readLocalUsers();
    const idx = users.findIndex(u => u.id === payload.userId || u.email.toLowerCase() === payload.email.toLowerCase());

    const updatedProfile: UserProfile = {
        id: payload.userId,
        email: payload.email.toLowerCase().trim(),
        full_name: idx >= 0 ? users[idx].full_name : payload.email.split('@')[0],
        role,
        privileges,
        status,
        updated_at: new Date().toISOString(),
    };

    if (idx >= 0) {
        users[idx] = { ...users[idx], ...updatedProfile };
    } else {
        users.push(updatedProfile);
    }
    writeLocalUsers(users);

    // 1. Direct update to Supabase Auth user_metadata
    const admin = getAdminAuthClient();
    if (admin) {
        try {
            await admin.auth.admin.updateUserById(payload.userId, {
                user_metadata: {
                    role,
                    privileges,
                    status,
                    full_name: updatedProfile.full_name,
                }
            });
        } catch (e) {
            console.warn('[Users] Error updating auth user_metadata:', e);
        }
    }

    // 2. Also mirror to user_profiles table if available
    try {
        const client = await getClient();
        await client.from('user_profiles').upsert([updatedProfile]);
    } catch (e) {}

    // Audit log
    await recordAuditLogAction({
        action: 'PERMISSION_CHANGE',
        module: 'users',
        entity_id: payload.userId,
        description: `Admin updated permissions for ${payload.email}: Role '${role}', Status '${status}'`,
        details: { role, privileges, status },
        user_email: payload.actorEmail,
        user_name: payload.actorName || payload.actorEmail,
    });

    return { success: true, profile: updatedProfile };
}

export async function deleteUserAction(payload: {
    userId: string;
    targetEmail: string;
    actorEmail: string;
    actorName?: string;
}) {
    if (payload.targetEmail.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        return { success: false, error: 'Cannot delete the Super Administrator account.' };
    }

    const users = readLocalUsers();
    const filtered = users.filter(u => u.id !== payload.userId && u.email.toLowerCase() !== payload.targetEmail.toLowerCase());
    writeLocalUsers(filtered);

    // 1. Direct delete from Supabase Auth!
    const admin = getAdminAuthClient();
    if (admin) {
        try {
            await admin.auth.admin.deleteUser(payload.userId);
        } catch (e) {
            console.warn('[Users] Error deleting from auth.users:', e);
        }
    }

    // 2. Also remove from user_profiles table if available
    try {
        const client = await getClient();
        await client.from('user_profiles').delete().eq('id', payload.userId);
    } catch (e) {}

    // Audit log
    await recordAuditLogAction({
        action: 'DELETE',
        module: 'users',
        entity_id: payload.userId,
        description: `Admin deleted user account ${payload.targetEmail}`,
        details: { deletedEmail: payload.targetEmail },
        user_email: payload.actorEmail,
        user_name: payload.actorName || payload.actorEmail,
    });

    return { success: true };
}

export async function createAdminUserAction(params: {
    email: string;
    password?: string;
    fullName?: string;
    role: RoleType;
    privileges: UserPrivileges;
    actorEmail: string;
    actorName?: string;
}) {
    const admin = getAdminAuthClient();
    if (!admin) {
        return { success: false, error: 'Admin auth client is not configured.' };
    }

    const role = params.role || 'staff';
    const privileges = params.privileges || DEFAULT_ROLE_PRIVILEGES[role];
    const fullName = params.fullName?.trim() || params.email.split('@')[0];

    const { data, error } = await admin.auth.admin.createUser({
        email: params.email.trim(),
        password: params.password || 'GFEpasswd',
        email_confirm: true,
        user_metadata: {
            full_name: fullName,
            role,
            privileges,
        }
    });

    if (error) {
        return { success: false, error: error.message };
    }

    const newProfile: UserProfile = {
        id: data.user.id,
        email: data.user.email!,
        full_name: fullName,
        role,
        privileges,
        status: 'active',
        created_at: data.user.created_at,
        updated_at: data.user.created_at,
    };

    // Mirror to local and user_profiles table
    const users = readLocalUsers();
    users.push(newProfile);
    writeLocalUsers(users);

    try {
        const client = await getClient();
        await client.from('user_profiles').upsert([newProfile]);
    } catch (e) {}

    // Audit log
    await recordAuditLogAction({
        action: 'CREATE',
        module: 'users',
        entity_id: data.user.id,
        description: `Admin provisioned user ${params.email} with role '${role}'`,
        details: { email: params.email, role },
        user_email: params.actorEmail,
        user_name: params.actorName || params.actorEmail,
    });

    return { success: true, user: newProfile };
}
