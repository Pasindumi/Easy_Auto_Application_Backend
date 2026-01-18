import crypto from "crypto";

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
 * Uses strict credentials provided by user to ensure "Unauthorized" error resolution.
 */
export const initiatePayment = (req, res) => {
    try {
        const { order_id, amount, items, currency, first_name, last_name, email, phone, address, city, country } = req.body;

        console.log("--- PayHere Server-Side Initiation ---");
        console.log("Received Body:", JSON.stringify(req.body, null, 2));

        // 🔹 Credentials (User Provided)
        const MERCHANT_ID = '1233627';
        // User provided secret: MTk5NjMyMDQyNjE1NjM3MjI5NzczMDc0Nzk2NDk2NzM5NzU1NjAy
        // We use it EXACTLY as provided without decoding.
        const MERCHANT_SECRET = "MTk5NjMyMDQyNjE1NjM3MjI5NzczMDc0Nzk2NDk2NzM5NzU1NjAy";

        // 🔹 Format Amount
        // PayHere requires exactly 2 decimal places (e.g. 1000.00)
        const amountFormatted = parseFloat(amount).toFixed(2);
        const currencyVal = currency || 'LKR';

        // 🔹 Generate Hash
        // Formula: MD5(merchant_id + order_id + amount + currency + MD5(merchant_secret))
        const getMd5 = (str) => crypto.createHash("md5").update(str).digest("hex").toUpperCase();

        const hashedSecret = getMd5(MERCHANT_SECRET);
        const hashString =
            MERCHANT_ID +
            order_id +
            amountFormatted +
            currencyVal +
            hashedSecret;

        const hash = getMd5(hashString);

        console.log(`Generated Hash for Order ${order_id}: ${hash}`);

        // 🔹 Sandbox URLs
        // Ideally, these should be in your .env file
        // For local development with Expo, 'return_url' and 'cancel_url' are less critical 
        // because the WebView intercepts the navigation before it even loads these pages (based on string matching).
        // However, 'notify_url' MUST be publicly accessible (e.g., Ngrok) if you want PayHere to send backend updates.

        const BASE_URL = process.env.BASE_URL || "http://localhost:5000"; // Or your Ngrok URL

        const RETURN_URL = `${BASE_URL}/api/payment/success`;
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
                    </form>
                    <div style="text-align:center">
                        <div class="loader" style="margin:0 auto 10px;"></div>
                        <p>Redirecting to PayHere...</p>
                    </div>
                </body>
            </html>
        `;

        // Send HTML response as JSON
        // We return JSON so the frontend can fetch it securely and render it.
        return res.json({
            success: true,
            html: html
        });

    } catch (error) {
        console.error("Error initiating payment:", error);
        return res.status(500).json({ success: false, message: "Error initiating payment" });
    }
};
