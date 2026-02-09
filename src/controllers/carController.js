import supabase from '../config/supabase.js';
import { uploadFileToS3 } from '../utils/s3Service.js';

// Create a new Car Ad
export const createAd = async (req, res) => {
    const {
        seller_id,
        title,
        price,
        location,
        description,

        // Static Car Details
        condition,
        brand,
        model,
        year,
        mileage,
        engineCapacity,
        fuelType,
        transmission,
        bodyType,

        // New Dynamic Fields
        vehicle_type_id,
        dynamicAttributes, // Array of { attribute_id: uuid, value: any } or JSON string

        // Images - Fallback for JSON if no files
        images,
    } = req.body;

    const files = req.files || [];

    // --- Robust Sanitization for DB Constraints ---
    const toSafeUUID = (val) => (!val || val === "" || val === "undefined") ? null : val;
    const toSafeNumeric = (val) => (!val || val === "" || val === "undefined") ? null : (isNaN(val) ? 0 : parseFloat(val));
    const toSafeInt = (val) => (!val || val === "" || val === "undefined") ? null : (isNaN(val) ? 0 : parseInt(val));
    const toSafeBool = (val) => val === true || val === 'true';

    const safePrice = toSafeNumeric(price);
    const safeVehicleTypeId = toSafeUUID(vehicle_type_id);
    const safeYear = toSafeInt(year);
    const safeMileage = toSafeInt(mileage);
    const safeEngineCapacity = toSafeNumeric(engineCapacity);

    // Mapped fields
    try {
        // Fetch vehicle type info to get expiry_days
        const { data: vTypeData } = await supabase
            .from('vehicle_types')
            .select('expiry_days')
            .eq('id', safeVehicleTypeId)
            .single();

        const expiryDays = vTypeData?.expiry_days || 30;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiryDays);

        // 1. Create CarAd record
        const { data: adData, error: adError } = await supabase
            .from("CarAd")
            .insert([
                {
                    seller_id,
                    vehicle_type_id: safeVehicleTypeId,
                    title,
                    price: safePrice,
                    location,
                    description,
                    status: "DRAFT", // Default to DRAFT or PENDING_APPROVAL
                    expiry_date: expiryDate,
                },
            ])

            .select()
            .single();

        if (adError) throw adError;

        const adId = adData.id;

        // 2. Create Static CarDetails record (Legacy/Standard support)
        const { error: detailsError } = await supabase.from("CarDetails").insert([
            {
                ad_id: adId,
                condition,
                brand,
                model,
                year: safeYear,
                mileage: safeMileage,
                engine_capacity: safeEngineCapacity,
                fuel_type: fuelType,
                transmission,
                body_type: bodyType,
            },
        ]);

        if (detailsError) {
            await supabase.from("CarAd").delete().eq("id", adId);
            throw detailsError;
        }

        // 3. Insert Dynamic Attributes
        let parsedAttributes = dynamicAttributes;
        if (typeof dynamicAttributes === 'string') {
            try { parsedAttributes = JSON.parse(dynamicAttributes); } catch (e) { parsedAttributes = []; }
        }

        if (parsedAttributes && parsedAttributes.length > 0) {
            const attrRecords = parsedAttributes.map(attr => ({
                ad_id: adId,
                attribute_id: attr.attribute_id || attr.id, // Fallback
                value: String(attr.value)
            }));

            const validAttrRecords = attrRecords.filter(r => r.attribute_id);

            if (validAttrRecords.length > 0) {
                const { error: attrError } = await supabase
                    .from('car_details_attribute_values')
                    .insert(validAttrRecords);

                if (attrError) console.error("Dynamic Attributes Error:", attrError);
            }
        }

        // 4. Handle Images (S3 or JSON fallback)
        let uploadedUrls = [];
        if (files && files.length > 0) {
            const uploadPromises = files.map(file =>
                uploadFileToS3(file.buffer, file.originalname, file.mimetype)
            );
            uploadedUrls = await Promise.all(uploadPromises);
        }

        let existingUrls = [];
        if (images) {
            if (typeof images === 'string' && images.startsWith('[')) {
                try { existingUrls = JSON.parse(images); } catch (e) { existingUrls = [images]; }
            } else {
                existingUrls = Array.isArray(images) ? images : [images];
            }
        }

        const finalImageUrls = [...existingUrls, ...uploadedUrls];

        if (finalImageUrls.length > 0) {
            const imageRecords = finalImageUrls.map((url, index) => ({
                ad_id: adId,
                image_url: url,
                is_primary: index === 0
            }));

            const { error: imgError } = await supabase
                .from("AdImage")
                .insert(imageRecords);

            if (imgError) console.error("Image Insert Error:", imgError);
        }

        res.status(201).json({
            success: true,
            message: "Car ad created successfully!",
            data: adData,
        });
    } catch (error) {
        console.error("Error creating ad:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update Ad
export const updateAd = async (req, res) => {
    const { id: adId } = req.params;
    const {
        title,
        price,
        location,
        description,
        status,
        negotiable,

        // Static Car Details
        condition,
        brand,
        model,
        year,
        mileage,
        engineCapacity,
        fuelType,
        transmission,
        bodyType,

        // New Dynamic Fields
        vehicle_type_id,
        dynamicAttributes,

        // Images
        images,
    } = req.body;

    const files = req.files || [];

    // --- Sanitization ---
    const toSafeUUID = (val) => (!val || val === "" || val === "undefined") ? null : val;
    const toSafeNumeric = (val) => (!val || val === "" || val === "undefined") ? null : (isNaN(val) ? 0 : parseFloat(val));
    const toSafeBool = (val) => val === true || val === 'true';

    try {
        // 1. Prepare CarAd updates
        const adUpdates = {};
        if (title !== undefined) adUpdates.title = title;
        if (price !== undefined) adUpdates.price = toSafeNumeric(price);
        if (location !== undefined) adUpdates.location = location;
        if (description !== undefined) adUpdates.description = description;
        if (status !== undefined) adUpdates.status = status;
        if (vehicle_type_id !== undefined) adUpdates.vehicle_type_id = toSafeUUID(vehicle_type_id);

        let adData = null;
        if (Object.keys(adUpdates).length > 0) {
            const { data, error: adError } = await supabase
                .from("CarAd")
                .update(adUpdates)
                .eq("id", adId)
                .select()
                .single();
            if (adError) throw adError;
            adData = data;
        }

        // 2. Prepare/Update CarDetails record
        const detailsUpdates = {};
        if (condition !== undefined) detailsUpdates.condition = condition;
        if (brand !== undefined) detailsUpdates.brand = brand;
        if (model !== undefined) detailsUpdates.model = model;
        if (year !== undefined) detailsUpdates.year = toSafeNumeric(year);
        if (mileage !== undefined) detailsUpdates.mileage = toSafeNumeric(mileage);
        if (engineCapacity !== undefined) detailsUpdates.engine_capacity = toSafeNumeric(engineCapacity);
        if (fuelType !== undefined) detailsUpdates.fuel_type = fuelType;
        if (transmission !== undefined) detailsUpdates.transmission = transmission;
        if (bodyType !== undefined) detailsUpdates.body_type = bodyType;

        if (Object.keys(detailsUpdates).length > 0) {
            // Try updating first
            const { data: existingDetails, error: checkError } = await supabase
                .from("CarDetails")
                .select("id")
                .eq("ad_id", adId)
                .single();

            if (existingDetails) {
                const { error: updateError } = await supabase
                    .from("CarDetails")
                    .update(detailsUpdates)
                    .eq("ad_id", adId);

                if (updateError) throw updateError;
            } else {
                // If not found, insert
                const { error: insertError } = await supabase
                    .from("CarDetails")
                    .insert({
                        ad_id: adId,
                        ...detailsUpdates
                    });

                if (insertError) throw insertError;
            }
        }

        // 3. Update Dynamic Attributes
        if (dynamicAttributes !== undefined) {
            await supabase.from('car_details_attribute_values').delete().eq('ad_id', adId);

            let parsedAttributes = dynamicAttributes;
            if (typeof dynamicAttributes === 'string') {
                try { parsedAttributes = JSON.parse(dynamicAttributes); } catch (e) { parsedAttributes = []; }
            }

            if (parsedAttributes && parsedAttributes.length > 0) {
                console.log("Updating Attributes:", JSON.stringify(parsedAttributes));
                const attrRecords = parsedAttributes.map(attr => ({
                    ad_id: adId,
                    attribute_id: attr.attribute_id || attr.id, // Fallback
                    value: String(attr.value)
                }));

                const validAttrRecords = attrRecords.filter(r => r.attribute_id);

                if (validAttrRecords.length > 0) {
                    const { error: attrError } = await supabase
                        .from('car_details_attribute_values')
                        .insert(validAttrRecords);

                    if (attrError) console.error("Error updating attributes:", attrError);
                }
            }
        }

        // 4. Update Images
        if ((files && files.length > 0) || images !== undefined) {
            await supabase.from("AdImage").delete().eq("ad_id", adId);

            let uploadedUrls = [];
            if (files && files.length > 0) {
                const uploadPromises = files.map(file =>
                    uploadFileToS3(file.buffer, file.originalname, file.mimetype)
                );
                uploadedUrls = await Promise.all(uploadPromises);
            }

            let existingUrls = [];
            if (images) {
                if (typeof images === 'string' && images.startsWith('[')) {
                    try { existingUrls = JSON.parse(images); } catch (e) { existingUrls = [images]; }
                } else {
                    existingUrls = Array.isArray(images) ? images : [images];
                }
            }

            const finalImageUrls = [...existingUrls, ...uploadedUrls];

            if (finalImageUrls.length > 0) {
                const imageRecords = finalImageUrls.map((url, index) => ({
                    ad_id: adId,
                    image_url: url,
                    is_primary: index === 0,
                }));

                const { error: imgError } = await supabase
                    .from("AdImage")
                    .insert(imageRecords);

                if (imgError) console.error("Error updating images:", imgError);
            }
        }

        if (!adData) {
            const { data: currentAd } = await supabase.from('CarAd').select('*').eq('id', adId).single();
            adData = currentAd;
        }

        res.json({ success: true, data: adData });
    } catch (error) {
        console.error("Error updating ad:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all ads (Public)
export const getAds = async (req, res) => {
    const { page, limit, brand, model, minPrice, maxPrice, vehicleTypeId, location, search, isHomepageBanner, isPopupPromotion } = req.query;
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const start = (pageInt - 1) * limitInt;
    const end = start + limitInt - 1;

    try {
        let queryBuilder = supabase
            .from("CarAd")
            .select(`
                *,
                CarDetails!inner(*),
                AdImage(*)
            `, { count: 'exact' })
            .eq("status", "ACTIVE");

        if (minPrice) queryBuilder = queryBuilder.gte("price", minPrice);
        if (maxPrice) queryBuilder = queryBuilder.lte("price", maxPrice);
        if (vehicleTypeId) queryBuilder = queryBuilder.eq('vehicle_type_id', vehicleTypeId);
        if (brand) queryBuilder = queryBuilder.eq('CarDetails.brand', brand);
        if (model) queryBuilder = queryBuilder.eq('CarDetails.model', model);

        if (location) {
            queryBuilder = queryBuilder.ilike('location', `%${location}%`);
        }

        if (search) {
            // Complex search: title OR brand OR model
            queryBuilder = queryBuilder.ilike('title', `%${search}%`);
        }

        if (isHomepageBanner === 'true') {
            queryBuilder = queryBuilder.eq('is_homepage_banner', true);
        }

        if (isPopupPromotion === 'true') {
            queryBuilder = queryBuilder.eq('is_popup_promotion', true);
        }

        // Apply pagination and boost sorting
        queryBuilder = queryBuilder
            .range(start, end)
            .order('is_featured', { ascending: false })
            .order('created_at', { ascending: false });

        const { data, count, error } = await queryBuilder;

        if (error) {
            // Definitive check for range/bounds issues
            const isRangeError = error.code === 'PGRST103' ||
                (error.message && typeof error.message === 'string' && error.message.includes('out of bounds'));

            if (isRangeError) {
                return res.status(200).json({
                    success: true,
                    data: [],
                    pagination: {
                        total: count || 0,
                        page: pageInt,
                        pages: Math.ceil((count || 0) / limitInt) || 0,
                    },
                    message: "No results for the requested range"
                });
            }

            throw error;
        }

        res.json({
            success: true,
            data,
            pagination: {
                total: count,
                page: pageInt,
                pages: Math.ceil(count / limitInt),
            },
        });
    } catch (error) {
        console.error("AD FETCH ERROR:", error);

        let errorMessage = "Unknown database error";
        if (error) {
            if (typeof error === 'string') errorMessage = error;
            else if (error.message) errorMessage = error.message;
        }

        // Handle Supabase error object strings
        if (typeof errorMessage === 'string' && errorMessage.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(errorMessage);
                errorMessage = parsed.message || parsed.error || errorMessage;
            } catch (e) {
                // Not valid JSON
            }
        }

        // Final fallback for missing range error handling in older clients
        if (errorMessage.includes('out of bounds') || errorMessage === '{"') {
            return res.status(200).json({
                success: true,
                data: [],
                pagination: { total: 0, page: pageInt, pages: 0 },
                message: "Range error handled in catch"
            });
        }

        res.status(500).json({
            success: false,
            message: errorMessage,
            error: error.code || 'DATABASE_ERROR',
            details: error.details || error.hint || null
        });
    }
};

// Get Single Ad Details
export const getAdById = async (req, res) => {
    const { id } = req.params;

    try {
        const { data: adData, error: adError } = await supabase
            .from("CarAd")
            .select(`
        *,
        CarDetails(*),
        AdImage(*),
        vehicle_type:vehicle_types(*),
        attributes:car_details_attribute_values(
            attribute_id,
            value,
            attribute:vehicle_attributes(attribute_name, unit, data_type)
        ),
        active_boosts:ad_boosts(
            id,
            start_date,
            end_date,
            status,
            package:price_items(name)
        )
      `)
            .eq("id", id)
            .eq("active_boosts.status", "ACTIVE")
            .single();

        if (adError) throw adError;

        if (!adData) {
            return res.status(404).json({ success: false, message: "Ad not found" });
        }

        // Filter active_boosts to only include currently active ones (since eq filter on relationship might not be enough depending on Supabase version/config)
        const now = new Date();
        const currentBoosts = (adData.active_boosts || []).filter((b) =>
            b.status === 'ACTIVE' && new Date(b.end_date) > now
        );

        // --- Manual Fix for Missing Attribute Relations ---
        if (adData.attributes && adData.attributes.length > 0) {
            const missingAttrIds = adData.attributes
                .filter(a => !a.attribute && a.attribute_id)
                .map(a => a.attribute_id);

            console.log("Ad ID:", id, "Missing Attr IDs:", missingAttrIds);

            if (missingAttrIds.length > 0) {
                const uniqueIds = [...new Set(missingAttrIds)];
                const { data: attrInfo, error: attrError } = await supabase
                    .from('vehicle_attributes')
                    .select('id, attribute_name, unit, data_type')
                    .in('id', uniqueIds);

                if (attrError) console.error("Error fetching manual attributes:", attrError);
                if (!attrError && attrInfo) {
                    const attrMap = attrInfo.reduce((acc, item) => {
                        acc[item.id] = item;
                        return acc;
                    }, {});

                    // Attach manual data
                    adData.attributes.forEach(a => {
                        if (!a.attribute && a.attribute_id) {
                            a.attribute = attrMap[a.attribute_id] || null;
                        }
                    });
                }
            }
        }

        console.log("Final Ad Data Attributes:", JSON.stringify(adData.attributes, null, 2));

        // Fetch seller details separately
        let sellerDetails = null;
        if (adData.seller_id) {
            const { data: userData, error: userError } = await supabase
                .from("users")
                .select("id, name, email, phone")
                .eq("id", adData.seller_id)
                .single();

            if (!userError) {
                sellerDetails = userData;
            }
        }

        // Increment view count
        const newCount = (adData.views_count || 0) + 1;
        await supabase.from("CarAd").update({ views_count: newCount }).eq('id', id);

        const responseData = {
            ...adData,
            users: sellerDetails,
            active_boosts: currentBoosts
        };

        res.json({ success: true, data: responseData });
    } catch (error) {
        console.error("Error fetching ad:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get My Ads (Authenticated User)
export const getMyAds = async (req, res) => {
    const userId = req.user.id; // Assumes protect middleware sets req.user
    const { status } = req.query; // Optional filter: ?status=ACTIVE

    try {
        let query = supabase
            .from("CarAd")
            .select(`
                *,
                CarDetails(*),
                AdImage(*),
                vehicle_type:vehicle_types(type_name),
                attributes:car_details_attribute_values(
                    attribute_id,
                    value,
                    attribute:vehicle_attributes(attribute_name, unit, data_type)
                )
            `)
            .eq("seller_id", userId)
            .order('created_at', { ascending: false });

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) throw error;

        // --- Manual Fix for Missing Attribute Relations (MyAds) ---
        if (data && data.length > 0) {
            let missingAttrIds = [];
            data.forEach(ad => {
                if (ad.attributes && ad.attributes.length > 0) {
                    ad.attributes.forEach(a => {
                        if (!a.attribute && a.attribute_id) {
                            missingAttrIds.push(a.attribute_id);
                        }
                    });
                }
            });

            if (missingAttrIds.length > 0) {
                const uniqueIds = [...new Set(missingAttrIds)];
                const { data: attrInfo, error: attrError } = await supabase
                    .from('vehicle_attributes')
                    .select('id, attribute_name, unit, data_type')
                    .in('id', uniqueIds);

                if (!attrError && attrInfo) {
                    const attrMap = attrInfo.reduce((acc, item) => {
                        acc[item.id] = item;
                        return acc;
                    }, {});

                    data.forEach(ad => {
                        if (ad.attributes) {
                            ad.attributes.forEach(a => {
                                if (!a.attribute && a.attribute_id) {
                                    a.attribute = attrMap[a.attribute_id] || null;
                                }
                            });
                        }
                    });
                }
            }
        }

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Error fetching my ads:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- ADMIN FUNCTIONS ---

// Admin: Get All Ads (with filters for Status)
export const adminGetAds = async (req, res) => {
    const { page = 1, limit = 20, status, search } = req.query;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    try {
        let query = supabase
            .from("CarAd")
            .select(`
                *,
                vehicle_type:vehicle_types(type_name),
                CarDetails(*),
                AdImage(*),
                attributes:car_details_attribute_values(
                    attribute_id,
                    value,
                    attribute:vehicle_attributes(attribute_name, unit, data_type)
                ),
                active_boosts:ad_boosts(
                    id,
                    start_date,
                    end_date,
                    status,
                    package:price_items(name)
                )
            `, { count: 'exact' })
            .range(start, end)
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        if (search) {
            query = query.ilike('title', `%${search}%`);
        }

        const { data, count, error } = await query;

        if (error) throw error;

        // --- Post-processing: Filter Active Boosts and Manual Fix for Missing Attribute Relations ---
        const now = new Date();
        if (data && data.length > 0) {
            let missingAttrIds = [];
            data.forEach(ad => {
                // Filter active_boosts to only include currently active ones
                ad.active_boosts = (ad.active_boosts || []).filter(b =>
                    b.status === 'ACTIVE' && new Date(b.end_date) > now
                );

                if (ad.attributes && ad.attributes.length > 0) {
                    ad.attributes.forEach(a => {
                        if (!a.attribute && a.attribute_id) {
                            missingAttrIds.push(a.attribute_id);
                        }
                    });
                }
            });

            console.log("AdminGetAds Missing IDs:", missingAttrIds);

            if (missingAttrIds.length > 0) {
                const uniqueIds = [...new Set(missingAttrIds)];
                const { data: attrInfo, error: attrError } = await supabase
                    .from('vehicle_attributes')
                    .select('id, attribute_name, unit, data_type')
                    .in('id', uniqueIds);

                if (attrError) console.error("Admin Manual Fetch Error:", attrError);

                if (!attrError && attrInfo) {
                    const attrMap = attrInfo.reduce((acc, item) => {
                        acc[item.id] = item;
                        return acc;
                    }, {});

                    data.forEach(ad => {
                        if (ad.attributes) {
                            ad.attributes.forEach(a => {
                                if (!a.attribute && a.attribute_id) {
                                    a.attribute = attrMap[a.attribute_id] || null;
                                }
                            });
                        }
                    });
                }
            }
        }

        // Fetch seller details separately to avoid join issues
        const sellerIds = [...new Set(data.map(ad => ad.seller_id).filter(Boolean))];
        if (sellerIds.length > 0) {
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('id, name, email')
                .in('id', sellerIds);

            if (!usersError && usersData) {
                const userMap = usersData.reduce((acc, user) => {
                    acc[user.id] = user;
                    return acc;
                }, {});

                data.forEach(ad => {
                    ad.seller = userMap[ad.seller_id] || null;
                });
            }
        }

        res.json({
            success: true,
            data,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit),
            },
        });

    } catch (error) {
        console.error("Error in adminGetAds:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Update Ad Status (Approve, Reject, Expire)
export const adminUpdateAdStatus = async (req, res) => {
    const { id } = req.params;
    // status: 'ACTIVE', 'REJECTED' (if added to enum), 'EXPIRED', 'PENDING'
    const { status, is_featured, expiry_date } = req.body;

    try {
        const updates = {};
        if (status) updates.status = status;
        if (typeof is_featured !== 'undefined') updates.is_featured = is_featured;
        if (expiry_date) updates.expiry_date = expiry_date;

        const { data, error } = await supabase
            .from("CarAd")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete Ad
export const deleteAd = async (req, res) => {
    const { id: adId } = req.params;
    const userId = req.user.id; // From protect middleware

    try {
        // 1. Check if ad exists and belongs to the user
        const { data: ad, error: fetchError } = await supabase
            .from("CarAd")
            .select("id, seller_id")
            .eq("id", adId)
            .single();

        if (fetchError || !ad) {
            return res.status(404).json({ success: false, message: "Ad not found" });
        }

        if (ad.seller_id !== userId) {
            return res.status(403).json({ success: false, message: "You are not authorized to delete this ad" });
        }

        // 2. Delete related data (Cascade delete should ideally handle this in DB, but manual cleanup ensures it)
        // AdImage, CarDetails, car_details_attribute_values, ad_boosts, etc.

        // Delete Attributes
        await supabase.from("car_details_attribute_values").delete().eq("ad_id", adId);

        // Delete Details
        await supabase.from("CarDetails").delete().eq("ad_id", adId);

        // Delete Images
        await supabase.from("AdImage").delete().eq("ad_id", adId);

        // Delete Boosts (if any)
        await supabase.from("ad_boosts").delete().eq("ad_id", adId);

        // 3. Finally delete the CarAd record
        const { error: deleteError } = await supabase
            .from("CarAd")
            .delete()
            .eq("id", adId);

        if (deleteError) throw deleteError;

        res.json({ success: true, message: "Ad deleted successfully" });
    } catch (error) {
        console.error("Error deleting ad:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
