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
        price_items (name, code),
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
        const { price_item_id, vehicle_type_id, price, unit, min_qty, max_qty, created_by_admin } = req.body;

        if (!price_item_id || !price || !unit) {
            return res.status(400).json({ error: 'Price Item, Price, and Unit are required' });
        }

        const { data, error } = await supabase
            .from('pricing_rules')
            .insert([{ price_item_id, vehicle_type_id, price, unit, min_qty, max_qty, created_by_admin }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
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
        price_items!package_included_items_included_item_id_fkey (name, code, item_type)
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
        const { package_id, included_item_id, quantity, is_unlimited } = req.body;

        // Prevent recursive inclusion (basic check)
        if (package_id === included_item_id) {
            return res.status(400).json({ error: 'Cannot include a package inside itself' });
        }

        const { data, error } = await supabase
            .from('package_included_items')
            .insert([{ package_id, included_item_id, quantity, is_unlimited }])
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

        // 4. Combine data
        const enrichedPackages = packages.map(pkg => {
            const pkgRules = rules.filter(r => r.price_item_id === pkg.id);
            const pkgFeatures = features.filter(f => f.price_item_id === pkg.id);

            // Extract common config from features
            const config = {};
            pkgFeatures.forEach(f => {
                config[f.feature_key] = f.feature_value;
            });

            return {
                ...pkg,
                rules: pkgRules,
                features: pkgFeatures,
                config: config
            };
        });

        res.json(enrichedPackages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
