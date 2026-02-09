import supabase from '../config/supabase.js';

// Add a Review
export const addReview = async (req, res) => {
    const { ad_id, rating, comment } = req.body;
    const user_id = req.user.id; // From auth middleware

    if (!ad_id || !rating) {
        return res.status(400).json({ success: false, message: "Ad ID and rating are required." });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, message: "Rating must be between 1 and 5." });
    }

    try {
        // Check if user already reviewed this ad
        const { data: existingReview, error: checkError } = await supabase
            .from('reviews')
            .select('id')
            .eq('ad_id', ad_id)
            .eq('user_id', user_id)
            .single();

        if (existingReview) {
            return res.status(400).json({ success: false, message: "You have already reviewed this ad." });
        }

        const { data, error } = await supabase
            .from('reviews')
            .insert([{
                ad_id,
                user_id,
                rating,
                comment,
                created_at: new Date()
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ success: true, message: "Review added successfully", data });
    } catch (error) {
        console.error("Error adding review:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Reviews by Ad ID
export const getReviewsByAdId = async (req, res) => {
    const { adId } = req.params;

    try {
        const { data, error } = await supabase
            .from('reviews')
            .select(`
                *,
                user:users(id, name, email) 
            `)
            .eq('ad_id', adId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error("Error fetching reviews:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Review Stats (Average Rating & Count)
export const getReviewStats = async (req, res) => {
    const { adId } = req.params;

    try {
        const { data, error } = await supabase
            .from('reviews')
            .select('rating')
            .eq('ad_id', adId);

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.json({ success: true, data: { averageRating: 0, totalReviews: 0 } });
        }

        const totalReviews = data.length;
        const sumRatings = data.reduce((acc, curr) => acc + curr.rating, 0);
        const averageRating = (sumRatings / totalReviews).toFixed(1);

        res.json({ success: true, data: { averageRating: parseFloat(averageRating), totalReviews } });
    } catch (error) {
        console.error("Error fetching review stats:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
