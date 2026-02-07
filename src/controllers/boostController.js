import supabase from '../config/supabase.js';

/**
 * Get all fundamental boost items (features)
 */
export const getBoostItems = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('price_items')
            .select('*')
            .eq('item_type', 'BOOST_ITEM')
            .eq('status', 'ACTIVE');

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get available boost packages for a specific vehicle type
 */
export const getBoostPackages = async (req, res) => {
    try {
        const { vehicleTypeId } = req.query;

        // 1. Get all BOOST_PACKAGE price items
        const { data: packages, error: pkgError } = await supabase
            .from('price_items')
            .select('*')
            .eq('item_type', 'BOOST_PACKAGE')
            .eq('status', 'ACTIVE');

        if (pkgError) throw pkgError;

        if (!packages || packages.length === 0) {
            return res.json([]);
        }

        const packageIds = packages.map(p => p.id);

        // 2. Get pricing rules for these packages filtered by vehicle type
        let rulesQuery = supabase
            .from('pricing_rules')
            .select('*')
            .in('price_item_id', packageIds);

        if (vehicleTypeId) {
            // Include rules that are either null (global) or match the specific vehicle type
            rulesQuery = rulesQuery.or(`vehicle_type_id.eq.${vehicleTypeId},vehicle_type_id.is.null`);
        }

        const { data: rules, error: rulesError } = await rulesQuery;
        if (rulesError) throw rulesError;

        // 3. Get included items (the features like HB_BOOST, etc.)
        const { data: includedItems, error: incError } = await supabase
            .from('package_included_items')
            .select(`*, price_items!package_included_items_included_item_id_fkey (name, code, item_type)`)
            .in('package_id', packageIds);

        if (incError) throw incError;

        // 4. Combine data
        const enrichedPackages = packages.map(pkg => {
            const pkgRules = rules.filter(r => r.price_item_id === pkg.id);
            // If we filtered by vehicleTypeId, only return packages that actually have a rule for it
            if (vehicleTypeId && pkgRules.length === 0) return null;

            const pkgIncluded = includedItems.filter(i => i.package_id === pkg.id);

            return {
                ...pkg,
                rules: pkgRules,
                included_items: pkgIncluded
            };
        }).filter(Boolean);

        res.json(enrichedPackages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Internal function to apply boost
 */
export const applyBoostToAd = async ({ adId, packageId, paymentId, durationDays }) => {
    if (!adId || !packageId || !durationDays) {
        throw new Error('Ad ID, Package ID, and Duration are required');
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + parseInt(durationDays));

    const { data, error } = await supabase
        .from('ad_boosts')
        .insert([{
            ad_id: adId,
            package_id: packageId,
            payment_id: paymentId || null,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            status: 'ACTIVE'
        }])
        .select()
        .single();

    if (error) throw error;

    // 3. Get included items to see which flags to update in CarAd
    const { data: includedItems } = await supabase
        .from('package_included_items')
        .select('price_items!package_included_items_included_item_id_fkey(code)')
        .eq('package_id', packageId);

    if (includedItems && includedItems.length > 0) {
        const updates = {};
        includedItems.forEach(item => {
            const code = item.price_items?.code;
            if (code === 'HB_BOOST') updates.is_homepage_banner = true;
            if (code === 'FL_BOOST') updates.is_featured = true;
            if (code === 'PP_BOOST') updates.is_popup_promotion = true;
            if (code === 'US_BOOST') updates.is_urgent = true;
        });

        if (Object.keys(updates).length > 0) {
            await supabase
                .from('CarAd')
                .update(updates)
                .eq('id', adId);
        }
    }

    return data;
};

/**
 * Apply a boost package to an ad
 * This is usually called after a successful payment
 */
export const applyBoost = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { adId, packageId, amount } = req.body;

        if (!adId || !packageId) {
            return res.status(400).json({ success: false, message: "Ad ID and Package ID are required." });
        }

        // 1. Fetch Package Duration and Price
        const { data: featData } = await supabase
            .from('package_features')
            .select('feature_value')
            .eq('price_item_id', packageId)
            .eq('feature_key', 'DURATION_DAYS')
            .single();

        const durationDays = featData ? parseInt(featData.feature_value) : 30;

        // 2. Create a SUCCESS Payment Record directly for tracking
        const { data: payData, error: payError } = await supabase
            .from('payments')
            .insert({
                user_id: userId,
                package_id: packageId,
                ad_id: adId,
                order_id: `BOOST-DIRECT-${Date.now()}`,
                amount: amount || 0,
                currency: 'LKR',
                status: 'SUCCESS',
                payment_method: 'DIRECT_ACTIVATE',
                transaction_id: `DIRECT-${Date.now()}`
            })
            .select()
            .single();

        if (payError) {
            console.error("Direct Boost Payment Record Error:", payError);
            return res.status(500).json({ success: false, message: "Failed to create tracking record." });
        }

        // 3. Apply Boost to Ad
        const data = await applyBoostToAd({
            adId,
            packageId,
            paymentId: payData.id,
            durationDays
        });

        res.status(201).json({
            success: true,
            message: 'Boost applied successfully',
            data
        });
    } catch (error) {
        console.error("Error in direct applyBoost:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get active boosts for a specific ad
 */
export const getAdBoosts = async (req, res) => {
    try {
        const { adId } = req.params;
        const now = new Date().toISOString();

        const { data, error } = await supabase
            .from('ad_boosts')
            .select(`
                *,
                package:price_items!ad_boosts_package_id_fkey (
                    id, name, code,
                    included:package_included_items (
                        item:price_items!package_included_items_included_item_id_fkey (code, name)
                    )
                )
            `)
            .eq('ad_id', adId)
            .eq('status', 'ACTIVE')
            .lte('start_date', now)
            .gte('end_date', now);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
