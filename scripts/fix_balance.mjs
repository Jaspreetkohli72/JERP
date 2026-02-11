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

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Supabase credentials.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixBalances() {
    console.log("Fixing Wallet Balances based on verification...");

    if (!fs.existsSync('balance_verification.json')) {
        console.error("Verification file not found. Run verify_balance.mjs first.");
        return;
    }

    const results = JSON.parse(fs.readFileSync('balance_verification.json', 'utf8'));
    const mismatches = results.filter(r => !r.isCorrect);

    if (mismatches.length === 0) {
        console.log("No mismatches found to fix.");
        return;
    }

    console.log(`Found ${mismatches.length} mismatches. Updating DB...`);

    for (const item of mismatches) {
        console.log(`Updating ${item.name} (${item.id})`);
        console.log(`  Old Balance: ${item.currentBalance}`);
        console.log(`  New Balance: ${item.calculatedBalance}`);

        const { error } = await supabase
            .from('wallets')
            .update({ balance: item.calculatedBalance })
            .eq('id', item.id);

        if (error) {
            console.error(`  ❌ Failed to update: ${error.message}`);
        } else {
            console.log(`  ✅ Updated successfully`);
        }
    }
}

fixBalances();
