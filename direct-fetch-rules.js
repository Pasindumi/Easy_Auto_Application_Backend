
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkRules() {
    const { data, error } = await supabase
        .from('pricing_rules')
        .select(`
            *,
            price_items (name, code, item_type),
            vehicle_types (type_name)
        `);

    if (error) {
        console.error("Error:", error);
        return;
    }

    // Save to file for full inspection
    fs.writeFileSync('rules-output.json', JSON.stringify(data, null, 2));
    console.log("Found", data.length, "rules. Saved to rules-output.json");

    data.forEach(r => {
        console.log(`- ID: ${r.id}, Price: ${r.price}, Item: ${r.price_items?.name} (${r.price_items?.code}), Type: ${r.vehicle_types?.type_name || 'Global'}`);
    });
}

checkRules();
