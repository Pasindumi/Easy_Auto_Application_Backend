import supabase from '../config/supabase.js';

// Add a Review for the App
export const addAppReview = async (req, res) => {
    const { rating, comment } = req.body;
    const user_id = req.user.id; // From auth middleware

    if (!rating) {
        return res.status(400).json({ success: false, message: "Rating is required." });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, message: "Rating must be between 1 and 5." });
    }

    try {
        // Check if user already reviewed the app
        const { data: existingReview, error: checkError } = await supabase
            .from('app_reviews')
            .select('id')
            .eq('user_id', user_id)
            .single();

        if (existingReview) {
            return res.status(400).json({ success: false, message: "You have already reviewed the app." });
        }

        const { data, error } = await supabase
            .from('app_reviews')
            .insert([{
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
        console.error("Error adding app review:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get All App Reviews (Public or Admin)
export const getAppReviews = async (req, res) => {
    try {
        let query = supabase
            .from('app_reviews')
            .select(`
                *,
                user:users(id, name, email) 
            `)
            .order('created_at', { ascending: false });

        // Optional: Filter by rating if query param exists
        if (req.query.rating) {
            query = query.eq('rating', req.query.rating);
        }

        // Optional: Filter by status (e.g. valid reviews only)
        // query = query.eq('status', 'APPROVED'); 

        const { data, error } = await query;

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error("Error fetching app reviews:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get App Review Stats
export const getAppReviewStats = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('app_reviews')
            .select('rating');

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.json({ success: true, data: { averageRating: 0, totalReviews: 0, breakdown: {} } });
        }

        const totalReviews = data.length;
        const sumRatings = data.reduce((acc, curr) => acc + curr.rating, 0);
        const averageRating = (sumRatings / totalReviews).toFixed(1);

        // Rating Breakdown (5 star, 4 star...)
        const breakdown = data.reduce((acc, curr) => {
            acc[curr.rating] = (acc[curr.rating] || 0) + 1;
            return acc;
        }, {});

        res.json({ success: true, data: { averageRating: parseFloat(averageRating), totalReviews, breakdown } });
    } catch (error) {
        console.error("Error fetching app review stats:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Reply to a Review
export const replyToAppReview = async (req, res) => {
    const { reviewId } = req.params;
    const { reply } = req.body;

    if (!reply) {
        return res.status(400).json({ success: false, message: "Reply content is required." });
    }

    try {
        const { data, error } = await supabase
            .from('app_reviews')
            .update({ reply, reply_at: new Date() })
            .eq('id', reviewId)
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, message: "Reply added successfully", data });
    } catch (error) {
        console.error("Error replying to review:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin/User: Delete Review
// Admin/User: Delete Review
export const deleteAppReview = async (req, res) => {
    const { reviewId } = req.params;
    const user = req.user;

    try {
        const { data: review, error: fetchError } = await supabase
            .from('app_reviews')
            .select('user_id')
            .eq('id', reviewId)
            .single();

        if (fetchError || !review) {
            return res.status(404).json({ success: false, message: "Review not found." });
        }

        // Check permissions
        // user.isAdmin comes from protectAdmin middleware
        // user.id matching review.user_id comes from protect middleware
        const isAdmin = user.isAdmin || (user.role && ['ADMIN', 'SUPER_ADMIN'].includes(user.role));
        const isOwner = review.user_id === user.id;

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ success: false, message: "Not authorized to delete this review." });
        }

        const { error } = await supabase
            .from('app_reviews')
            .delete()
            .eq('id', reviewId);

        if (error) throw error;

        res.json({ success: true, message: "Review deleted successfully" });
    } catch (error) {
        console.error("Error deleting review:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
