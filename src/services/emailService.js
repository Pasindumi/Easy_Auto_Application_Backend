import { compileTemplate } from '../utils/emailTemplateCompiler.js';
import * as notificationService from './notificationService.js';
import * as subscriptionService from './subscriptionService.js';
import dotenv from 'dotenv';
import supabase from '../config/supabase.js';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

export const sendPackagePurchaseEmail = async (userId, packageId, paymentId) => {
    try {
        console.log(`Preparing purchase email for User: ${userId}, Package: ${packageId}`);

        // 1. Fetch data
        const subscription = await subscriptionService.getSubscriptionDetails(userId, packageId);
        if (!subscription) {
            console.error('Subscription not found for purchase email');
            return;
        }

        const user = subscription.users; // joined data from getSubscriptionDetails? fetch properly if needed.
        // Wait, getSubscriptionDetails returns * from user_subscriptions. 
        // We need joined user and package data.
        // Let's refetch precisely what we need or use subscriptionService helpers better.
        // Actually, getSubscriptionDetails implementation in subscriptionService.js was just select('*').
        // Let's do a direct robust fetch here or rely on helpers. 
        // Let's use clean one-off queries for composition to ensure we get everything for the template.

        // Fetch User
        const { data: userData, error: userError } = await supabase.from('users').select('*').eq('id', userId).single();
        if (userError) throw userError;

        // Fetch Package Details (including features and limits)
        const pkgDetails = await subscriptionService.getPackageDetails(packageId);

        // Fetch Payment (to get amount)
        // Assuming paymentId is order_id or id in payments table
        // Check if paymentId is available, otherwise default.
        // Requirement says "payments.amount".
        let amount = 'N/A';
        if (paymentId) {
            const { data: paymentData } = await supabase.from('payments').select('amount').eq('id', paymentId).single();
            if (paymentData) amount = paymentData.amount;
        }

        // Validity
        const startDate = new Date(subscription.start_date);
        const endDate = new Date(subscription.end_date);
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // 2. Prepare Template Data
        const templateData = {
            userName: userData.name || 'User',
            packageName: pkgDetails.name,
            packageCode: pkgDetails.code,
            packageDescription: pkgDetails.description,
            amount: amount,
            currency: 'LKR', // Default
            packageStartDate: startDate.toLocaleDateString(),
            packageEndDate: endDate.toLocaleDateString(),
            validityDays: diffDays,
            adLimitsByVehicleType: pkgDetails.limits.map(l => ({
                vehicleType: l.vehicle_types?.type_name || 'Unknown',
                limit: l.is_unlimited ? 'Unlimited' : l.quantity
            })),
            features: pkgDetails.features,
            dashboardUrl: `${BASE_URL}/dashboard`
        };

        // 3. Compile Template
        const html = await compileTemplate('packagePurchased', templateData);

        // 4. Send Email
        const result = await notificationService.sendEmail(
            userData.email,
            `Package Purchase Confirmed: ${pkgDetails.name}`,
            html
        );

        // 5. Log Notification
        await notificationService.logNotification(
            userId,
            subscription.id,
            'PURCHASE',
            userData.email,
            `Package Purchase Confirmed: ${pkgDetails.name}`,
            result.success ? 'SENT' : 'FAILED',
            result.error
        );

        return result;

    } catch (error) {
        console.error('Error in sendPackagePurchaseEmail:', error);
        // Log generic failure if possible
        try {
            await notificationService.logNotification(userId, null, 'PURCHASE', 'unknown', 'Package Purchase Error', 'FAILED', error.message);
        } catch (e) { }
    }
};

