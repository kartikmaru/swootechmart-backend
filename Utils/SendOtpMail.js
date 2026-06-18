// SendOtpMail.js — Resend API se email bhejta hai
//
// 🧠 NODEMAILER vs RESEND:
// Nodemailer → directly Gmail SMTP server se connect hota hai
//   Problem: Render (aur bahut se cloud servers) port 465/587 BLOCK karte hain
//   security reasons se — isliye Gmail mail nahi jaati
//
// Resend → HTTP API use karta hai (port 443 HTTPS)
//   Render pe HTTPS always open hota hai
//   Resend apne servers se mail bhejta hai — hum sirf API call karte hain
//   Koi SMTP port issue nahi
//
// Flow:
//   1. Register → otp generate hota hai
//   2. SendOtp(email, otp) call hoti hai
//   3. Resend.emails.send() → HTTP POST to api.resend.com
//   4. Resend mail deliver karta hai → user inbox

const { Resend } = require('resend');

const SendOtp = async (toEmail, otp) => {
    try {
        // RESEND_API_KEY Render Dashboard me set karni hai
        const resend = new Resend(process.env.RESEND_API_KEY);

        const { data, error } = await resend.emails.send({
            from:    'SwooTechMart <onboarding@resend.dev>', // Resend ka default domain (free plan)
            to:      [toEmail],
            subject: 'Your OTP Code - SwooTechMart',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 400px; border: 1px solid #e5e7eb; border-radius: 12px;">
                    <h2 style="color:#01A49E; margin-bottom: 8px;">OTP Verification</h2>
                    <p style="color:#666;">Your One-Time Password for SwooTechMart is:</p>
                    <div style="background:#f0fafa; border: 2px dashed #01A49E; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;">
                        <h1 style="letter-spacing: 12px; color: #01A49E; font-size: 40px; margin: 0;">${otp}</h1>
                    </div>
                    <p style="color:#888; font-size: 13px;">⏱ Valid for <strong>3 minutes</strong> only.</p>
                    <p style="color:#bbb; font-size: 11px;">If you didn't request this, please ignore this email.</p>
                </div>
            `,
        });

        if (error) {
            console.error('[OTP] Resend error:', error);
            return { success: false };
        }

        console.log('[OTP] Email sent via Resend, id:', data?.id);
        return { success: true };

    } catch (err) {
        console.error('[OTP] Exception:', err.message);
        return { success: false };
    }
};

module.exports = SendOtp;
