const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/Jaspreet/Documents/JERP/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    try {
        const { data, error } = await supabase.from('staff').select('*').limit(1);
        if (error) {
            console.error("Supabase error:", error);
            return;
        }

        console.log("Keys in staff record:", Object.keys(data[0] || {}));
        console.log("Sample record:", data[0]);
    } catch (err) {
        console.error("Execution error:", err);
    }
}

run();
