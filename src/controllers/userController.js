import supabase from '../config/supabase.js';

/**
 * User Controller
 * Handles user management operations: get user details, update user details, delete user
 */

/**
 * Update user details
 * Updates user profile information and other modifiable fields
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateUserDetails = async (req, res) => {
    try {
        const userId = req.params.id || req.user?.id;
        const { name, email, phone, profileImage, address, city, state, zipCode, country, bio } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Build update object with only provided fields
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (profileImage !== undefined) updateData.profile_image = profileImage;
        if (address !== undefined) updateData.address = address;
        if (city !== undefined) updateData.city = city;
        if (state !== undefined) updateData.state = state;
        if (zipCode !== undefined) updateData.zip_code = zipCode;
        if (country !== undefined) updateData.country = country;
        if (bio !== undefined) updateData.bio = bio;

        // Add updated_at timestamp
        updateData.updated_at = new Date().toISOString();

        if (Object.keys(updateData).length === 1 && updateData.updated_at) {
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
            if (updateError.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            throw updateError;
        }

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