export const sendExpiryWarningEmail = async (userId, subscriptionId) => {
    try {
        // Prevent duplicate - already checked in job, but good safety net? 
        // Job check is efficient (SQL), this is secondary.
        // We'll skip secondary check for speed unless needed.

        const { data: subscription, error: subError } = await supabase
            .from('user_subscriptions')
            .select(`
                *,
                users (email, name),
                price_items (name)
            `)
            .eq('id', subscriptionId)
            .single();

        if (subError || !subscription) throw new Error('Subscription not found');

        // Calculate days remaining
        const expiryDate = new Date(subscription.end_date);
        const now = new Date();
        const diffTime = expiryDate - now;
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Create renew URL
        const renewUrl = `${BASE_URL}/packages?action=renew&packageId=${subscription.package_id}`;
        const upgradeUrl = `${BASE_URL}/packages`;

        // Get limits for context
        const limits = await subscriptionService.getPackageAdLimits(subscription.package_id);

        const templateData = {
            userName: subscription.users.name || 'User',
            packageName: subscription.price_items.name,
            expiryDate: expiryDate.toLocaleDateString(),
            daysRemaining,
            adLimitsByVehicleType: limits.map(l => ({
                vehicleType: l.vehicle_types?.type_name || 'Unknown',
                limit: l.is_unlimited ? 'Unlimited' : l.quantity
            })),
            renewUrl,
            upgradeUrl
        };

        const html = await compileTemplate('packageExpiryWarning', templateData);

        const result = await notificationService.sendEmail(
            subscription.users.email,
            `Subscription Expiry Warning: ${subscription.price_items.name}`,
            html
        );

        await notificationService.logNotification(
            userId,
            subscriptionId,
            'EXPIRY_WARNING',
            subscription.users.email,
            `Subscription Expiry Warning`,
            result.success ? 'SENT' : 'FAILED',
            result.error
        );

    } catch (error) {
        console.error('Error in sendExpiryWarningEmail:', error);
    }
};

export const sendAdLimitWarningEmail = async (userId, subscriptionId, usageStats, limits) => {
    try {
        const { data: subscription } = await supabase
            .from('user_subscriptions')
            .select(`*, users (email, name), price_items (name)`)
            .eq('id', subscriptionId)
            .single();

        if (!subscription) return;

        // Process usage stats for template
        let totalPosted = 0;
        let totalAllowed = 0;
        const limitDetails = [];

        limits.forEach(limit => {
            const vId = limit.vehicle_types?.id; // Assuming we have IDs or need to map
            // Wait, previous getPackageAdLimits selected vehicle_types(id, type_name). 
            // but usageStats is keyed by vehicle_type_id (int/uuid).
            // We need to match them.

            // Note: limits comes from getPackageAdLimits in subscriptionService.
            // It has structure: { quantity, is_unlimited, vehicle_types: { id, type_name } }

            const typeId = limit.vehicle_types?.id;
            const typeName = limit.vehicle_types?.type_name || 'Unknown';
            const allowed = limit.is_unlimited ? 999999 : limit.quantity; // unlimited logic?
            const posted = usageStats[typeId] || 0;

            if (limit.is_unlimited) {
                // For unlimited, we usually don't warn about 80%, unless we track total usage against a cap?
                // Requirement 3: "Calculate percentage: (ads_posted / limit) * 100". 
                // If unlimited, percentage is 0 (or close to). 
                // So we likely only warn for limited categories.
                return;
            }

            const percentage = (posted / allowed) * 100;
            const remaining = Math.max(0, allowed - posted);

            totalPosted += posted;
            totalAllowed += allowed;

            limitDetails.push({
                vehicleType: typeName,
                adsPosted: posted,
                adsAllowed: allowed,
                remainingAds: remaining,
                percentageUsed: percentage.toFixed(1)
            });
        });

        const totalPercentage = (totalPosted / totalAllowed) * 100;

        const templateData = {
            userName: subscription.users.name || 'User',
            packageName: subscription.price_items.name,
            adLimitDetails: limitDetails,
            totalAdsPosted: totalPosted,
            totalAdsAllowed: totalAllowed,
            totalPercentageUsed: totalPercentage.toFixed(1),
            upgradeUrl: `${BASE_URL}/packages`,
            dashboardUrl: `${BASE_URL}/dashboard`
        };

        const html = await compileTemplate('adLimitWarning', templateData);

        const result = await notificationService.sendEmail(
            subscription.users.email,
            `Ad Limit Warning: ${subscription.price_items.name}`,
            html
        );

        await notificationService.logNotification(
            userId,
            subscriptionId,
            'AD_LIMIT_WARNING',
            subscription.users.email,
            `Ad Limit Warning`,
            result.success ? 'SENT' : 'FAILED',
            result.error
        );

    } catch (error) {
        console.error('Error in sendAdLimitWarningEmail:', error);
    }
};
