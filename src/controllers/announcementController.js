import supabase from '../config/supabase.js';

export const getAnnouncements = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, error: 'Announcement not found' });

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getActiveAnnouncements = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .eq('status', 'ACTIVE')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createAnnouncement = async (req, res) => {
    try {
        let { title, content, link, status } = req.body;
        const file = req.file;

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        let imageUrl = null;
        if (file) {
            try {
                const { uploadFileToS3 } = await import('../utils/s3Service.js');
                imageUrl = await uploadFileToS3(file.buffer, file.originalname, file.mimetype, 'announcements');
            } catch (err) {
                console.error("S3 Upload Error for Announcement:", err);
            }
        }

        const { data, error } = await supabase
            .from('announcements')
            .insert([{
                title,
                content,
                link,
                status: status || 'ACTIVE',
                image_url: imageUrl
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ success: true, data });
    } catch (error) {
        console.error('Create Announcement Exception:', error);
        res.status(500).json({ error: error.message });
    }
};

export const updateAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        let { title, content, link, status } = req.body;
        const file = req.file;

        const updateData = {
            title,
            content,
            link,
            status
        };

        if (file) {
            try {
                const { uploadFileToS3 } = await import('../utils/s3Service.js');
                const imageUrl = await uploadFileToS3(file.buffer, file.originalname, file.mimetype, 'announcements');
                updateData.image_url = imageUrl;
            } catch (err) {
                console.error("S3 Upload Error for Announcement Update:", err);
            }
        }

        const { data, error } = await supabase
            .from('announcements')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({ message: 'Announcement updated successfully', data });
    } catch (error) {
        console.error('Update Announcement Exception:', error);
        res.status(500).json({ error: error.message });
    }
};

export const deleteAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('announcements')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Announcement deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
