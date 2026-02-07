import supabase from '../config/supabase.js';

/**
 * Create a new ad report
 */
export const createReport = async (req, res) => {
    const { ad_id, reason } = req.body;
    const reporter_id = req.user.id;

    if (!ad_id || !reason) {
        return res.status(400).json({ success: false, message: "Ad ID and reason are required" });
    }

    try {
        const { data, error } = await supabase
            .from('ad_reports')
            .insert([
                { ad_id, reporter_id, reason }
            ])
            .select();

        if (error) throw error;

        res.status(201).json({ success: true, data: data[0], message: "Report submitted successfully" });
    } catch (error) {
        console.error("Error creating report:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get all reports (Admin only)
 */
export const getReports = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('ad_reports')
            .select(`
                *,
                reporter:users!reporter_id(name, email),
                ad:CarAd!ad_id(title, status)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error("Error fetching reports:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update report status (Admin only)
 */
export const updateReportStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['PENDING', 'REVIEWED', 'RESOLVED'].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
    }

    try {
        const { data, error } = await supabase
            .from('ad_reports')
            .update({ status })
            .eq('id', id)
            .select();

        if (error) throw error;

        res.json({ success: true, data: data[0], message: "Report status updated" });
    } catch (error) {
        console.error("Error updating report status:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
