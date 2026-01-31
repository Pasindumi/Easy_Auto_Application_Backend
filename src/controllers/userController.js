import supabase from '../config/supabase.js';
import { uploadFileToS3 } from '../utils/s3Service.js';

/**
 * User Controller
 * Handles user management operations: get user details, update user details, delete user
 */

/**
 * Update user details
 * Updates user profile information and profile picture via S3
 * @param {Object} req - Express request object (supports multipart/form-data for file uploads)
 * @param {Object} res - Express response object
 */
export const updateUserDetails = async (req, res) => {
    try {
        const userId = req.params.id || req.user?.id;
        const { name, email, phone } = req.body;
        const files = req.files || [];
        
        console.log('Files received:', files.map(f => ({ fieldname: f.fieldname, size: f.size })));
        
        const profileImageFile = files.find(f => f.fieldname === 'avatar' || f.fieldname === 'profileImage');
        
        console.log('Profile image file found:', !!profileImageFile);

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Build update object with only provided fields
        const updateData = {};
        if (name !== undefined && name !== null) updateData.name = name;
        if (email !== undefined && email !== null) updateData.email = email;
        if (phone !== undefined && phone !== null) updateData.phone = phone;

        // Handle profile picture upload to S3
        if (profileImageFile) {
            try {
                console.log('Uploading profile image to S3...');
                const profileImageUrl = await uploadFileToS3(
                    profileImageFile.buffer,
                    profileImageFile.originalname,
                    profileImageFile.mimetype
                );
                console.log('S3 URL:', profileImageUrl);
                updateData.avatar = profileImageUrl;
            } catch (uploadError) {
                console.error('S3 Upload Error:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to upload profile picture',
                    error: uploadError.message
                });
            }
        }

        console.log('Update data:', updateData);

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update provided'
            });
        }

        // Update user in database
        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId)
            .select()
            .single();

        if (updateError) {
            console.error('Database update error:', updateError);
            if (updateError.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            throw updateError;
        }

        console.log('User updated successfully:', updatedUser);

        return res.status(200).json({
            success: true,
            message: 'User details updated successfully',
            data: updatedUser
        });
    } catch (error) {
        console.error('Error updating user details:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update user details',
            error: error.message
        });
    }
};

/**
 * Delete user
 * Permanently deletes a user account and associated data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id || req.user?.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Check if user exists
        const { data: userData, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .single();

        if (checkError || !userData) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Delete user from database
        const { error: deleteError } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);

        if (deleteError) {
            throw deleteError;
        }

        return res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete user',
            error: error.message
        });
    }
};
