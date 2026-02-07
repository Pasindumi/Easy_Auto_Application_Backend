import supabase from '../config/supabase.js';

/**
 * Create a new complaint (User)
 */
export const createComplaint = async (req, res) => {
    const { category, message } = req.body;
    const user_id = req.user.id;

    if (!category || !message) {
        return res.status(400).json({ success: false, message: "Category and message are required" });
    }

    try {
        const { data, error } = await supabase
            .from('complaints')
            .insert([
                { user_id, category, message }
            ])
            .select();

        if (error) throw error;

        res.status(201).json({ success: true, data: data[0], message: "Complaint submitted successfully" });
    } catch (error) {
        console.error("Error creating complaint:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get all complaints (Admin only)
 */
export const getComplaints = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('complaints')
            .select(`
                *,
                user:users!user_id(name, email)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error("Error fetching complaints:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update complaint status (Admin only)
 */
export const updateComplaintStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['PENDING', 'REVIEWED', 'RESOLVED'].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
    }

    try {
        const { data, error } = await supabase
            .from('complaints')
            .update({ status, updated_at: new Date() })
            .eq('id', id)
            .select();

        if (error) throw error;

        res.json({ success: true, data: data[0], message: "Complaint status updated" });
    } catch (error) {
        console.error("Error updating complaint status:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
