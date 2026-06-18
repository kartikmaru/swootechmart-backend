const nodemailer = require("nodemailer");

const SendOtp = async (toEmail, otp) => {
    try {
        console.log(`[OTP] Sending to: ${toEmail}, USER: ${process.env.EMAIL_USER}`);

        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: `Ishop Website <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: "Your OTP Code",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color:#01A49E;">OTP Verification</h2>
                    <p>Your One-Time Password (OTP) is:</p>
                    <h1 style="letter-spacing: 5px; color: #333;">${otp}</h1>
                    <p>This OTP is valid for 3 minutes.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[OTP] Email sent successfully to ${toEmail}:`, info.response);
        return { success: true, message: "OTP sent successfully" };

    } catch (error) {
        console.error(`[OTP] FAILED to send email to ${toEmail}`);
        console.error(`[OTP] Error code: ${error.code}`);
        console.error(`[OTP] Error message: ${error.message}`);
        return { success: false, message: "Failed to send OTP" };
    }
};

module.exports = SendOtp;
