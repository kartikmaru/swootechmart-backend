const nodemailer = require("nodemailer");

const SendOtp = async (toEmail, otp) => {
    try {
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
            text: `Your OTP is ${otp}. It is valid for 5 minutes.`,
            
            // optional HTML (better UI)
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color:#01A49E;">OTP Verification</h2>
                    <p>Your One-Time Password (OTP) is:</p>
                    <h1 style="letter-spacing: 5px;">${otp}</h1>
                    <p>This OTP is valid for 3 minutes.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);

        console.log("Email sent: ", info.response);

        return {
            success: true,
            message: "OTP sent successfully",
        };

    } catch (error) {
        console.error("Error sending email:", error);

        return {
            success: false,
            message: "Failed to send OTP",
        };
    }
};

module.exports = SendOtp;