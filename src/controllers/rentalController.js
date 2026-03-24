import supabase from '../config/supabase.js';
import { uploadFileToS3 } from '../utils/s3Service.js';

// Helper to safely parse inputs
const toSafeUUID = (val) => (!val || val === "" || val === "undefined") ? null : val;
const toSafeNumeric = (val) => (!val || val === "" || val === "undefined") ? null : (isNaN(val) ? 0 : parseFloat(val));
const toSafeInt = (val) => (!val || val === "" || val === "undefined") ? null : (isNaN(val) ? 0 : parseInt(val));

export const createRentalAd = async (req, res) => {
    try {
        const seller_id = req.user.id;
        const {
            title, location, description,
            price_per_day, price_per_week, price_per_month, extra_mileage_fee, security_deposit,
            min_rental_duration, max_rental_duration, min_age, daily_mileage_limit,
            allow_smoking, allow_pets, req_deposit, other_conditions,
            vehicle_type_id, condition, brand, model, year, transmission, fuel_type, body_type, engine_capacity, mileage,
            calendar_start_date, calendar_end_date
        } = req.body;

        const safeVehicleTypeId = toSafeUUID(vehicle_type_id);

        // 1. Create Rental Ad record
        const { data: adData, error: adError } = await supabase
            .from("rental_ads")
            .insert([{
                seller_id,
                vehicle_type_id: safeVehicleTypeId,
                title, location, description,
                price_per_day: toSafeNumeric(price_per_day) || 0,
                price_per_week: toSafeNumeric(price_per_week) || 0,
                price_per_month: toSafeNumeric(price_per_month) || 0,
                extra_mileage_fee: toSafeNumeric(extra_mileage_fee) || 0,
                security_deposit: toSafeNumeric(security_deposit) || 0,
                min_rental_duration: toSafeInt(min_rental_duration) || 1,
                max_rental_duration: toSafeInt(max_rental_duration),
                min_age: toSafeInt(min_age) || 21,
                daily_mileage_limit: toSafeNumeric(daily_mileage_limit),
                allow_smoking: allow_smoking === 'true' || allow_smoking === true,
                allow_pets: allow_pets === 'true' || allow_pets === true,
                req_deposit: req_deposit === 'true' || req_deposit === true,
                other_conditions,
                status: "DRAFT" // Default status until paid
            }])
            .select()
            .single();

        if (adError) throw adError;
        const adId = adData.id;

        // 2. Create Details record
        const { error: detailsError } = await supabase.from("rental_ad_details").insert([{
            ad_id: adId, condition, brand, model,
            year: toSafeInt(year), mileage: toSafeNumeric(mileage),
            engine_capacity: toSafeNumeric(engine_capacity),
            fuel_type, transmission, body_type
        }]);

        if (detailsError) {
            await supabase.from("rental_ads").delete().eq("id", adId);
            throw detailsError;
        }

        // 3. Handle File Uploads (Images and Documents)
        if (req.files) {
            // Upload Images
            const imageFiles = req.files['images'] || [];
            if (imageFiles.length > 0) {
                const uploadPromises = imageFiles.map(file => uploadFileToS3(file.buffer, file.originalname, file.mimetype));
                const uploadedUrls = await Promise.all(uploadPromises);

                const imageRecords = uploadedUrls.map((url, index) => ({
                    ad_id: adId, image_url: url, is_primary: index === 0
                }));
                await supabase.from("rental_ad_images").insert(imageRecords);
            }

            // Upload Specific Documents
            const docFields = [
                { key: 'doc_id_front', type: 'ID Front' },
                { key: 'doc_id_back', type: 'ID Back' },
                { key: 'doc_ownership', type: 'Ownership Document' }
            ];

            for (const field of docFields) {
                const file = req.files[field.key]?.[0];
                if (file) {
                    const url = await uploadFileToS3(file.buffer, file.originalname, file.mimetype);
                    await supabase.from("rental_ad_documents").insert({
                        ad_id: adId,
                        document_type: field.type,
                        document_url: url,
                        status: 'PENDING'
                    });
                }
            }
        }

        // 4. Set Initial Availability Calendar (Optional)
        if (calendar_start_date && calendar_end_date) {
            await supabase.from("rental_ad_calendar").insert([{
                ad_id: adId, start_date: calendar_start_date, end_date: calendar_end_date, status: 'AVAILABLE'
            }]);
        }

        res.status(201).json({ success: true, message: "Rental ad created successfully!", data: adData });
    } catch (error) {
        console.error("Error creating rental ad:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateRentalAd = async (req, res) => {
    try {
        const { id } = req.params;
        const seller_id = req.user.id;
        const {
            title, location, description,
            price_per_day, price_per_week, price_per_month, extra_mileage_fee, security_deposit,
            min_rental_duration, max_rental_duration, min_age, daily_mileage_limit,
            allow_smoking, allow_pets, req_deposit, other_conditions,
            vehicle_type_id, condition, brand, model, year, transmission, fuel_type, body_type, engine_capacity, mileage,
            calendar_start_date, calendar_end_date,
            existing_images // Array of URLs to keep
        } = req.body;

        // 1. Verify ownership
        const { data: existingAd, error: fetchError } = await supabase.from("rental_ads").select("id").eq("id", id).eq("seller_id", seller_id).single();
        if (fetchError || !existingAd) return res.status(404).json({ success: false, message: "Ad not found or unauthorized." });

        // 2. Update Ad record
        const { error: adError } = await supabase
            .from("rental_ads")
            .update({
                title, location, description,
                price_per_day: toSafeNumeric(price_per_day),
                price_per_week: toSafeNumeric(price_per_week),
                price_per_month: toSafeNumeric(price_per_month),
                extra_mileage_fee: toSafeNumeric(extra_mileage_fee),
                security_deposit: toSafeNumeric(security_deposit),
                min_rental_duration: toSafeInt(min_rental_duration),
                max_rental_duration: toSafeInt(max_rental_duration),
                min_age: toSafeInt(min_age),
                daily_mileage_limit: toSafeNumeric(daily_mileage_limit),
                allow_smoking: allow_smoking === 'true' || allow_smoking === true,
                allow_pets: allow_pets === 'true' || allow_pets === true,
                req_deposit: req_deposit === 'true' || req_deposit === true,
                other_conditions,
                vehicle_type_id: toSafeUUID(vehicle_type_id)
            })
            .eq("id", id);

        if (adError) throw adError;

        // 3. Update Details record
        const { error: detailsError } = await supabase.from("rental_ad_details").update({
            condition, brand, model,
            year: toSafeInt(year), mileage: toSafeNumeric(mileage),
            engine_capacity: toSafeNumeric(engine_capacity),
            fuel_type, transmission, body_type
        }).eq("ad_id", id);

        if (detailsError) throw detailsError;

        // 4. Handle Images
        const keepImages = existing_images ? (JSON.parse(existing_images)) : [];
        if (keepImages.length > 0) {
            await supabase.from("rental_ad_images").delete().eq("ad_id", id).not("image_url", "in", `(${keepImages.map(url => `'${url}'`).join(",")})`);
        } else {
            await supabase.from("rental_ad_images").delete().eq("ad_id", id);
        }

        if (req.files && req.files['images']) {
            const imageFiles = req.files['images'];
            const uploadPromises = imageFiles.map(file => uploadFileToS3(file.buffer, file.originalname, file.mimetype));
            const uploadedUrls = await Promise.all(uploadPromises);

            const imageRecords = uploadedUrls.map(url => ({
                ad_id: id, image_url: url, is_primary: false
            }));
            await supabase.from("rental_ad_images").insert(imageRecords);
        }

        // 5. Handle Documents
        const docFields = [
            { key: 'doc_id_front', type: 'ID Front' },
            { key: 'doc_id_back', type: 'ID Back' },
            { key: 'doc_ownership', type: 'Ownership Document' }
        ];

        for (const field of docFields) {
            const file = req.files && req.files[field.key]?.[0];
            if (file) {
                // Delete existing of this type if updating
                await supabase.from("rental_ad_documents").delete().eq("ad_id", id).eq("document_type", field.type);

                const url = await uploadFileToS3(file.buffer, file.originalname, file.mimetype);
                await supabase.from("rental_ad_documents").insert({
                    ad_id: id,
                    document_type: field.type,
                    document_url: url,
                    status: 'PENDING'
                });
            }
        }

        res.json({ success: true, message: "Rental ad updated successfully!" });
    } catch (error) {
        console.error("Error updating rental ad:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getRentalAds = async (req, res) => {
    const { page, limit, brand, model, minPrice, maxPrice, vehicleTypeId, location, search } = req.query;
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const start = (pageInt - 1) * limitInt;
    const end = start + limitInt - 1;

    try {
        let queryBuilder = supabase
            .from("rental_ads")
            .select(`*, details:rental_ad_details(*), images:rental_ad_images(*)`, { count: 'exact' })
            .eq("status", "ACTIVE")
            .or('is_banned.is.null,is_banned.eq.false');

        if (minPrice) queryBuilder = queryBuilder.gte("price_per_day", minPrice);
        if (maxPrice) queryBuilder = queryBuilder.lte("price_per_day", maxPrice);
        if (vehicleTypeId) queryBuilder = queryBuilder.eq('vehicle_type_id', vehicleTypeId);
        if (brand) queryBuilder = queryBuilder.eq('details.brand', brand);
        if (model) queryBuilder = queryBuilder.eq('details.model', model);
        if (location) queryBuilder = queryBuilder.ilike('location', `%${location}%`);
        if (search) queryBuilder = queryBuilder.ilike('title', `%${search}%`);

        queryBuilder = queryBuilder.range(start, end).order('created_at', { ascending: false });

        const { data, count, error } = await queryBuilder;
        if (error) throw error;

        res.json({ success: true, data, pagination: { total: count, page: pageInt, pages: Math.ceil((count || 0) / limitInt) } });
    } catch (error) {
        console.error("RENTAL AD FETCH ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getRentalAdById = async (req, res) => {
    try {
        const { data: adData, error } = await supabase
            .from("rental_ads")
            .select(`*, details:rental_ad_details(*), images:rental_ad_images(*), calendar:rental_ad_calendar(*), vehicle_type:vehicle_types(*), documents:rental_ad_documents(*)`)
            .eq("id", req.params.id)
            .single();

        if (error) throw error;
        if (!adData) return res.status(404).json({ success: false, message: "Ad not found" });

        // Include seller
        const { data: userData } = await supabase.from("users").select("id, name, email, phone, avatar, created_at").eq("id", adData.seller_id).single();

        await supabase.from("rental_ads").update({ views_count: (adData.views_count || 0) + 1 }).eq('id', req.params.id);

        res.json({ success: true, data: { ...adData, users: userData } });
    } catch (error) {
        console.error("Error fetching rental ad:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getMyRentalAds = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("rental_ads")
            .select(`*, details:rental_ad_details(*), images:rental_ad_images(*), vehicle_type:vehicle_types(type_name)`)
            .eq("seller_id", req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error("Error fetching my rental ads:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================
// ADMIN ROUTES
// ==========================================
export const adminGetRentalAds = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("rental_ads")
            .select(`*, details:rental_ad_details(*), images:rental_ad_images(*), documents:rental_ad_documents(*), seller:users(name, email, phone)`)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error("Admin fetch error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const adminUpdateRentalAdStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const { error } = await supabase
            .from("rental_ads")
            .update({ status })
            .eq("id", id);

        if (error) throw error;
        res.json({ success: true, message: `Ad status updated to ${status}` });
    } catch (error) {
        console.error("Status update error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const adminVerifyRentalDocuments = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // status: 'VERIFIED' or 'REJECTED'

        // Update document status
        await supabase.from("rental_ad_documents").update({ status }).eq('ad_id', id);

        // Update overall ad verification status
        const { error } = await supabase.from("rental_ads").update({ verification_status: status }).eq('id', id);

        if (error) throw error;
        res.json({ success: true, message: `Ad verification status updated to ${status}` });
    } catch (error) {
        console.error("Verification error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
