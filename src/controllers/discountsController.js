import supabase from '../config/supabase.js';

export const getDiscounts = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('discounts')
            .select(`
                *,
                discount_vehicle_types (
                    vehicle_type_id,
                    vehicle_types (type_name)
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getActiveDiscounts = async (req, res) => {
    try {
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('discounts')
            .select(`
                *,
                discount_vehicle_types (
                    vehicle_type_id,
                    vehicle_types (type_name)
                )
            `)
            .eq('status', 'ACTIVE')
            .or(`start_date.is.null,start_date.lte.${now}`)
            .or(`end_date.is.null,end_date.gte.${now}`);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createDiscount = async (req, res) => {
    try {
        const { name, discount_type, value, is_first_time_user, min_bulk_ads, start_date, end_date, status, vehicle_type_ids } = req.body;

        if (!name || !discount_type || value === undefined) {
            return res.status(400).json({ error: 'Name, discount type, and value are required' });
        }

        const { data: discount, error: discountError } = await supabase
            .from('discounts')
            .insert([{
                name,
                discount_type,
                value: parseFloat(value),
                is_first_time_user: is_first_time_user || false,
                min_bulk_ads: parseInt(min_bulk_ads) || 0,
                start_date: start_date && start_date !== "" ? start_date : null,
                end_date: end_date && end_date !== "" ? end_date : null,
                status: status || 'ACTIVE'
            }])
            .select()
            .single();

        if (discountError) {
            console.error('Error creating discount:', discountError);
            throw discountError;
        }

        if (vehicle_type_ids && Array.isArray(vehicle_type_ids) && vehicle_type_ids.length > 0) {
            const associations = vehicle_type_ids.map(typeId => ({
                discount_id: discount.id,
                vehicle_type_id: typeId
            }));

            const { error: assocError } = await supabase
                .from('discount_vehicle_types')
                .insert(associations);

            if (assocError) {
                console.error('Error creating discount associations:', assocError);
                throw assocError;
            }
        }

        res.status(201).json({ success: true, data: discount });
    } catch (error) {
        console.error('Discount Controller Exception:', error);
        res.status(500).json({ error: error.message });
    }
};

export const updateDiscount = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, discount_type, value, is_first_time_user, min_bulk_ads, start_date, end_date, status, vehicle_type_ids } = req.body;

        const { error: discountError } = await supabase
            .from('discounts')
            .update({
                name,
                discount_type,
                value: parseFloat(value),
                is_first_time_user,
                min_bulk_ads: parseInt(min_bulk_ads) || 0,
                start_date: start_date && start_date !== "" ? start_date : null,
                end_date: end_date && end_date !== "" ? end_date : null,
                status
            })
            .eq('id', id);

        if (discountError) {
            console.error('Error updating discount:', discountError);
            throw discountError;
        }

        // Update associations: delete old and insert new
        if (vehicle_type_ids && Array.isArray(vehicle_type_ids)) {
            await supabase
                .from('discount_vehicle_types')
                .delete()
                .eq('discount_id', id);

            if (vehicle_type_ids.length > 0) {
                const associations = vehicle_type_ids.map(typeId => ({
                    discount_id: id,
                    vehicle_type_id: typeId
                }));

                const { error: assocError } = await supabase
                    .from('discount_vehicle_types')
                    .insert(associations);

                if (assocError) {
                    console.error('Error updating discount associations:', assocError);
                    throw assocError;
                }
            }
        }

        res.json({ message: 'Discount updated successfully' });
    } catch (error) {
        console.error('Update Discount Exception:', error);
        res.status(500).json({ error: error.message });
    }
};

export const deleteDiscount = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('discounts')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Discount deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
