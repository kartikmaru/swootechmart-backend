const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST,
    port: 465,        // ✅ 587 ki jagah 465
    secure: true,     // ✅ 465 ke liye true hona chahiye
    auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_KEY,
    },
})

const SendOtp = async (email, otp) => {
    console.log(`[Brevo] Sending OTP to: ${email}`)
    try {
        const info = await transporter.sendMail({
            from: `"SwooTechMart" <${process.env.SENDER_EMAIL}>`,
            to: email,
            subject: 'Your OTP Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 30px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #14b8a6;">SwooTechMart</h2>
                    <p>Your verification OTP code is:</p>
                    <h1 style="font-size: 36px; letter-spacing: 8px; color: #111; text-align: center;">${otp}</h1>
                    <p style="color: #777;">This code is valid for <strong>10 minutes</strong>.</p>
                    <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore.</p>
                </div>
            `,
        })
        console.log(`[Brevo] OTP sent successfully to ${email} ✅`)
        return true
    } catch (error) {
        console.error('[Brevo] Failed to send OTP:', error.message)
        return false
    }
}

module.exports = SendOtp