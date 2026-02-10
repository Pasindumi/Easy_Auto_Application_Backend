import supabase from '../config/supabase.js';

// --- Price Items ---

export const getPriceItems = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('price_items')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createPriceItem = async (req, res) => {
    try {
        const { code, name, item_type, description, status, created_by_admin } = req.body;

        // Validate required fields
        if (!code || !name || !item_type) {
            return res.status(400).json({ error: 'Code, Name, and Item Type are required' });
        }

        const { data, error } = await supabase
            .from('price_items')
            .insert([{ code, name, item_type, description, status, created_by_admin }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updatePriceItem = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const { data, error } = await supabase
            .from('price_items')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deletePriceItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('price_items')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Price Item deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- Pricing Rules ---

export const getPricingRules = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('pricing_rules')
            .select(`
        *,
        price_items (name, code, item_type),
        vehicle_types (type_name)
      `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createPricingRule = async (req, res) => {
    try {
        const { price_item_id, vehicle_type_id, price, unit, free_image_count, description_limit, extra_letter_price, min_qty, max_qty, created_by_admin } = req.body;

        if (!price_item_id || !price || !unit) {
            return res.status(400).json({ error: 'Price Item, Price, and Unit are required' });
        }

        const { data, error } = await supabase
            .from('pricing_rules')
            .insert([{ price_item_id, vehicle_type_id, price, unit, free_image_count, description_limit: description_limit || 500, min_qty, max_qty, created_by_admin }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updatePricingRule = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const { data, error } = await supabase
            .from('pricing_rules')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deletePricingRule = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('pricing_rules')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Pricing Rule deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- Package Features ---

export const getPackageFeatures = async (req, res) => {
    try {
        const { priceItemIds } = req.query; // Optional filter
        let query = supabase.from('package_features').select('*');

        if (priceItemIds) {
            // Expecting CSV or array
            const ids = priceItemIds.split(',');
            query = query.in('price_item_id', ids);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const addPackageFeature = async (req, res) => {
    try {
        const { price_item_id, feature_key, feature_value, feature_description } = req.body;

        const { data, error } = await supabase
            .from('package_features')
            .insert([{ price_item_id, feature_key, feature_value, feature_description }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deletePackageFeature = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('package_features')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Feature removed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- Package Included Items ---

export const getPackageIncludedItems = async (req, res) => {
    try {
        const { packageId } = req.params;
        const { data, error } = await supabase
            .from('package_included_items')
            .select(`
        *,
        price_items!package_included_items_included_item_id_fkey (name, code, item_type),
        vehicle_types (type_name)
      `)
            .eq('package_id', packageId);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const addPackageIncludedItem = async (req, res) => {
    try {
        const { package_id, included_item_id, quantity, is_unlimited, vehicle_type_id } = req.body;

        // Prevent recursive inclusion (basic check)
        if (package_id === included_item_id) {
            return res.status(400).json({ error: 'Cannot include a package inside itself' });
        }

        const { data, error } = await supabase
            .from('package_included_items')
            .insert([{ package_id, included_item_id, quantity, is_unlimited, vehicle_type_id: vehicle_type_id || null }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const removePackageIncludedItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('package_included_items')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Included item removed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- Package Ad Limits ---

export const getPackageAdLimits = async (req, res) => {
    try {
        const { packageId } = req.params;
        const { data, error } = await supabase
            .from('package_ad_limits')
            .select(`
        *,
        vehicle_types (type_name)
      `)
            .eq('package_id', packageId);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const addPackageAdLimit = async (req, res) => {
    try {
        const { package_id, vehicle_type_id, quantity, is_unlimited } = req.body;

        const { data, error } = await supabase
            .from('package_ad_limits')
            .upsert([{ package_id, vehicle_type_id, quantity, is_unlimited }], { onConflict: 'package_id, vehicle_type_id' })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deletePackageAdLimit = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('package_ad_limits')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Ad limit removed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- Public Data ---

export const getPublicPackages = async (req, res) => {
    try {
        // 1. Get all active packages
        const { data: packages, error: pkgError } = await supabase
            .from('price_items')
            .select('*')
            .eq('item_type', 'PACKAGE')
            .eq('status', 'ACTIVE');

        if (pkgError) throw pkgError;

        if (!packages || packages.length === 0) {
            return res.json([]);
        }

        const packageIds = packages.map(p => p.id);

        // 2. Get pricing rules for these packages
        const { data: rules, error: rulesError } = await supabase
            .from('pricing_rules')
            .select('*')
            .in('price_item_id', packageIds);

        if (rulesError) throw rulesError;

        // 3. Get features (config) for these packages
        const { data: features, error: featError } = await supabase
            .from('package_features')
            .select('*')
            .in('price_item_id', packageIds);

        if (featError) throw featError;

        // 4. Get included items
        const { data: includedItems, error: incError } = await supabase
            .from('package_included_items')
            .select(`*, price_items!package_included_items_included_item_id_fkey (name, code, item_type)`)
            .in('package_id', packageIds);

        if (incError) throw incError;

        // 5. Get ad limits
        const { data: adLimits, error: adError } = await supabase
            .from('package_ad_limits')
            .select(`*, vehicle_types (type_name)`)
            .in('package_id', packageIds);

        if (adError) throw adError;

        // 6. Combine data
        const enrichedPackages = packages.map(pkg => {
            const pkgRules = rules.filter(r => r.price_item_id === pkg.id);
            const pkgFeatures = features.filter(f => f.price_item_id === pkg.id);
            const pkgIncluded = includedItems.filter(i => i.package_id === pkg.id);
            const pkgLimits = adLimits.filter(l => l.package_id === pkg.id);

            // Extract common config from features
            const config = {};
            pkgFeatures.forEach(f => {
                config[f.feature_key] = f.feature_value;
            });

            return {
                ...pkg,
                rules: pkgRules,
                features: pkgFeatures,
                included_items: pkgIncluded,
                ad_limits: pkgLimits,
                config: config
            };
        });

        res.json(enrichedPackages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- User Active Package & Usage ---

export const getUserActivePackage = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        // 1. Get user's ACTIVE subscription
        const now = new Date().toISOString();
        const { data: subscription, error: subError } = await supabase
            .from('user_subscriptions')
            .select(`
                *,
                price_items!user_subscriptions_package_id_fkey (id, name, code, description)
            `)
            .eq('user_id', userId)
            .eq('status', 'ACTIVE')
            .lte('start_date', now)
            .gte('end_date', now)
            .order('end_date', { ascending: false })
            .limit(1)
            .single();

        if (subError && subError.code !== 'PGRST116') throw subError; // PGRST116 is "no rows found"

        if (!subscription) {
            return res.json({ hasForcedPackage: false, package: null });
        }

        const packageId = subscription.package_id;

        // 2. Get Package Config (Ad Limits & Included Items)
        const { data: adLimits, error: infoError } = await supabase
            .from('package_ad_limits')
            .select('*, vehicle_types(type_name)')
            .eq('package_id', packageId);

        if (infoError) throw infoError;

        const { data: includedItems, error: itemsError } = await supabase
            .from('package_included_items')
            .select('*, price_items!package_included_items_included_item_id_fkey(code, name)')
            .eq('package_id', packageId);

        if (itemsError) throw itemsError;

        // 3. Calculate USAGE based on tracking records in 'payments' table
        // We look for 'V-[TypeName]' codes in the order_id, which we use to avoid UUID truncation issues.
        const { data: usageHistory, error: hError } = await supabase
            .from('payments')
            .select('order_id')
            .eq('user_id', userId)
            .eq('package_id', subscription.package_id)
            .eq('status', 'SUCCESS')
            .gte('created_at', subscription.start_date);

        if (hError) throw hError;

        // Fetch all vehicle types to map names back to IDs
        const { data: vTypes, error: vError } = await supabase
            .from('vehicle_types')
            .select('id, type_name');

        if (vError) throw vError;

        const typeMap = {};
        vTypes.forEach(t => {
            typeMap[t.type_name.toLowerCase()] = t.id;
        });

        const usageMap = {};
        usageHistory.forEach(h => {
            if (h.order_id && h.order_id.startsWith('V-')) {
                const typeName = h.order_id.replace('V-', '').toLowerCase();
                const vId = typeMap[typeName];
                if (vId) {
                    if (!usageMap[vId]) usageMap[vId] = 0;
                    usageMap[vId]++;
                }
            } else if (h.order_id && h.order_id.startsWith('INV-')) {
                // OPTIONAL: Fallback for old records if they still exist and are NOT truncated
                // But since we know they are truncated, let's just ignore them or add a comment.
            }
        });

        // 4. Merge Limits vs Usage
        const finalLimits = adLimits.map(limit => {
            const used = usageMap[limit.vehicle_type_id] || 0;
            const remaining = limit.is_unlimited ? 9999 : Math.max(0, limit.quantity - used);
            return {
                ...limit,
                used_count: used,
                remaining_count: remaining
            };
        });

        // 5. Fetch Package Features & Pricing Rules
        const { data: features, error: featError } = await supabase
            .from('package_features')
            .select('*')
            .eq('price_item_id', packageId);

        if (featError) throw featError;

        const config = {};
        features.forEach(f => config[f.feature_key] = f.feature_value);

        const { data: pricingRules, error: ruleError } = await supabase
            .from('pricing_rules')
            .select('*')
            .eq('price_item_id', packageId);

        // 6. Global Limit Calculation (New Feature)
        let globalLimit = null;
        if (config.FREE_ADS_LIMIT || config.IS_UNLIMITED_ADS) {
            const totalUsed = usageHistory.filter(h => h.order_id && h.order_id.startsWith('V-')).length;
            const isUnlimited = config.IS_UNLIMITED_ADS === 'true' || config.IS_UNLIMITED_ADS === true;
            const limitVal = parseInt(config.FREE_ADS_LIMIT) || 0;

            globalLimit = {
                total_limit: limitVal,
                total_used: totalUsed,
                total_remaining: isUnlimited ? 9999 : Math.max(0, limitVal - totalUsed),
                is_unlimited: isUnlimited
            };
        }

        // 7. Check Included Items for Global Limits (Image / Description)
        // ... (rest of the comments)

        res.json({
            success: true,
            data: {
                hasForcedPackage: true,
                subscriptionId: subscription.id,
                packageId: subscription.package_id,
                subscription: subscription,
                package: subscription.price_items,
                limits: finalLimits,
                global_limit: globalLimit, // Add global limit info
                includedItems: includedItems,
                packageRules: pricingRules || [],
                config: config
            }
        });

    } catch (error) {
        console.error("Error fetching active package:", error);
        res.status(500).json({ error: error.message });
    }
};

export const unsubscribeUserPackage = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { packageId } = req.body;

        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        if (!packageId) return res.status(400).json({ error: "Package ID is required" });

        // Update the subscription status to CANCELLED
        const { data, error } = await supabase
            .from('user_subscriptions')
            .update({ status: 'CANCELLED' })
            .eq('user_id', userId)
            .eq('package_id', packageId)
            .eq('status', 'ACTIVE') // Ensure we only cancel active ones
            .select();

        if (error) throw error;

        if (data.length === 0) {
            return res.status(404).json({ error: "No active subscription found for this package." });
        }

        res.json({ message: "Subscription cancelled successfully", data });
    } catch (error) {
        console.error("Error cancelling subscription:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * ADMIN: Fetch all active subscribers
 */
export const getAllSubscribers = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('user_subscriptions')
            .select(`
                *,
                users!user_subscriptions_user_id_fkey (id, name, email, phone, avatar),
                package:price_items!user_subscriptions_package_id_fkey (*)
            `)
            .eq('status', 'ACTIVE')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error("Error fetching subscribers:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * ADMIN: Get detailed usage for a specific subscriber
 */
export const getSubscriberUsage = async (req, res) => {
    try {
        const { userId, packageId } = req.params;

        if (!userId || !packageId) {
            return res.status(400).json({ success: false, message: "User ID and Package ID are required." });
        }

        // 1. Get the specific subscription
        const { data: subscription, error: subError } = await supabase
            .from('user_subscriptions')
            .select(`
                *,
                price_items (*)
            `)
            .eq('user_id', userId)
            .eq('package_id', packageId)
            .eq('status', 'ACTIVE')
            .single();

        if (subError || !subscription) {
            return res.status(404).json({ success: false, message: "Active subscription not found for this user." });
        }

        // 2. Fetch ad limits for this package
        const { data: adLimits, error: adError } = await supabase
            .from('package_ad_limits')
            .select(`*, vehicle_types (type_name)`)
            .eq('package_id', packageId);

        if (adError) throw adError;

        // 3. Calculate USAGE based on tracking records in 'payments' table
        const { data: usageHistory, error: hError } = await supabase
            .from('payments')
            .select('order_id')
            .eq('user_id', userId)
            .eq('package_id', packageId)
            .eq('status', 'SUCCESS')
            .gte('created_at', subscription.start_date);

        if (hError) throw hError;

        // Fetch all vehicle types to map names back to IDs
        const { data: vTypes, error: vError } = await supabase
            .from('vehicle_types')
            .select('id, type_name');

        if (vError) throw vError;

        const typeMap = {};
        vTypes.forEach(t => {
            typeMap[t.type_name.toLowerCase()] = t.id;
        });

        const usageMap = {};
        usageHistory.forEach(h => {
            if (h.order_id && h.order_id.startsWith('V-')) {
                const typeName = h.order_id.replace('V-', '').toLowerCase();
                const vId = typeMap[typeName];
                if (vId) {
                    if (!usageMap[vId]) usageMap[vId] = 0;
                    usageMap[vId]++;
                }
            }
        });

        // 4. Merge Limits vs Usage
        const finalLimits = adLimits.map(limit => {
            const used = usageMap[limit.vehicle_type_id] || 0;
            const remaining = limit.is_unlimited ? 9999 : Math.max(0, limit.quantity - used);
            return {
                ...limit,
                used_count: used,
                remaining_count: remaining
            };
        });

        // 5. Get Package Features (config)
        const { data: features, error: featError } = await supabase
            .from('package_features')
            .select('*')
            .eq('price_item_id', packageId);

        if (featError) throw featError;

        const config = {};
        features.forEach(f => config[f.feature_key] = f.feature_value);

        res.json({
            success: true,
            data: {
                subscription: subscription,
                limits: finalLimits,
                config: config
            }
        });

    } catch (error) {
        console.error("Error fetching subscriber usage:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};
