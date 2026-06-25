const nodemailer = require('nodemailer')

// Brevo SMTP transporter
const transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST,
    port: Number(process.env.BREVO_SMTP_PORT),
    secure: false,   // 587 ke liye false
    auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_KEY,
    },
})

const SendOtp = async (email, otp) => {
    try {
        await transporter.sendMail({
            from: `"SwooTechMart" <${process.env.SENDER_EMAIL}>`,
            to: email,
            subject: 'Your OTP Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 30px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #14b8a6;">SwooTechMart</h2>
                    <p>Your verification code is:</p>
                    <h1 style="font-size: 36px; letter-spacing: 5px; color: #111;">${otp}</h1>
                    <p style="color: #777;">This code is valid for 10 minutes.</p>
                    <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore.</p>
                </div>
            `,
        })
        console.log(`[Brevo] OTP sent to ${email}`)
    } catch (error) {
        console.error('[Brevo] Failed to send OTP:', error.message)
    }
}

module.exports = SendOtp