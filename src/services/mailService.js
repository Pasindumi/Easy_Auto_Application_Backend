import { Resend } from 'resend';

/**
 * Mail Service using Resend
 * Production-ready email delivery for OTP and notifications
 */

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send OTP email to user for password reset
 * @param {string} email - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendOtpEmail = async (email, otp) => {
    try {
        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'EasyAuto <noreply@yourdomain.com>',
            to: email,
            subject: 'Password Reset OTP - EasyAuto',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Password Reset OTP</title>
                </head>
                <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td align="center" style="padding: 40px 0;">
                                <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                    <!-- Header -->
                                    <tr>
                                        <td style="padding: 40px 40px 20px 40px; text-align: center;">
                                            <h1 style="margin: 0; color: #333333; font-size: 28px; font-weight: 600;">
                                                🔐 Password Reset
                                            </h1>
                                        </td>
                                    </tr>
                                    
                                    <!-- Content -->
                                    <tr>
                                        <td style="padding: 0 40px 20px 40px;">
                                            <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 24px;">
                                                You requested to reset your password for your EasyAuto account. Use the following OTP code to verify your identity:
                                            </p>
                                        </td>
                                    </tr>
                                    
                                    <!-- OTP Box -->
                                    <tr>
                                        <td style="padding: 0 40px 30px 40px;">
                                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                                <tr>
                                                    <td align="center" style="padding: 30px; background-color: #f8f9fa; border-radius: 8px; border: 2px dashed #e0e0e0;">
                                                        <div style="font-size: 42px; font-weight: bold; letter-spacing: 8px; color: #2c3e50; font-family: 'Courier New', monospace;">
                                                            ${otp}
                                                        </div>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    
                                    <!-- Expiry Notice -->
                                    <tr>
                                        <td style="padding: 0 40px 20px 40px;">
                                            <p style="margin: 0; color: #e74c3c; font-size: 14px; text-align: center; font-weight: 500;">
                                                ⏰ This OTP will expire in ${process.env.OTP_EXPIRATION_MINUTES || 10} minutes
                                            </p>
                                        </td>
                                    </tr>
                                    
                                    <!-- Security Notice -->
                                    <tr>
                                        <td style="padding: 0 40px 40px 40px;">
                                            <div style="padding: 20px; background-color: #fff3cd; border-radius: 6px; border-left: 4px solid #ffc107;">
                                                <p style="margin: 0; color: #856404; font-size: 14px; line-height: 20px;">
                                                    <strong>🔒 Security Notice:</strong><br>
                                                    If you didn't request this password reset, please ignore this email or contact support if you have concerns.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                    
                                    <!-- Footer -->
                                    <tr>
                                        <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center; border-top: 1px solid #e0e0e0;">
                                            <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px;">
                                                EasyAuto - Your Trusted Car Application Platform
                                            </p>
                                            <p style="margin: 0; color: #999999; font-size: 12px;">
                                                © ${new Date().getFullYear()} EasyAuto. All rights reserved.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `
        });

        if (error) {
            console.error('❌ Resend API error:', error);
            return { success: false, error: error.message };
        }

        console.log('✅ OTP email sent successfully via Resend');
        console.log('   Email ID:', data?.id);
        console.log('   Recipient:', email);
        
        return { success: true };

    } catch (error) {
        console.error('❌ Failed to send OTP email:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Generic email sending function for future use
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendEmail = async ({ to, subject, html }) => {
    try {
        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'EasyAuto <noreply@yourdomain.com>',
            to,
            subject,
            html
        });

        if (error) {
            console.error('❌ Resend API error:', error);
            return { success: false, error: error.message };
        }

        console.log('✅ Email sent successfully via Resend');
        console.log('   Email ID:', data?.id);
        
        return { success: true };

    } catch (error) {
        console.error('❌ Failed to send email:', error);
        return { success: false, error: error.message };
    }
};
