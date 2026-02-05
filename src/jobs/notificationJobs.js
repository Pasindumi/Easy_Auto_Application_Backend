import cron from 'node-cron';
import * as subscriptionService from '../services/subscriptionService.js';
import * as emailService from '../services/emailService.js';
import * as notificationService from '../services/notificationService.js';
import dotenv from 'dotenv';

dotenv.config();

const EXPIRY_WARNING_DAYS = parseInt(process.env.EXPIRY_WARNING_DAYS || '7');
const AD_LIMIT_THRESHOLD = parseInt(process.env.AD_LIMIT_THRESHOLD || '80');

// Times
const EXPIRY_CHECK_TIME = process.env.EXPIRY_CHECK_TIME || '08:00';
const AD_LIMIT_CHECK_TIME = process.env.AD_LIMIT_CHECK_TIME || '10:00';

const [expiryHour, expiryMinute] = EXPIRY_CHECK_TIME.split(':');
const [adLimitHour, adLimitMinute] = AD_LIMIT_CHECK_TIME.split(':');

export const initializeNotificationJobs = () => {
    console.log('Initializing Notification Jobs...');
    console.log(`- Expiry Check scheduled for ${EXPIRY_CHECK_TIME}`);
    console.log(`- Ad Limit Check scheduled for ${AD_LIMIT_CHECK_TIME}`);

    // Schedule Expiry Warning
    cron.schedule(`${expiryMinute} ${expiryHour} * * *`, async () => {
        console.log('Running Expiry Warning Job...');
        await checkExpiringPackages();
    });

    // Schedule Ad Limit Check
    cron.schedule(`${adLimitMinute} ${adLimitHour} * * *`, async () => {
        console.log('Running Ad Limit Job...');
        await checkAdLimitUsage();
    });
};

export const checkExpiringPackages = async () => {
    try {
        const expiringSubs = await subscriptionService.getExpiringSubscriptions(EXPIRY_WARNING_DAYS);
        console.log(`Found ${expiringSubs.length} subscriptions expiring in ${EXPIRY_WARNING_DAYS} days.`);

        for (const sub of expiringSubs) {
            // Check if already sent today
            const sentToday = await notificationService.checkNotificationSentToday(sub.user_id, 'EXPIRY_WARNING');
            if (sentToday) {
                console.log(`Skipping expiry warning for user ${sub.user_id} (already sent today)`);
                continue;
            }

            await emailService.sendExpiryWarningEmail(sub.user_id, sub.id);
        }
    } catch (error) {
        console.error('Error in checkExpiringPackages:', error);
    }
};

export const checkAdLimitUsage = async () => {
    try {
        const activeSubs = await subscriptionService.getActiveSubscriptions();
        console.log(`Checking ad limits for ${activeSubs.length} active subscriptions.`);

        for (const sub of activeSubs) {
            // Check duplicate first to save resources
            const sentRecently = await notificationService.checkNotificationSentForSubscriptionWeek(sub.user_id, sub.id, 'AD_LIMIT_WARNING');
            if (sentRecently) {
                continue;
            }

            const limits = await subscriptionService.getPackageAdLimits(sub.package_id);
            const usage = await subscriptionService.getUserAdUsage(sub.user_id, sub.start_date, sub.end_date);

            let shouldNotify = false;

            for (const limit of limits) {
                if (limit.is_unlimited) continue;

                const typeId = limit.vehicle_types?.id;
                const posted = usage[typeId] || 0;
                const percentage = (posted / limit.quantity) * 100;

                if (percentage >= AD_LIMIT_THRESHOLD) {
                    shouldNotify = true;
                    break;
                }
            }

            if (shouldNotify) {
                await emailService.sendAdLimitWarningEmail(sub.user_id, sub.id, usage, limits);
            }
        }
    } catch (error) {
        console.error('Error in checkAdLimitUsage:', error);
    }
};
