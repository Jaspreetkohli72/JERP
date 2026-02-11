import { supabase } from '@/lib/supabase';
import { unstable_cache } from 'next/cache';

export async function getDashboardStats() {
    const getStats = unstable_cache(
        async () => {
            // 1. Fetch Wallets (Total Liquid Assets)
            const { data: wallets, error: walletsError } = await supabase
                .from('wallets')
                .select('balance');

            if (walletsError) throw walletsError;

            const totalLiquidAssets = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

            // 2. Fetch Current Month Transactions for Income/Expense
            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

            const { data: monthTxs, error: txError } = await supabase
                .from('transactions')
                .select('amount, type, transaction_date, categories(name)')
                .gte('transaction_date', firstDayOfMonth);

            if (txError) throw txError;

            let income = 0;
            let expense = 0;

            monthTxs.forEach(tx => {
                if (tx.type === 'income') income += Number(tx.amount);
                if (tx.type === 'expense') expense += Number(tx.amount);
            });

            return {
                totalLiquidAssets,
                income,
                expense,
                monthTxs // Return raw txs for Analytics to process on server
            };
        },
        ['dashboard-stats'],
        { revalidate: 60, tags: ['dashboard-stats'] } // Cache for 60 seconds
    );

    return getStats();
}
