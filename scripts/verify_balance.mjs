import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual env loading
const envPath = path.resolve(process.cwd(), '.env.local');
let env = {};
console.log(`Loading env from ${envPath}`);
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim();
            if (key && val) env[key] = val;
        }
    });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log(`URL: ${SUPABASE_URL ? 'Found' : 'Missing'}`);
console.log(`KEY: ${SUPABASE_KEY ? 'Found' : 'Missing'}`);

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Supabase credentials.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifyBalances() {
    console.log("Verifying Wallet Balances...");

    // 1. Fetch Wallets
    const { data: wallets, error: wError } = await supabase.from('wallets').select('*');
    if (wError) {
        console.error("Error fetching wallets:", wError);
        return;
    }

    // 2. Fetch Transactions (only those linked to a wallet)
    // We need ALL transactions to reconstruct history? Yes. Or valid ones.
    const { data: transactions, error: tError } = await supabase
        .from('transactions')
        .select('id, amount, type, wallet_id, description, transaction_date')
        .not('wallet_id', 'is', null);

    if (tError) {
        console.error("Error fetching transactions:", tError);
        return;
    }

    console.log(`Found ${wallets.length} wallets and ${transactions.length} wallet-linked transactions.`);

    let allCorrect = true;

    const results = [];

    // 3. Verify Each Wallet
    for (const wallet of wallets) {
        const walletTxs = transactions.filter(t => t.wallet_id === wallet.id);

        let calculatedBalance = 0;
        for (const tx of walletTxs) {
            const amount = Number(tx.amount);
            if (tx.type === 'income') {
                calculatedBalance += amount;
            } else if (tx.type === 'expense') {
                calculatedBalance -= amount;
            }
        }

        const currentBalance = Number(wallet.balance);
        const difference = currentBalance - calculatedBalance;

        const result = {
            id: wallet.id,
            name: wallet.name,
            currentBalance,
            calculatedBalance,
            difference,
            isCorrect: Math.abs(difference) <= 1
        };
        results.push(result);

        console.log(`Wallet: ${wallet.name} | DB: ${currentBalance} | Calc: ${calculatedBalance} | Diff: ${difference} | ${result.isCorrect ? '✅' : '❌'}`);
    }

    fs.writeFileSync('balance_verification.json', JSON.stringify(results, null, 2));
    console.log("\nResults written to balance_verification.json");

    if (results.every(r => r.isCorrect)) {
        console.log("All balances match!");
    } else {
        console.error("Some balances mismatch.");
    }
}

verifyBalances();
