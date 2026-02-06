import supabase from '../config/supabase.js';
import { uploadFileToS3 } from '../utils/s3Service.js';

// --- Vehicle Types ---

export const getVehicleTypes = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('vehicle_types')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Vehicle Config Error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const createVehicleType = async (req, res) => {
    const { type_name } = req.body;
    const adminId = req.user.id;

    try {
        const { data, error } = await supabase
            .from('vehicle_types')
            .insert([{ type_name, created_by_admin: adminId }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error('Vehicle Config Error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const updateVehicleTypeStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // ACTIVE | DISABLED

    try {
        const { data, error } = await supabase
            .from('vehicle_types')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Vehicle Config Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// --- Vehicle Attributes ---

export const getAttributesByType = async (req, res) => {
    const { typeId } = req.params;
    try {
        const { data, error } = await supabase
            .from('vehicle_attributes')
            .select('*, options:vehicle_attribute_options(*)') // Join options
            .eq('vehicle_type_id', typeId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Vehicle Config Error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const createAttribute = async (req, res) => {
    const { vehicle_type_id, attribute_name, data_type, unit, is_required, options } = req.body; // options is array of strings if DROPDOWN
    const adminId = req.user.id;

    try {
        // 1. Create Attribute
        const { data: attr, error: attrError } = await supabase
            .from('vehicle_attributes')
            .insert([{
                vehicle_type_id,
                attribute_name,
                data_type,
                unit,
                is_required,
                created_by_admin: adminId
            }])
            .select()
            .single();

        if (attrError) throw attrError;

        // 2. If Dropdown, create options
        if (data_type === 'DROPDOWN' && options && options.length > 0) {
            const optionsData = options.map(opt => ({
                attribute_id: attr.id,
                option_value: opt,
                created_by_admin: adminId
            }));

            const { error: optError } = await supabase
                .from('vehicle_attribute_options')
                .insert(optionsData);

            if (optError) throw optError;
        }

        res.status(201).json(attr);
    } catch (error) {
        console.error('Vehicle Config Error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const updateAttribute = async (req, res) => {
    const { id } = req.params;
    const { attribute_name, is_required, status } = req.body;

    try {
        const { data, error } = await supabase
            .from('vehicle_attributes')
            .update({ attribute_name, is_required, status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Vehicle Config Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// --- Vehicle Brands ---

export const getBrandsByType = async (req, res) => {
    const { typeId } = req.params;
    try {
        const { data, error } = await supabase
            .from('vehicle_brands')
            .select('*')
            .eq('vehicle_type_id', typeId)
            .eq('status', 'ACTIVE') // Usually fetches active only for users, but admins might want all.
            .order('brand_name', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Vehicle Config Error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const createBrand = async (req, res) => {
    const { vehicle_type_id, brand_name } = req.body;
    const adminId = req.user.id;
    const file = req.file;

    try {
        let imageUrl = null;
        if (file) {
            imageUrl = await uploadFileToS3(file.buffer, file.originalname, file.mimetype, 'brands');
        }

        const { data, error } = await supabase
            .from('vehicle_brands')
            .insert([{
                vehicle_type_id,
                brand_name,
                brand_image: imageUrl,
                created_by_admin: adminId
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error('Vehicle Config Error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const updateBrand = async (req, res) => {
    const { id } = req.params;
    const { brand_name, status } = req.body;
    const file = req.file;

    try {
        const updateData = {};
        if (brand_name) updateData.brand_name = brand_name;
        if (status) updateData.status = status;

        if (file) {
            const imageUrl = await uploadFileToS3(file.buffer, file.originalname, file.mimetype, 'brands');
            updateData.brand_image = imageUrl;
        }

        const { data, error } = await supabase
            .from('vehicle_brands')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Vehicle Config Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// --- Vehicle Models ---

export const getModelsByType = async (req, res) => {
    const { typeId } = req.params;
    try {
        const { data, error } = await supabase
            .from('vehicle_models')
            .select('*, vehicle_brands(*)') // Join brands to get brand name
            .eq('vehicle_type_id', typeId)
            .eq('status', 'ACTIVE') // Usually fetches active only
            .order('model_name', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Vehicle Config Error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const createModel = async (req, res) => {
    const { vehicle_type_id, brand_id, model_name } = req.body;
    const adminId = req.user.id;

    try {
        const { data, error } = await supabase
            .from('vehicle_models')
            .insert([{
                vehicle_type_id,
                brand_id,
                model_name,
                created_by_admin: adminId
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error('Vehicle Config Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// --- Vehicle Conditions ---

export const getConditionsByType = async (req, res) => {
    const { typeId } = req.params;
    try {
        const { data, error } = await supabase
            .from('vehicle_conditions')
            .select('*')
            .eq('vehicle_type_id', typeId)
            .eq('status', 'ACTIVE')
            .order('condition_name', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Vehicle Config Error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const createCondition = async (req, res) => {
    const { vehicle_type_id, condition_name } = req.body;
    const adminId = req.user.id;

    try {
        const { data, error } = await supabase
            .from('vehicle_conditions')
            .insert([{ vehicle_type_id, condition_name, created_by_admin: adminId }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error('Vehicle Config Error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const deleteCondition = async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('vehicle_conditions')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, message: 'Condition deleted' });
    } catch (error) {
        console.error('Vehicle Config Error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getModelsByBrand = async (req, res) => {
    const { brandId } = req.params;
    try {
        const { data, error } = await supabase
            .from('vehicle_models')
            .select('*')
            .eq('brand_id', brandId)
            .eq('status', 'ACTIVE')
            .order('model_name', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Vehicle Config Error:', error);
        res.status(500).json({ message: error.message });
    }
};
