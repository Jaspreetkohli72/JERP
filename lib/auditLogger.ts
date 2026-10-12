import { recordAuditLogAction, AuditLogEntry } from "@/app/actions/audit";

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
    entity_id?: string;
    user?: { id?: string; email?: string | null; user_metadata?: { full_name?: string } } | null;
}) {
    try {
        const userEmail = user?.email || 'system@galaxy.com';
        const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'System';

        const entry: AuditLogEntry = {
            action,
            module,
            description,
            details: details || {},
            entity_id: entity_id ? String(entity_id) : undefined,
            user_id: user?.id,
            user_email: userEmail,
            user_name: userName,
            timestamp: new Date().toISOString(),
        };

        // Fire-and-forget or awaited
        return await recordAuditLogAction(entry);
    } catch (err) {
        console.warn('[AuditLogger] Failed to record activity log:', err);
        return { success: false, error: err };
    }
}
