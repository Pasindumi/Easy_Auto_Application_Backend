import supabase from '../config/supabase.js';

/**
 * Get application-wide statistics for the "By the Numbers" section
 */
export const getAppStats = async (req, res) => {
    try {
        // 1. Active Listings
        const { count: listingsCount, error: listingsError } = await supabase
            .from('CarAd')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'ACTIVE');

        if (listingsError) throw listingsError;

        // 2. Dealers (Unique sellers with ads)
        const { data: allAds, error: adsError } = await supabase
            .from('CarAd')
            .select('seller_id');

        if (adsError) throw adsError;

        const uniqueSellers = new Set(allAds.map(ad => ad.seller_id).filter(Boolean));

        // 3. Total Users
        const { count: usersCount, error: usersError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        if (usersError) throw usersError;

        // 4. Average Rating (Combining App Reviews and Ad Reviews)
        const { data: appReviews } = await supabase.from('app_reviews').select('rating');
        const { data: adReviews } = await supabase.from('reviews').select('rating');

        const allRatings = [
            ...(appReviews || []).map(r => r.rating),
            ...(adReviews || []).map(r => r.rating)
        ].filter(r => r !== null && r !== undefined);

        const avgRating = allRatings.length > 0
            ? (allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length).toFixed(1)
            : null;

        res.json({
            success: true,
            data: {
                listings: listingsCount || 0,
                dealers: uniqueSellers.size,
                users: usersCount || 0,
                rating: avgRating,
                totalRatingsCount: allRatings.length
            }
        });
    } catch (error) {
        console.error('Error fetching app stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics',
            error: error.message
        });
    }
};
