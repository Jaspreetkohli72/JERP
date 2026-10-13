'use server';

import fs from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabase';
import { SUPER_ADMIN_EMAIL, UserProfile, RoleType, UserPrivileges, DEFAULT_ROLE_PRIVILEGES } from '@/lib/permissions';
import { recordAuditLogAction } from './audit';

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
    let profiles: UserProfile[] = [];

    // 1. Try Supabase user_profiles table
    try {
        const { data, error } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: true });
        if (!error && Array.isArray(data) && data.length > 0) {
            profiles = data;
        }
    } catch (e) {}

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
        await supabase.from('user_profiles').upsert([newProfile]);
    } catch (e) {}

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

    // Supabase table update
    try {
        await supabase.from('user_profiles').upsert([updatedProfile]);
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

    // Supabase table delete
    try {
        await supabase.from('user_profiles').delete().eq('email', payload.targetEmail.toLowerCase());
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
