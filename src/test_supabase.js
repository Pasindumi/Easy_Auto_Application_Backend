import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);

async function run() {
  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*');
      
    if (error) throw error;
    
    console.log(`Total notifications in table: ${notifications.length}`);
    console.log('Last 10 notifications:');
    console.log(JSON.stringify(notifications.slice(-10).map(n => ({ id: n.id, user_id: n.user_id, title: n.title, is_read: n.is_read })), null, 2));
    
    // Count by user
    const userCounts = {};
    notifications.forEach(n => {
      if (!userCounts[n.user_id]) {
        userCounts[n.user_id] = { total: 0, unread: 0 };
      }
      userCounts[n.user_id].total++;
      if (!n.is_read) {
        userCounts[n.user_id].unread++;
      }
    });
    
    console.log('User counts:', userCounts);
    
    // Test count query
    for (const userId of Object.keys(userCounts)) {
      const { count, error: countErr } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      
      console.log(`User ${userId}: exact head count = ${count}, error = ${countErr?.message}`);
    }
  } catch (err) {
    console.error(err);
  }
}

run();
