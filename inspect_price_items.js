import dotenv from 'dotenv';
dotenv.config();
import supabase from './src/config/supabase.js';

async function inspectPriceItems() {
    console.log("🔍 Inspecting price_items table...");
    try {
        const { data, error } = await supabase
            .from('price_items')
            .select('id, name, item_type, code');

        if (error) throw error;

        console.log(`Found ${data.length} records.`);
        const types = {};
        data.forEach(item => {
            if (!types[item.item_type]) types[item.item_type] = 0;
            types[item.item_type]++;
        });

        console.log("Current item_type counts:", types);
        console.log("Current item_type counts:", types);
        // console.log("All records:", JSON.stringify(data, null, 2));
        const fs = await import('fs');
        fs.writeFileSync('price_items_dump.json', JSON.stringify(data, null, 2));
        console.log("Dumped to price_items_dump.json");

    } catch (error) {
        console.error("Error inspecting DB:", error);
    }
}

inspectPriceItems();
