const nodemailer = require("nodemailer");

const SendOtp = async (toEmail, otp) => {
    try {
        console.log(`[OTP] Attempting to send to: ${toEmail}`);
        console.log(`[OTP] EMAIL_USER set: ${!!process.env.EMAIL_USER}`);
        console.log(`[OTP] EMAIL_PASS set: ${!!process.env.EMAIL_PASS}`);

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Verify connection first
        await transporter.verify();
        console.log('[OTP] SMTP connection verified');

        const info = await transporter.sendMail({
            from: `Ishop <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: "Your OTP Code - SwooTechMart",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 400px;">
                    <h2 style="color:#01A49E;">OTP Verification</h2>
                    <p>Your One-Time Password is:</p>
                    <h1 style="letter-spacing: 8px; color: #333; font-size: 36px;">${otp}</h1>
                    <p style="color:#666;">Valid for 3 minutes only.</p>
                    <p style="color:#999; font-size:12px;">If you didn't request this, ignore this email.</p>
                </div>
            `,
        });

        console.log(`[OTP] Sent successfully: ${info.response}`);
        return { success: true };

    } catch (error) {
        console.error(`[OTP] FAILED: ${error.message}`);
        console.error(`[OTP] Error code: ${error.code}`);
        console.error(`[OTP] Error stack: ${error.stack?.split('\n')[0]}`);
        return { success: false };
    }
};

module.exports = SendOtp;
