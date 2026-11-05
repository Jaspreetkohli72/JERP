import { supabase } from '@/lib/supabase';

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
    ]);
}

export async function getDashboardStats() {
    let totalLiquidAssets = 0;
    let income = 0;
    let expense = 0;
    let monthTxs: any[] = [];

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    try {
        const [walletsRes, txsRes] = await Promise.allSettled([
            withTimeout(
                Promise.resolve(supabase.from('wallets').select('balance')) as Promise<any>,
                2500,
                { data: [], error: null }
            ),
            withTimeout(
                Promise.resolve(
                    supabase
                        .from('transactions')
                        .select('amount, type, transaction_date, categories(name)')
                        .gte('transaction_date', firstDayOfMonth)
                ) as Promise<any>,
                2500,
                { data: [], error: null }
            ),
        ]);

        if (walletsRes.status === 'fulfilled' && walletsRes.value?.data && Array.isArray(walletsRes.value.data)) {
            totalLiquidAssets = walletsRes.value.data.reduce((sum: number, w: any) => sum + Number(w.balance || 0), 0);
        }

        if (txsRes.status === 'fulfilled' && txsRes.value?.data && Array.isArray(txsRes.value.data)) {
            monthTxs = txsRes.value.data;
            monthTxs.forEach((tx: any) => {
                if (tx.type === 'income') income += Number(tx.amount || 0);
                if (tx.type === 'expense') expense += Number(tx.amount || 0);
            });
        }
    } catch (e) {
        console.warn('Dashboard stats load warning:', e);
    }

    return {
        totalLiquidAssets,
        income,
        expense,
        monthTxs,
    };
}
