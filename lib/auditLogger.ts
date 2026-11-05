import { recordAuditLogAction, AuditLogEntry } from "@/app/actions/audit";
import { supabase } from "./supabase";

export async function logActivity({
    action,
    module,
    description,
    details,
    entity_id,
    user,
}: {
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'AUTH' | 'PERMISSION_CHANGE';
    module: string;
    description: string;
    details?: Record<string, any>;
    entity_id?: string | number;
    user?: { id?: string; email?: string | null; user_metadata?: { full_name?: string } } | null;
}) {
    try {
        let userEmail = user?.email || null;
        let userName = user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : null);
        let userId = user?.id || null;

        // If user wasn't passed directly, attempt resolution from client auth session
        if (!userEmail && typeof window !== 'undefined') {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    userEmail = session.user.email || null;
                    userName = session.user.user_metadata?.full_name || (session.user.email ? session.user.email.split('@')[0] : null);
                    userId = session.user.id;
                }
            } catch {}
        }

        const entry: AuditLogEntry = {
            action,
            module,
            description,
            details: details || {},
            entity_id: entity_id !== undefined && entity_id !== null ? String(entity_id) : undefined,
            user_id: userId || undefined,
            user_email: userEmail || 'jaspreetkohli72@gmail.com',
            user_name: userName || 'Admin',
            timestamp: new Date().toISOString(),
        };

        return await recordAuditLogAction(entry);
    } catch (err) {
        console.warn('[AuditLogger] Failed to record activity log:', err);
        return { success: false, error: err };
    }
}
