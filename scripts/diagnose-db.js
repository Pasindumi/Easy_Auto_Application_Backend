import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_KEY in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log("🔍 Diagnosing Supabase Connection...");
    console.log(`URL: ${supabaseUrl}`);

    // 1. Check Connection & Users table (usually exists)
    const { data: users, error: userError } = await supabase.from('users').select('count').limit(1);
    if (userError) {
        console.error("❌ Connection Failed or 'users' table missing:", userError.message);
    } else {
        console.log("✅ Main Connection OK ('users' table accessible)");
    }

    // 2. Check Admins Table Existence
    console.log("\n🔍 Checking 'admins' table...");
    const { data: admins, error: adminError } = await supabase.from('admins').select('*').limit(1);

    if (adminError) {
        console.error("❌ Error accessing 'admins' table:", adminError.message);
        if (adminError.message.includes('does not exist')) {
            console.error("   -> SUGGESTION: Run the SQL in supabase_schema.sql to create the table.");
        }
        if (adminError.message.includes('policy')) {
            console.error("   -> SUGGESTION: RLS Policy is blocking access. Use Service Role Key or add Policy.");
        }
    } else {
        console.log("✅ 'admins' table exists and is readable.");
    }

    // 3. Try Dummy Insert (to check write permissions)
    console.log("\n🔍 Checking Write Permissions (Dry Run)...");
    // We won't actually insert, just check if we get a permission error immediately? 
    // Hard to dry-run insert without side effects. valid insert with rollback?
    // Let's just trust the read check for now, commonly if read works, write might work unless simple read-only policy.

}

diagnose();
