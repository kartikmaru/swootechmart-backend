const https = require('https')

const SendOtp = async (email, otp) => {
    console.log(`[Brevo] Sending OTP to: ${email}`)
    
    const data = JSON.stringify({
        sender: {
            name: 'SwooTechMart',
            email: process.env.SENDER_EMAIL
        },
        to: [{ email: email }],
        subject: 'Your OTP Verification Code - SwooTechMart',
        htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 30px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #14b8a6; text-align: center;">SwooTechMart</h2>
                <p style="color: #333;">Your verification OTP code is:</p>
                <div style="text-align: center; margin: 20px 0; padding: 20px; background: #f0fdf4; border-radius: 8px;">
                    <h1 style="font-size: 42px; letter-spacing: 10px; color: #111; margin: 0;">${otp}</h1>
                </div>
                <p style="color: #777;">This code is valid for <strong>10 minutes</strong>.</p>
                <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
            </div>
        `
    })

    const options = {
        hostname: 'api.brevo.com',
        port: 443,
        path: '/v3/smtp/email',
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'api-key': process.env.BREVO_API_KEY,
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(data)
        }
    }

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let responseData = ''
            res.on('data', (chunk) => { responseData += chunk })
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`[Brevo] OTP sent successfully to ${email} ✅`)
                    resolve(true)
                } else {
                    console.error(`[Brevo] API Error ${res.statusCode}:`, responseData)
                    reject(new Error(`Brevo API error: ${res.statusCode} - ${responseData}`))
                }
            })
        })

        req.on('error', (error) => {
            console.error('[Brevo] Request failed:', error.message)
            reject(error)
        })

        req.write(data)
        req.end()
    })
}

module.exports = SendOtp