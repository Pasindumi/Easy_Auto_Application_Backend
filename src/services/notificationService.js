import { transporter } from '../config/emailConfig.js';
import supabase from '../config/supabase.js';

export const sendEmail = async (to, subject, htmlContent) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to,
            subject,
            html: htmlContent,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
};

export const logNotification = async (userId, subscriptionId, type, email, subject, status, errorMessage = null) => {
    try {
        const { data, error } = await supabase
            .from('notification_logs')
            .insert([
                {
                    user_id: userId,
                    subscription_id: subscriptionId,
                    notification_type: type,
                    recipient_email: email,
                    subject: subject,
                    status: status,
                    error_message: errorMessage
                }
            ]);

        if (error) {
            console.error('Error logging notification:', error);
        }
    } catch (err) {
        console.error('Unexpected error logging notification:', err);
    }
};

export const checkNotificationSentToday = async (userId, type) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('notification_logs')
            .select('id')
            .eq('user_id', userId)
            .eq('notification_type', type)
            .gte('sent_at', `${today}T00:00:00`)
            .lte('sent_at', `${today}T23:59:59`);

        if (error) throw error;

        return data.length > 0;
    } catch (error) {
        console.error('Error checking notification logs:', error);
        return false;
    }
};

export const checkNotificationSentForSubscriptionWeek = async (userId, subscriptionId, type) => {
    try {
        // Check if a notification of this type was sent for this subscription in the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data, error } = await supabase
            .from('notification_logs')
            .select('id')
            .eq('user_id', userId)
            .eq('subscription_id', subscriptionId)
            .eq('notification_type', type)
            .gte('sent_at', sevenDaysAgo.toISOString());

        if (error) throw error;

        return data.length > 0;

    } catch (error) {
        console.error('Error checking weekly notification logs:', error);
        return false;
    }
}
