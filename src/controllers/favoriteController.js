import supabase from '../config/supabase.js';

/**
 * Toggle a favorite for a user
 */
export const toggleFavorite = async (req, res) => {
    const { ad_id } = req.body;
    const user_id = req.user.id;

    if (!ad_id) {
        return res.status(400).json({ success: false, message: "Ad ID is required" });
    }

    try {
        // Check if already in wishlist
        const { data: existing, error: checkError } = await supabase
            .from('wishlist')
            .select('id')
            .eq('user_id', user_id)
            .eq('ad_id', ad_id)
            .maybeSingle();

        if (checkError) throw checkError;

        if (existing) {
            // Remove from wishlist
            const { error: deleteError } = await supabase
                .from('wishlist')
                .delete()
                .eq('id', existing.id);

            if (deleteError) throw deleteError;

            // Decrement likes_count in CarAd
            await supabase.rpc('decrement_likes_count', { ad_id_param: ad_id });
            // Fallback if RPC doesn't exist (though RPC is safer for concurrency)
            // await supabase.from('CarAd').update({ likes_count: supabase.raw('likes_count - 1') }).eq('id', ad_id);
            // Since I don't know if RPC exists, I'll use a standard update with current value or a safe increment if possible.
            // Supabase doesn't have a direct "increment" in JS client without RPC easily but we can fetch and update.
            const { data: adData } = await supabase.from('CarAd').select('likes_count').eq('id', ad_id).single();
            const newLikes = Math.max(0, (adData?.likes_count || 1) - 1);
            await supabase.from('CarAd').update({ likes_count: newLikes }).eq('id', ad_id);

            return res.json({ success: true, isFavorite: false, message: "Removed from wishlist" });
        } else {
            // Add to wishlist
            const { error: insertError } = await supabase
                .from('wishlist')
                .insert([{ user_id, ad_id }]);

            if (insertError) throw insertError;

            // Increment likes_count in CarAd
            const { data: adData } = await supabase.from('CarAd').select('likes_count').eq('id', ad_id).single();
            const newLikes = (adData?.likes_count || 0) + 1;
            await supabase.from('CarAd').update({ likes_count: newLikes }).eq('id', ad_id);

            return res.status(201).json({ success: true, isFavorite: true, message: "Added to wishlist" });
        }
    } catch (error) {
        console.error("Favorite toggle error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get all favorites for a user
 */
export const getFavorites = async (req, res) => {
    const user_id = req.user.id;

    try {
        const { data, error } = await supabase
            .from('wishlist')
            .select(`
                id,
                created_at,
                ad:CarAd (
                    id,
                    title,
                    price,
                    status,
                    location,
                    CarDetails (
                        brand,
                        model,
                        year,
                        mileage,
                        condition,
                        fuel_type
                    ),
                    AdImage (
                        image_url,
                        is_primary
                    )
                )
            `)
            .eq('user_id', user_id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Flatten the data for the frontend
        const favorites = data.map(item => ({
            ...item.ad,
            wishlist_id: item.id,
            added_at: item.created_at
        }));

        res.json({ success: true, data: favorites });
    } catch (error) {
        console.error("Fetch favorites error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Check if a specific ad is favorited
 */
export const getIsFavorite = async (req, res) => {
    const { ad_id } = req.params;
    const user_id = req.user?.id;

    if (!user_id) return res.json({ success: true, isFavorite: false });

    try {
        const { data, error } = await supabase
            .from('wishlist')
            .select('id')
            .eq('user_id', user_id)
            .eq('ad_id', ad_id)
            .maybeSingle();

        if (error) throw error;

        res.json({ success: true, isFavorite: !!data });
    } catch (error) {
        console.error("Check favorite error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
