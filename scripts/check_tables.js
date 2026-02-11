
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log('--- Checking "attendance" table ---');
    const { data: att, error: attErr } = await supabase.from('attendance').select('*').limit(1);
    if (attErr) console.error(attErr);
    else console.log("attendance:", JSON.stringify(att, null, 2));

    console.log('\n--- Checking "staff_attendance" table ---');
    const { data: staffAtt, error: staffAttErr } = await supabase.from('staff_attendance').select('*').limit(1);
    if (staffAttErr) console.error(staffAttErr);
    else console.log("staff_attendance:", JSON.stringify(staffAtt, null, 2));
}

checkTables();
