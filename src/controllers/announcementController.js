import supabase from '../config/supabase.js';

/**
 * Get active announcements
 * Returns a list of current news and updates
 */
export const getActiveAnnouncements = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            // Handle table not existing gracefully
            if (error.code === '42P01') {
                console.warn('Announcements table does not exist yet.');
                return res.json({ success: true, data: [] });
            }
            throw error;
        }

        res.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Fetch active announcements error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get all announcements (Admin)
 */
export const getAnnouncements = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Fetch announcements error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Create an announcement
 */
export const createAnnouncement = async (req, res) => {
    const { title, content, image_url, link, is_active } = req.body;
    try {
        const { data, error } = await supabase
            .from('announcements')
            .insert([{ title, content, image_url, link, is_active: is_active ?? true }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ success: true, data });
    } catch (error) {
        console.error('Create announcement error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update an announcement
 */
export const updateAnnouncement = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    try {
        const { data, error } = await supabase
            .from('announcements')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Update announcement error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Delete an announcement
 */
export const deleteAnnouncement = async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('announcements')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, message: 'Announcement deleted successfully' });
    } catch (error) {
        console.error('Delete announcement error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
