import supabase from './src/config/supabase.js';

async function checkSchema() {
    try {
        const { data, error } = await supabase
            .from('announcements')
            .select('*');

        if (error) {
            console.error('Error fetching announcements:', error);
            return;
        }

        if (data && data.length > 0) {
            console.log('Columns found:', Object.keys(data[0]));
            console.log('Sample data:', data[0]);
        } else {
            console.log('No data found in announcements table.');
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkSchema();
