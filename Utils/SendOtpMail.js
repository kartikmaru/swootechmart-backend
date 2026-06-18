// SendOtpMail.js
// Resend API use karta hai — HTTP based, SMTP port issue nahi
// 
// IMPORTANT — Domain verify hone ke baad 'from' address change karo:
// from: 'SwooTechMart <noreply@yourdomain.com>'
//
// Abhi free plan me 'onboarding@resend.dev' use ho raha hai
// Jo sirf verified emails (tumhara gmail) pe kaam karta hai

const { Resend } = require('resend');

const SendOtp = async (toEmail, otp) => {
    try {
        const resend = new Resend(process.env.RESEND_API_KEY);

        const { data, error } = await resend.emails.send({
            from:    'SwooTechMart <onboarding@resend.dev>',
            to:      [toEmail],
            subject: 'Your OTP Code - SwooTechMart',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 400px; border: 1px solid #e5e7eb; border-radius: 12px;">
                    <h2 style="color:#01A49E; margin-bottom: 8px;">OTP Verification</h2>
                    <p style="color:#666;">Your One-Time Password for SwooTechMart is:</p>
                    <div style="background:#f0fafa; border: 2px dashed #01A49E; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;">
                        <h1 style="letter-spacing: 12px; color: #01A49E; font-size: 40px; margin: 0;">${otp}</h1>
                    </div>
                    <p style="color:#888; font-size: 13px;">Valid for <strong>3 minutes</strong> only.</p>
                    <p style="color:#bbb; font-size: 11px;">If you didn't request this, ignore this email.</p>
                </div>
            `,
        });

        if (error) {
            console.error('[OTP] Resend error:', error.message);
            // Agar free plan restriction hai to console me OTP print karo (dev only)
            if (error.statusCode === 403) {
                console.log(`[OTP DEV] OTP for ${toEmail}: ${otp} (domain not verified - Resend free plan)`);
            }
            return { success: false, error: error.message };
        }

        console.log('[OTP] Email sent, id:', data?.id);
        return { success: true };

    } catch (err) {
        console.error('[OTP] Exception:', err.message);
        return { success: false };
    }
};

module.exports = SendOtp;
