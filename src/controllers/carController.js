import supabase from '../config/supabase.js';

// Create a new Car Ad
export const createAd = async (req, res) => {
    const {
        seller_id, // This should ideally come from auth token
        title,
        price,
        location,
        description,
        condition,
        brand,
        model,
        year,
        mileage,
        engineCapacity, // frontend camelCase
        fuelType,
        transmission,
        bodyType,
        images, // Array of image URLs
    } = req.body;

    const engine_capacity = engineCapacity;
    const fuel_type = fuelType;
    const body_type = bodyType;

    try {
        // 1. Create CarAd record
        const { data: adData, error: adError } = await supabase
            .from("CarAd")
            .insert([
                {
                    seller_id,
                    title,
                    price,
                    location,
                    description,
                    status: req.body.status || "DRAFT",
                    expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days expiry
                },
            ])
            .select()
            .single();

        if (adError) throw adError;

        const adId = adData.id;

        // 2. Create CarDetails record
        const { error: detailsError } = await supabase.from("CarDetails").insert([
            {
                ad_id: adId,
                condition,
                brand,
                model,
                year,
                mileage,
                engine_capacity,
                fuel_type,
                transmission,
                body_type,
            },
        ]);

        if (detailsError) {
            // Rollback: delete the created ad if details fail (manual transaction)
            await supabase.from("CarAd").delete().eq("id", adId);
            throw detailsError;
        }

        // 3. Insert Images
        if (images && images.length > 0) {
            const imageRecords = images.map((url, index) => ({
                ad_id: adId,
                image_url: url,
                is_primary: index === 0, // First image is primary
            }));

            const { error: imageError } = await supabase
                .from("AdImage")
                .insert(imageRecords);

            if (imageError) {
                // Log error but don't fail the whole request? Or full rollback?
                // Let's log for now.
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

    // Filter out fields that shouldn't be updated directly if needed
    // For now, allow updating status and other fields

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

// Get all ads with filters and pagination
export const getAds = async (req, res) => {
    const { page = 1, limit = 10, brand, model, minPrice, maxPrice } = req.query;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    try {
        let query = supabase
            .from("CarAd")
            .select(
                `
        *,
        CarDetails!posts_ad_id_fkey (*),
        AdImage!posts_ad_id_fkey_2 (*)
      `,
                { count: "exact" }
            )
            .eq("status", "ACTIVE")
            .range(start, end);

        // Note: Supabase joins usage depends on foreign key names if not specified.
        // I used generic !fkey names in select just as placeholders.
        // Better to use simple join if relations are clear in Supabase client.
        // Let's retry with standard syntax trusting Supabase inference or adjusting if needed.

        // Simpler join syntax:
        let queryBuilder = supabase
            .from("CarAd")
            .select(`
            *,
            CarDetails(*),
            AdImage(*)
        `, { count: 'exact' })
            .eq("status", "ACTIVE")
            .range(start, end);


        // Apply Filters (Note: CarDetails filters are tricky with simple joins in Supabase JS on parent table usually)
        // For simple filtering on child tables (like Brand), we might need inner joins or 'CarDetails.brand'.
        // Supabase allows filtering on joined tables: .eq('CarDetails.brand', brand)

        if (minPrice) queryBuilder = queryBuilder.gte("price", minPrice);
        if (maxPrice) queryBuilder = queryBuilder.lte("price", maxPrice);

        // For child filters:
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
        AdImage(*)
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

        // Increment view count (fire and forget)
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

// Update Ad is similar to Create but with .update()
