import supabase from './src/config/supabase.js';

async function checkSchema() {
    try {
        console.log("Checking schema for table 'vehicle_types'...");

        // This is a hacky way to check columns without raw SQL access: 
        // try to select a single row and see what keys come back.
        const { data, error } = await supabase
            .from('vehicle_types')
            .select('*')
            .limit(1);

        if (error) {
            console.error("Error fetching table:", error.message);
            return;
        }

        if (data && data.length > 0) {
            const columns = Object.keys(data[0]);
            console.log("Existing columns:", columns);
            if (columns.includes('type_image')) {
                console.log("✅ Column 'type_image' EXISTS.");
            } else {
                console.log("❌ Column 'type_image' is MISSING.");
            }
        } else {
            console.log("Table is empty, trying to fetch schema info...");
            // Alternative: try to select just the column and catch specific error
            const { error: colError } = await supabase
                .from('vehicle_types')
                .select('type_image')
                .limit(1);

            if (colError && colError.message.includes('column "type_image" does not exist')) {
                console.log("❌ Column 'type_image' is MISSING.");
            } else if (!colError) {
                console.log("✅ Column 'type_image' EXISTS.");
            } else {
                console.log("Unexpected error:", colError.message);
            }
        }
    } catch (err) {
        console.error("Script error:", err);
    }
}

checkSchema();
