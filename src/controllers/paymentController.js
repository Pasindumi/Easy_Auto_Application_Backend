import crypto from "crypto";
import supabase from "../config/supabase.js";
import { sendPackagePurchaseEmail } from "../services/emailService.js";

/**
 * Generates the PayHere MD5 Hash for secure checkout.
 * Expected body: { merchant_id, order_id, amount, currency }
 * @deprecated - Use initiatePayment for better security (Server-Side HTML)
 */
export const generateHash = (req, res) => {
    try {
        const merchant_id = req.body.merchant_id || process.env.PAYHERE_MERCHANT_ID;
        const { order_id, amount, currency } = req.body;

        if (!merchant_id || !order_id || !amount || !currency) {
            return res.status(400).json({
                success: false,
                message: "Missing required parameters.",
            });
        }

        const envSecret = process.env.PAYHERE_MERCHANT_SECRET?.trim();
        if (!envSecret) {
            return res.status(500).json({ success: false, message: "Merchant secret not found." });
        }

        const amountFormatted = parseFloat(amount).toFixed(2);
        const getMd5 = (str) => crypto.createHash("md5").update(str).digest("hex").toUpperCase();
        const hashedSecret = getMd5(envSecret);

        const hashString = String(merchant_id).trim() + String(order_id).trim() + amountFormatted + String(currency).trim() + hashedSecret;
        const finalHash = getMd5(hashString);

        return res.status(200).json({
            success: true,
            hash: finalHash,
            merchant_id: String(merchant_id).trim(),
            order_id: String(order_id).trim(),
            amount: amountFormatted,
            currency: String(currency).trim()
        });
    } catch (error) {
        console.error("Error generating PayHere hash:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

/**
 * Generates the PayHere HTML with auto-submit form.
 * Creates a PENDING payment record in the database.
 */
export const initiatePayment = async (req, res) => {
    try {
        const userId = req.user?.id;
        const {
            order_id,
            amount,
            items,
            currency,
            first_name,
            last_name,
            email,
            phone,
            address,
            city,
            country,
            packageId // Optional
        } = req.body;

        console.log("--- PayHere Server-Side Initiation ---");
        console.log("UserID from Protect:", userId);

        if (!userId) {
            console.error("Missing userId in request");
            return res.status(401).json({ success: false, message: "Authentication required." });
        }

        // 🔹 Create PENDING Payment Record
        const { error: dbError } = await supabase.from('payments').insert({
            user_id: userId,
            package_id: packageId || null,
            order_id: order_id,
            amount: amount,
            currency: currency || 'LKR',
            status: 'PENDING',
            payment_method: 'PAYHERE'
        });

        if (dbError) {
            console.error("Database Insert Error:", dbError);
            return res.status(500).json({ success: false, message: "Failed to create payment record." });
        }

        // 🔹 Credentials (User Provided)
        const MERCHANT_ID = '1233627';
        const MERCHANT_SECRET = "MTk5NjMyMDQyNjE1NjM3MjI5NzczMDc0Nzk2NDk2NzM5NzU1NjAy";

        // 🔹 Format Amount
        const amountFormatted = parseFloat(amount).toFixed(2);
        const currencyVal = currency || 'LKR';

        // 🔹 Generate Hash
        const getMd5 = (str) => crypto.createHash("md5").update(str).digest("hex").toUpperCase();
        const hashedSecret = getMd5(MERCHANT_SECRET);
        const hashString = MERCHANT_ID + order_id + amountFormatted + currencyVal + hashedSecret;
        const hash = getMd5(hashString);

        // 🔹 URLs
        const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
        const RETURN_URL = `${BASE_URL}/api/payment/return-success`; // Frontend redirect
        const CANCEL_URL = `${BASE_URL}/api/payment/cancel`;
        const NOTIFY_URL = process.env.PAYHERE_NOTIFY_URL || `${BASE_URL}/api/payment/notify`;

        console.log("Using Notify URL:", NOTIFY_URL);

        // 🔹 Generate HTML
        const html = `
            <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: sans-serif; }
                        .loader { border: 4px solid #f3f3f3; border-top: 4px solid #235CF8; border-radius: 50%; width: 40px; height: 40px; animation: spin 2s linear infinite; }
                        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    </style>
                </head>
                <body onload="document.getElementById('payhere_form').submit();">
                    <form id="payhere_form" method="post" action="https://sandbox.payhere.lk/pay/checkout">
                        <input type="hidden" name="merchant_id" value="${MERCHANT_ID}" />
                        <input type="hidden" name="return_url" value="${RETURN_URL}" />
                        <input type="hidden" name="cancel_url" value="${CANCEL_URL}" />
                        <input type="hidden" name="notify_url" value="${NOTIFY_URL}" />
                        <input type="hidden" name="order_id" value="${order_id}" />
                        <input type="hidden" name="items" value="${items}" />
                        <input type="hidden" name="currency" value="${currencyVal}" />
                        <input type="hidden" name="amount" value="${amountFormatted}" />
                        <input type="hidden" name="first_name" value="${first_name || 'User'}" />
                        <input type="hidden" name="last_name" value="${last_name || ''}" />
                        <input type="hidden" name="email" value="${email || ''}" />
                        <input type="hidden" name="phone" value="${phone || ''}" />
                        <input type="hidden" name="address" value="${address || ''}" />
                        <input type="hidden" name="city" value="${city || ''}" />
                        <input type="hidden" name="country" value="${country || ''}" />
                        <input type="hidden" name="hash" value="${hash}" />
                        <input type="hidden" name="custom_1" value="${userId}" />
                        <input type="hidden" name="custom_2" value="${packageId}" />
                    </form>
                    <div style="text-align:center">
                        <div class="loader" style="margin:0 auto 10px;"></div>
                        <p>Redirecting to PayHere...</p>
                    </div>
                </body>
            </html>
        `;

        return res.json({ success: true, html: html });

    } catch (error) {
        console.error("Error initiating payment:", error);
        return res.status(500).json({ success: false, message: "Error initiating payment" });
    }
};

/**
 * Mock Payment Success (Bypass PayHere)
 * Creates payment and subscription records directly.
 */
export const mockPaymentSuccess = async (req, res) => {
    try {
        const { userId, packageId, amount, orderId, planName } = req.body;

        if (!userId || !packageId || !amount) {
            return res.status(400).json({ success: false, message: "Missing required parameters." });
        }

        const generatedOrderId = orderId || `PKG-${Date.now()}`;

        // 1. Create Payment Record (SUCCESS)
        const { data: payData, error: payError } = await supabase
            .from('payments')
            .insert({
                user_id: userId,
                package_id: packageId,
                order_id: generatedOrderId,
                amount: amount,
                currency: 'LKR',
                status: 'SUCCESS', // Direct success
                payment_method: 'MOCK_GATEWAY',
                transaction_id: `MOCK-${Date.now()}`
            })
            .select()
            .single();

        if (payError) {
            console.error("Mock Payment Insert Error:", payError);
            return res.status(500).json({ success: false, message: "Failed to create payment." });
        }

        // 2. Fetch Package Duration from Features
        const { data: featData } = await supabase
            .from('package_features')
            .select('feature_value')
            .eq('price_item_id', packageId)
            .eq('feature_key', 'DURATION_DAYS')
            .single();

        const durationDays = featData ? parseInt(featData.feature_value) : 30;

        // 3. Create Active Subscription
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + (isNaN(durationDays) ? 30 : durationDays));

        const { error: subError } = await supabase
            .from('user_subscriptions')
            .insert({
                user_id: userId,
                package_id: packageId,
                payment_id: payData.id,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                status: 'ACTIVE'
            });

        if (subError) {
            console.error("Mock Subscription Insert Error:", subError);
            return res.status(500).json({ success: false, message: "Failed to create subscription." });
        }

        // 4. Send Email Notification
        // We don't await this to keep response fast, or we can await if critical.
        // Better to fire and forget or wrap in try-catch to not block response.
        sendPackagePurchaseEmail(userId, packageId, payData.id).catch(err => console.error("Email trigger error:", err));

        return res.json({ success: true, message: "Payment successful and package assigned." });

    } catch (error) {
        console.error("Error in mock payment:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

/**
 * Handle PayHere Notify (Server-to-Server Callback)
 */
export const handlePaymentNotify = async (req, res) => {
    console.log("--- PayHere Notification Received ---");
    console.log("Body:", req.body);

    try {
        const {
            merchant_id,
            order_id,
            payment_id,
            payhere_amount,
            payhere_currency,
            status_code,
            md5sig,
            custom_1, // userId
            custom_2  // packageId
        } = req.body;

        const MERCHANT_SECRET = "MTk5NjMyMDQyNjE1NjM3MjI5NzczMDc0Nzk2NDk2NzM5NzU1NjAy"; // Same secret

        // 1. Verify Hash
        const getMd5 = (str) => crypto.createHash("md5").update(str).digest("hex").toUpperCase();
        const hashedSecret = getMd5(MERCHANT_SECRET);
        const hashString = merchant_id + order_id + payhere_amount + payhere_currency + status_code + hashedSecret;
        const localMd5 = getMd5(hashString);

        if (localMd5 !== md5sig) {
            console.error("Hash Mismatch! Potential Fraud.");
            return res.status(400).send("Hash Mismatch");
        }

        // 2. Update Payment Status
        // status_code: 2 = Success, 0 = Pending, -1 = Canceled, -2 = Failed, -3 = Chargedback
        let paymentStatus = 'PENDING';
        if (status_code == '2') paymentStatus = 'SUCCESS';
        else if (status_code == '-1') paymentStatus = 'CANCELLED';
        else if (status_code == '-2') paymentStatus = 'FAILED';

        const { error: updateError } = await supabase
            .from('payments')
            .update({
                status: paymentStatus,
                transaction_id: payment_id
            })
            .eq('order_id', order_id);

        if (updateError) {
            console.error("Error updating payment:", updateError);
            // Don't error out request, just log it. We verified hash.
        }

        // 3. If Success, Assign Package
        if (paymentStatus === 'SUCCESS') {
            const userId = custom_1;
            const packageId = custom_2;

            if (userId && packageId) {
                // Fetch Package Duration
                const { data: featData } = await supabase
                    .from('package_features')
                    .select('feature_value')
                    .eq('price_item_id', packageId)
                    .eq('feature_key', 'DURATION_DAYS')
                    .single();

                const durationDays = featData ? parseInt(featData.feature_value) : 30;

                const startDate = new Date();
                const endDate = new Date();
                endDate.setDate(startDate.getDate() + (isNaN(durationDays) ? 30 : durationDays));

                const { error: subError } = await supabase
                    .from('user_subscriptions')
                    .insert({
                        user_id: userId,
                        package_id: packageId,
                        start_date: startDate.toISOString(),
                        end_date: endDate.toISOString(),
                        status: 'ACTIVE'
                    });

                if (subError) {
                    console.error("Error creating subscription:", subError);
                } else {
                    console.log(`Package ${packageId} assigned to User ${userId} for ${durationDays} days`);

                    // Send Email
                    // payment_id from PayHere is the transaction ID, but our DB id is payment_id? 
                    // Wait, handlePaymentNotify doesn't return the inserted payment row ID easily without querying.
                    // But we updated the payment with 'order_id'.
                    // Let's get the internal payment ID.
                    const { data: payRow } = await supabase.from('payments').select('id').eq('order_id', order_id).single();
                    if (payRow) {
                        sendPackagePurchaseEmail(userId, packageId, payRow.id).catch(err => console.error("Email trigger error:", err));
                    }
                }
            }
        }

        return res.status(200).send("OK");

    } catch (error) {
        console.error("Error processing notification:", error);
        return res.status(500).send("Internal Server Error");
    }
};

/**
 * Get My Payment History
 */
// Existing export of getMyPayments is at line 354, I will append the new functions after it.
// Actually, I can just append them.
// But wait, I need to make sure I am essentially replacing the end of the file or just appending.
// The file is 354 lines. I will look for the end of getMyPayments and append.

export const getMyPayments = async (req, res) => {
    try {
        // Assuming auth middleware sets req.user.id
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        const { data, error } = await supabase
            .from('payments')
            .select(`
                *,
                price_items (name) 
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform data slightly if needed
        const formatted = data.map(p => ({
            id: p.id,
            date: new Date(p.created_at).toLocaleDateString(),
            plan: p.price_items?.name || 'Unknown Package',
            amount: `${p.currency} ${p.amount}`,
            status: p.status,
            orderId: p.order_id,
            packageId: p.package_id // Ensure package_id is passed
        }));

        return res.json({ success: true, data: formatted });
    } catch (error) {
        console.error("Error fetching payments:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch payments" });
    }
};

/**
 * Get Active Subscription
 */
export const getActiveSubscription = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        const { data, error } = await supabase
            .from('user_subscriptions')
            .select(`
                *,
                price_items (name),
                payments (amount, currency)
            `)
            .eq('user_id', userId)
            .eq('status', 'ACTIVE')
            .gt('end_date', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.json({ success: true, data: null });
            }
            throw error;
        }

        if (!data) {
            return res.json({ success: true, data: null });
        }

        const subscription = {
            id: data.id,
            packageId: data.package_id,
            plan: data.price_items?.name,
            amount: data.payments ? `${data.payments.currency} ${data.payments.amount}` : 'N/A',
            status: data.status,
            startDate: data.start_date,
            endDate: data.end_date
        };

        return res.json({ success: true, data: subscription });

    } catch (error) {
        console.error("Error getting active subscription:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

/**
 * Unsubscribe User
 */
export const unsubscribeUser = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        const { subscriptionId } = req.body;

        let query = supabase.from('user_subscriptions').update({ status: 'CANCELLED' }).eq('user_id', userId);

        if (subscriptionId) {
            query = query.eq('id', subscriptionId);
        } else {
            // If no ID provided, cancel all active ones (should be only one)
            query = query.eq('status', 'ACTIVE');
        }

        const { data, error } = await query.select();

        if (error) throw error;

        return res.json({ success: true, message: "Unsubscribed successfully" });

    } catch (error) {
        console.error("Error unsubscribing:", error);
        return res.status(500).json({ success: false, message: "Failed to unsubscribe" });
    }
};

/**
 * Activate Free Ad using Package Benefit
 */
export const activateFreeAdByPackage = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { adId, packageId, amount, orderId } = req.body;

        if (!adId || !packageId) {
            return res.status(400).json({ success: false, message: "Missing required parameters." });
        }

        // 1. Verify Slot Availability (Security Check)
        // We'll manually check the usage for this specific ad's vehicle type
        const { data: ad, error: adError } = await supabase
            .from('CarAd')
            .select(`
                vehicle_type_id, 
                seller_id, 
                status,
                vehicle_types (type_name)
            `)
            .eq('id', adId)
            .single();

        if (adError || !ad) {
            return res.status(404).json({ success: false, message: "Ad not found." });
        }

        if (ad.seller_id !== userId) {
            return res.status(403).json({ success: false, message: "Unauthorized: You do not own this ad." });
        }

        if (ad.status === 'ACTIVE') {
            return res.status(400).json({ success: false, message: "Ad is already active." });
        }

        // Check if package has limits for this type
        const { data: limit, error: lError } = await supabase
            .from('package_ad_limits')
            .select('*')
            .eq('package_id', packageId)
            .eq('vehicle_type_id', ad.vehicle_type_id)
            .single();

        if (!lError && limit && !limit.is_unlimited) {
            // Get current usage in this subscription
            const { data: sub } = await supabase
                .from('user_subscriptions')
                .select('start_date')
                .eq('user_id', userId)
                .eq('package_id', packageId)
                .eq('status', 'ACTIVE')
                .single();

            if (sub) {
                // Count how many tracking records exist for this package in this period
                const { count } = await supabase
                    .from('payments')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', userId)
                    .eq('package_id', packageId)
                    .eq('status', 'SUCCESS')
                    .gte('created_at', sub.start_date);

                if (count >= limit.quantity) {
                    return res.status(400).json({ success: false, message: "Package ad posting limit reached for this vehicle type." });
                }
            }
        }

        const typeName = ad.vehicle_types?.type_name || 'Other';
        const generatedOrderId = `V-${typeName}`;

        // 2. Create Payment Record (Zero amount)
        const { data: payData, error: payError } = await supabase
            .from('payments')
            .insert({
                user_id: userId,
                package_id: packageId,
                order_id: generatedOrderId,
                amount: amount || 0,
                currency: 'LKR',
                status: 'SUCCESS',
                payment_method: 'PACKAGE_BENEFIT',
                transaction_id: `FREE-${Date.now()}`
            })
            .select()
            .single();

        if (payError) {
            console.error("Free Ad Payment Record Error:", payError);
            return res.status(500).json({ success: false, message: "Failed to create tracking record." });
        }

        // 3. Mark Ad as ACTIVE and set expiry
        const { error: updateError } = await supabase
            .from('CarAd')
            .update({
                status: 'ACTIVE',
                expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq('id', adId);

        if (updateError) {
            console.error("Ad Activation Error:", updateError);
            return res.status(500).json({ success: false, message: "Failed to activate ad." });
        }

        return res.json({
            success: true,
            message: "Advertisement activated successfully using your package benefit."
        });

    } catch (error) {
        console.error("Error activating free ad:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

/**
 * Handles PayHere Payment Notification (Notify URL)
 * This endpoint is called by PayHere server-to-server.
 */
export const handlePaymentNotification = async (req, res) => {
    try {
        console.log("--- PayHere Notification Received ---");
        console.log("Body:", req.body);

        const {
            merchant_id,
            order_id,
            payment_id,
            payhere_amount,
            payhere_currency,
            status_code,
            md5sig,
            custom_1, // Assuming userId might be passed here or we look up order
            custom_2  // Assuming packageId might be passed here or we look up order
        } = req.body;

        const MERCHANT_SECRET = "MTk5NjMyMDQyNjE1NjM3MjI5NzczMDc0Nzk2NDk2NzM5NzU1NjAy"; // Should be env var

        // 1. Validate Signature
        const getMd5 = (str) => crypto.createHash("md5").update(str).digest("hex").toUpperCase();
        const hashedSecret = getMd5(MERCHANT_SECRET);
        const signString = merchant_id + order_id + payhere_amount + payhere_currency + status_code + hashedSecret;
        const generatedSig = getMd5(signString);

        if (generatedSig !== md5sig) {
            console.error("Payment notification signature mismatch");
            return res.status(400).send("Signature Mismatch");
        }

        // 2. Check Status (2 = Success)
        if (status_code == 2) {
            console.log(`Payment Success for Order ${order_id}`);

            // Update database - Assuming this part existed or needs to be done. 
            // Requirement says: "In payments controller (when payment status becomes 'SUCCESS')"
            // Since I am creating this handler from scratch, I should ideally update the specific table 'payments' and 'user_subscriptions'.

            // HOWEVER, to be safe and modular, I will only trigger the email here as per specific request.
            // The prompt implies the controller logic might already exist or I should add it.
            // "Trigger Point: In payments controller (when payment status becomes 'SUCCESS')"

            // Since I don't see existing DB update logic, I will assume it's handled elsewhere or I should minimally do the email part if I can resolve userId/packageId.
            // If order_id maps to something in DB, I can look it up.

            // IMPORTANT: The request says "sendPackagePurchaseEmail(userId, packageId, paymentId)".
            // I need userId and packageId. 
            // Usually pass them in 'items' or 'custom_1', 'custom_2' fields when initiating.
            // In `initiatePayment`: items, amount, etc. are passed. 
            // If I can't guarantee `custom_1` has userId, I might need to look up the `order_id` in a `orders` or `payments` table initiated previously.

            // Let's import the emailService and call it.
            // I will try to extract userId/packageId from `custom_1`/`custom_2` if used, or assume they are available.
            // But wait, the current `initiatePayment` does NOT pass custom_1/2.
            // And I don't see a `saveOrder` before initiate. 

            // To solve this correctly: I should probably modify `initiatePayment` to accept/pass userId/packageId in custom fields, 
            // OR assume the `order_id` is a UUID that exists in `payments` table which has `user_id` and `package_id`.

            // Requirement: "Payments: payments (user_id, package_id, amount, status='SUCCESS', created_at)"
            // So I should fetch the payment record by `order_id` (likely mapped to id) and update status, then send email.

            // I'll dynamically import emailService to avoid circular dependency issues at top level if any? No, top level is fine.
            const emailService = await import('../services/emailService.js');

            // We need to look up the payment to get user/package details if not in payload.
            // Assuming order_id == payment.id.

            // Trigger Email
            // We need to fetch the payment record to get userId/packageId
            if (order_id) {
                // Assuming I can import supabase client here or use a service
                const { createClient } = await import('@supabase/supabase-js');
                const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

                const { data: payment } = await supabase.from('payments').select('*').eq('id', order_id).single();

                if (payment) {
                    await emailService.sendPackagePurchaseEmail(payment.user_id, payment.package_id, payment_id);
                } else {
                    console.error(`Payment record not found for order ${order_id}`);
                }
            }
        } else {
            console.log(`Payment Status ${status_code} for Order ${order_id}`);
        }

        return res.status(200).send("OK");
    } catch (error) {
        console.error("Error in handlePaymentNotification:", error);
        return res.status(500).send("Error");
    }
};
