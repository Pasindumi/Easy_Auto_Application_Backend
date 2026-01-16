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
                    expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days expiry
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
                attribute_id: attr.attribute_id,
                value: String(attr.value)
            }));

            const { error: attrError } = await supabase
                .from('car_details_attribute_values')
                .insert(attrRecords);

            if (attrError) console.error("Dynamic Attributes Error:", attrError);
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
        if (year !== undefined) detailsUpdates.year = toSafeInt(year);
        if (mileage !== undefined) detailsUpdates.mileage = toSafeInt(mileage);
        if (engineCapacity !== undefined) detailsUpdates.engine_capacity = toSafeNumeric(engineCapacity);
        if (fuelType !== undefined) detailsUpdates.fuel_type = fuelType;
        if (transmission !== undefined) detailsUpdates.transmission = transmission;
        if (bodyType !== undefined) detailsUpdates.body_type = bodyType;

        if (Object.keys(detailsUpdates).length > 0) {
            const { error: detailsError } = await supabase
                .from("CarDetails")
                .upsert({
                    ad_id: adId,
                    ...detailsUpdates
                }, { onConflict: 'ad_id' });

            if (detailsError) throw detailsError;
        }

        // 3. Update Dynamic Attributes
        if (dynamicAttributes !== undefined) {
            await supabase.from('car_details_attribute_values').delete().eq('ad_id', adId);

            let parsedAttributes = dynamicAttributes;
            if (typeof dynamicAttributes === 'string') {
                try { parsedAttributes = JSON.parse(dynamicAttributes); } catch (e) { parsedAttributes = []; }
            }

            if (parsedAttributes && parsedAttributes.length > 0) {
                const attrRecords = parsedAttributes.map(attr => ({
                    ad_id: adId,
                    attribute_id: attr.attribute_id,
                    value: String(attr.value)
                }));

                const { error: attrError } = await supabase
                    .from('car_details_attribute_values')
                    .insert(attrRecords);

                if (attrError) console.error("Error updating attributes:", attrError);
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
    const { page = 1, limit = 10, brand, model, minPrice, maxPrice, vehicleTypeId } = req.query;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    try {
        let queryBuilder = supabase
            .from("CarAd")
            .select(`
            *,
            CarDetails(*),
            AdImage(*),
            vehicle_type:vehicle_types(type_name)
        `, { count: 'exact' })
            .eq("status", "ACTIVE")
            .range(start, end);

        if (minPrice) queryBuilder = queryBuilder.gte("price", minPrice);
        if (maxPrice) queryBuilder = queryBuilder.lte("price", maxPrice);
        if (vehicleTypeId) queryBuilder = queryBuilder.eq('vehicle_type_id', vehicleTypeId);

        // For child filters (e.g. brand in CarDetails or vehicle_brands)
        // If brand is passed and it's in CarDetails:
        if (brand) queryBuilder = queryBuilder.eq('CarDetails.brand', brand);
        if (model) queryBuilder = queryBuilder.eq('CarDetails.model', model);

        const { data, count, error } = await queryBuilder;

        if (error) throw error;

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
        console.error("Error fetching ads:", error);
        res.status(500).json({ success: false, message: error.message });
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
            value,
            attribute:vehicle_attributes(attribute_name, unit, data_type)
        )
      `)
            .eq("id", id)
            .single();

        if (adError) throw adError;

        if (!adData) {
            return res.status(404).json({ success: false, message: "Ad not found" });
        }

        // Fetch seller details separately
        let sellerDetails = null;
        if (adData.seller_id) {
            const { data: userData, error: userError } = await supabase
                .from("users")
                .select("name, email, phone")
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
            users: sellerDetails
        };

        res.json({ success: true, data: responseData });
    } catch (error) {
        console.error("Error fetching ad:", error);
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
                    value,
                    attribute:vehicle_attributes(attribute_name, unit, data_type)
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
