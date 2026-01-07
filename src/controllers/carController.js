import supabase from '../config/supabase.js';

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
        dynamicAttributes, // Array of { attribute_id: uuid, value: any }

        // Images
        images,
    } = req.body;

    // --- Robust Sanitization for DB Constraints ---
    const toSafeUUID = (val) => (!val || val === "" || val === "undefined") ? null : val;
    const toSafeNumeric = (val) => (!val || val === "" || val === "undefined") ? null : (isNaN(val) ? 0 : parseFloat(val));
    const toSafeInt = (val) => (!val || val === "" || val === "undefined") ? null : (isNaN(val) ? 0 : parseInt(val));

    const safePrice = toSafeNumeric(price);
    const safeVehicleTypeId = toSafeUUID(vehicle_type_id);
    const safeYear = toSafeUUID(year); // Keep year as text unless DB strictly needs int, but if it is int, use toSafeInt
    const safeMileage = toSafeUUID(mileage); // Same here
    const safeEngineCapacity = toSafeUUID(engineCapacity);

    // Mapped fields
    const fuel_type = fuelType;
    const body_type = bodyType;

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
                fuel_type,
                transmission,
                body_type,
            },
        ]);

        if (detailsError) {
            await supabase.from("CarAd").delete().eq("id", adId);
            throw detailsError;
        }

        // 3. Insert Dynamic Attributes
        if (dynamicAttributes && dynamicAttributes.length > 0) {
            const attrRecords = dynamicAttributes.map(attr => ({
                ad_id: adId,
                attribute_id: attr.attribute_id,
                value: String(attr.value) // Ensure value is stored as text
            }));

            const { error: attrError } = await supabase
                .from('car_details_attribute_values')
                .insert(attrRecords);

            if (attrError) {
                console.error("Error adding specific attributes:", attrError);
                // Non-critical (?) or should rollback? 
                // Ideally rollback, but for now log error.
            }
        }

        // 4. Insert Images
        if (images && images.length > 0) {
            const imageRecords = images.map((url, index) => ({
                ad_id: adId,
                image_url: url,
                is_primary: index === 0,
            }));

            const { error: imageError } = await supabase
                .from("AdImage")
                .insert(imageRecords);

            if (imageError) {
                console.error("Error adding images:", imageError);
            }
        }

        res.status(201).json({ success: true, data: adData });
    } catch (error) {
        console.error("Error creating ad:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update Ad
export const updateAd = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    try {
        const { data, error } = await supabase
            .from("CarAd")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, data });
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
                seller:users(name, email)
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
