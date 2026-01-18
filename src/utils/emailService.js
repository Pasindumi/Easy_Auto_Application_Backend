import nodemailer from 'nodemailer';

// Create email transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Send OTP email to user
 * @param {string} email - User's email address
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendOtpEmail(email, otp) {
  try {
    const mailOptions = {
      from: `EasyAuto <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Password Reset OTP - EasyAuto',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; text-align: center;">
            <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
            <p style="color: #666; font-size: 16px; margin-bottom: 30px;">
              You requested to reset your password. Use the OTP code below:
            </p>
            <div style="background-color: #fff; border: 2px dashed #007bff; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="color: #007bff; font-size: 42px; font-weight: bold; margin: 0; letter-spacing: 8px;">
                ${otp}
              </p>
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              This OTP will expire in <strong>${process.env.OTP_EXPIRATION_MINUTES || 10} minutes</strong>.
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">
              If you didn't request this, please ignore this email or contact support.
            </p>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
            © ${new Date().getFullYear()} EasyAuto. All rights reserved.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return { success: false, error: error.message };
  }
}
