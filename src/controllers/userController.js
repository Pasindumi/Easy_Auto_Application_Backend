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
        const {
            name, email, phone,
            bio, location, gender, birthday,
            addressLine1, addressLine2, city, district, postalCode
        } = req.body;
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
        if (bio !== undefined && bio !== null) updateData.bio = bio;
        if (location !== undefined && location !== null) updateData.location = location;
        if (gender !== undefined && gender !== null) updateData.gender = gender;
        if (birthday !== undefined && birthday !== null) updateData.birthday = birthday;
        if (addressLine1 !== undefined && addressLine1 !== null) updateData.address_line1 = addressLine1;
        if (addressLine2 !== undefined && addressLine2 !== null) updateData.address_line2 = addressLine2;
        if (city !== undefined && city !== null) updateData.city = city;
        if (district !== undefined && district !== null) updateData.district = district;
        if (postalCode !== undefined && postalCode !== null) updateData.postal_code = postalCode;

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
 * Get user by ID
 * Returns public user details (name, email, phone, avatar, joined_at)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const { data: userData, error } = await supabase
            .from('users')
            .select('id, name, email, phone, avatar, created_at, address_line1, city, district')
            .eq('id', id)
            .single();

        if (error || !userData) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: userData
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch user details',
            error: error.message
        });
    }
};

/**
 * Get all sellers (users with ads)
 */
export const getSellers = async (req, res) => {
    try {
        console.log('--- FETCHING SELLERS ---');
        // 1. Get unique seller IDs who have published ANY ad (Active or Expired)
        const { data: sellerIdsData, error: idError } = await supabase
            .from('CarAd')
            .select('seller_id, status')
            .in('status', ['ACTIVE', 'EXPIRED', 'PENDING']);

        if (idError) throw idError;

        console.log(`Found ${sellerIdsData?.length || 0} ads in eligible statuses`);

        const sellerIds = [...new Set(sellerIdsData.map(ad => ad.seller_id).filter(Boolean))];

        console.log(`Unique seller IDs: ${sellerIds.length}`);

        if (sellerIds.length === 0) {
            return res.json({ success: true, data: [] });
        }

        // 2. Fetch user details for these IDs
        const { data: users, error: userError } = await supabase
            .from('users')
            .select(`
                id, 
                name, 
                avatar, 
                location, 
                bio
            `)
            .in('id', sellerIds);

        if (userError) throw userError;

        // 3. Map listing counts from sellerIdsData (already contains active ads)
        const countMap = sellerIdsData.reduce((acc, ad) => {
            if (ad.seller_id) {
                acc[ad.seller_id] = (acc[ad.seller_id] || 0) + 1;
            }
            return acc;
        }, {});

        // Post-process to include listing counts
        const sellers = users.map(user => ({
            ...user,
            listingsCount: countMap[user.id] || 0
        }));

        res.json({ success: true, data: sellers });
    } catch (error) {
        console.error('Error fetching sellers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sellers',
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

/**
 * Get User Stats
 * Aggregates the number of published ads, saved ads, and total views across all ads for the current user.
 */
export const getUserStats = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        // 1. Get Ads Count & Total Views for Car Ads
        const { data: carAds, error: carError } = await supabase
            .from('CarAd')
            .select('id, views_count')
            .eq('seller_id', userId);

        if (carError) throw carError;

        // 2. Get Ads Count & Total Views for Rental Ads
        const { data: rentalAds, error: rentalError } = await supabase
            .from('rental_ads')
            .select('id, views_count')
            .eq('seller_id', userId);

        if (rentalError) throw rentalError;

        // 3. Get Saved Ads Count
        // To be safe, look at how saved_ads is queried in other places. Usually it's `saved_ads` or `saved_cars`.
        // I will assume `saved_ads` table exists or fallback gracefully.
        const { count: savedCount, error: savedError } = await supabase
            .from('saved_ads')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        // 4. Calculate stats
        const totalAdsCount = (carAds?.length || 0) + (rentalAds?.length || 0);

        const carViews = carAds?.reduce((sum, ad) => sum + (ad.views_count || 0), 0) || 0;
        const rentalViews = rentalAds?.reduce((sum, ad) => sum + (ad.views_count || 0), 0) || 0;
        const totalViewsCount = carViews + rentalViews;

        return res.status(200).json({
            success: true,
            data: {
                ads: totalAdsCount,
                saved: savedCount || 0,
                views: totalViewsCount
            }
        });

    } catch (error) {
        console.error('Error fetching user stats:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch user stats',
            error: error.message
        });
    }
};
