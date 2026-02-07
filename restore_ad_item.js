import dotenv from 'dotenv';
dotenv.config();
import supabase from './src/config/supabase.js';

async function restoreAdItem() {
    console.log("Restoring AD item...");
    try {
        // Check if exists
        const { data: existing, error: checkError } = await supabase
            .from('price_items')
            .select('id')
            .eq('item_type', 'AD')
            .maybeSingle();

        if (checkError) throw checkError;

        if (existing) {
            console.log("AD item already exists:", existing.id);
            return;
        }

        const { data, error } = await supabase
            .from('price_items')
            .insert({
                name: 'Advertisement Base Price',
                code: 'AD_BASE',
                item_type: 'AD',
                description: 'Base price for posting an advertisement',
                status: 'ACTIVE'
            })
            .select()
            .single();

        if (error) throw error;
        console.log("Created AD item:", data);

    } catch (error) {
        console.error("Error restoring AD item:", error);
    }
}

restoreAdItem();
