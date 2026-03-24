import supabase from '../config/supabase.js';

export const getExpiringSubscriptions = async (daysThreshold = 7) => {
    try {
        // We want subscriptions expiring exactly in 'daysThreshold' days
        // To be safe, we can look for subscriptions expiring between START of target day and END of target day

        const targetDateStart = new Date();
        targetDateStart.setDate(targetDateStart.getDate() + daysThreshold);
        targetDateStart.setHours(0, 0, 0, 0);

        const targetDateEnd = new Date();
        targetDateEnd.setDate(targetDateEnd.getDate() + daysThreshold);
        targetDateEnd.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
            .from('user_subscriptions')
            .select(`
                id,
                user_id,
                package_id,
                end_date,
                status,
                users (email, name),
                price_items (name, code)
            `)
            .eq('status', 'ACTIVE')
            .gte('end_date', targetDateStart.toISOString())
            .lte('end_date', targetDateEnd.toISOString());

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching expiring subscriptions:', error);
        return [];
    }
};

export const getActiveSubscriptions = async () => {
    try {
        const { data, error } = await supabase
            .from('user_subscriptions')
            .select(`
                id,
                user_id,
                package_id,
                start_date,
                end_date,
                status,
                users (id, email, name),
                price_items (id, name)
            `)
            .eq('status', 'ACTIVE')
            .gt('end_date', new Date().toISOString());

        if (error) throw error;
        return data;

    } catch (error) {
        console.error('Error fetching active subscriptions:', error);
        return [];
    }
}

export const getActiveSubscriptionsForUser = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('user_subscriptions')
            .select(`
                id,
                user_id,
                package_id,
                start_date,
                end_date,
                status,
                users (id, email, name),
                price_items (id, name)
            `)
            .eq('user_id', userId)
            .eq('status', 'ACTIVE')
            .gt('end_date', new Date().toISOString());

        if (error) throw error;
        return data;
    } catch (error) {
        console.error(`Error fetching active subscriptions for user ${userId}:`, error);
        return [];
    }
};

export const getPackageAdLimits = async (packageId) => {
    try {
        const { data, error } = await supabase
            .from('package_ad_limits')
            .select(`
                quantity,
                is_unlimited,
                vehicle_types (id, type_name)
            `)
            .eq('package_id', packageId);

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching package limits:', error);
        return [];
    }
}

export const getUserAdUsage = async (userId, startDate, endDate) => {
    try {
        // Count active ads created within subscription period
        const { data, error } = await supabase
            .from('CarAd') // Corrected table name from 'car_ads' to 'CarAd' matching controller usage
            .select('vehicle_type_id')
            .eq('seller_id', userId)
            //.eq('status', 'ACTIVE') // Should we only count active ads? "Count ads posted by user". Usually limits apply to posted ads regardless of current status, or active ones. Requirement says "status = 'ACTIVE'".
            .in('status', ['ACTIVE', 'DRAFT', 'PENDING', 'PENDING_APPROVAL']) // Assuming lowercase status
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        if (error) {
            // If table doesn't exist, might be "CarAd" quoted.
            // But for now let's assume standard supabase snake_case.
            throw error;
        }

        // Group by vehicle_type_id
        const usage = {};
        data.forEach(ad => {
            if (!usage[ad.vehicle_type_id]) {
                usage[ad.vehicle_type_id] = 0;
            }
            usage[ad.vehicle_type_id]++;
        });

        return usage;
    } catch (error) {
        console.error('Error fetching user ad usage:', error);
        return {};
    }
};

export const getSubscriptionDetails = async (userId, packageId) => {
    try {
        const { data, error } = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('package_id', packageId)
            .eq('status', 'ACTIVE')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) return null; // Might be a new subscription not yet active or found
        return data;
    } catch (error) {
        return null;
    }
}

export const getPackageDetails = async (packageId) => {
    try {
        const { data: pkg, error: pkgError } = await supabase
            .from('price_items')
            .select('*')
            .eq('id', packageId)
            .single();

        if (pkgError) throw pkgError;

        // Get features
        const { data: features } = await supabase
            .from('package_features')
            .select('feature_key, feature_value')
            .eq('price_item_id', packageId);

        // Get limits
        const { data: limits } = await supabase
            .from('package_ad_limits')
            .select('*, vehicle_types(type_name)')
            .eq('package_id', packageId);

        return { ...pkg, features: features || [], limits: limits || [] };
    } catch (error) {
        console.error('Error fetching package details:', error);
        throw error;
    }
}
