// SendOtpMail.js — OTP email via Brevo (formerly Sendinblue)
// Uses Brevo Transactional Email API v3
// Free plan: 300 emails/day, send to ANY email address (no domain verification needed)
// Docs: https://developers.brevo.com/reference/sendtransacemail

const https = require('https')

const SendOtp = async (toEmail, otp) => {
    console.log(`[Brevo/OTP] Sending to: ${toEmail}`)

    if (!process.env.BREVO_API_KEY) {
        console.error('[Brevo/OTP] BREVO_API_KEY not set in environment')
        console.log(`[OTP FALLBACK] OTP for ${toEmail}: ${otp}`)
        return false
    }

    if (!process.env.SENDER_EMAIL) {
        console.error('[Brevo/OTP] SENDER_EMAIL not set in environment')
        return false
    }

    const payload = JSON.stringify({
        sender:      { name: 'SwooTechMart', email: process.env.SENDER_EMAIL },
        to:          [{ email: toEmail }],
        subject:     'Your OTP Verification Code — SwooTechMart',
        htmlContent: buildOtpHtml(otp),
    })

    return new Promise((resolve) => {
        const req = https.request(
            {
                hostname: 'api.brevo.com',
                port:     443,
                path:     '/v3/smtp/email',
                method:   'POST',
                headers: {
                    'accept':         'application/json',
                    'api-key':        process.env.BREVO_API_KEY,
                    'content-type':   'application/json',
                    'content-length': Buffer.byteLength(payload),
                },
            },
            (res) => {
                let body = ''
                res.on('data', (chunk) => { body += chunk })
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        console.log(`[Brevo/OTP] Sent successfully to ${toEmail} ✅`)
                        resolve(true)
                    } else {
                        console.error(`[Brevo/OTP] API error ${res.statusCode}:`, body)
                        // Dev fallback — print OTP so testing isn't blocked
                        if (process.env.NODE_ENV !== 'production') {
                            console.log(`[OTP FALLBACK] OTP for ${toEmail}: ${otp}`)
                        }
                        resolve(false)
                    }
                })
            }
        )
        req.on('error', (err) => {
            console.error('[Brevo/OTP] Request error:', err.message)
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[OTP FALLBACK] OTP for ${toEmail}: ${otp}`)
            }
            resolve(false)
        })
        req.write(payload)
        req.end()
    })
}

function buildOtpHtml(otp) {
    return `
        <div style="font-family:Arial,sans-serif;max-width:440px;margin:0 auto;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#01A49E,#059669);padding:24px;text-align:center;">
                <h1 style="color:white;margin:0;font-size:20px;font-weight:800;">SwooTechMart</h1>
                <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">Email Verification</p>
            </div>
            <div style="padding:28px 24px;">
                <p style="color:#374151;font-size:15px;margin:0 0 8px;">Hi there,</p>
                <p style="color:#6b7280;font-size:14px;margin:0 0 20px;line-height:1.6;">
                    Your One-Time Password (OTP) for SwooTechMart verification is:
                </p>
                <div style="background:#f0fafa;border:2px dashed #01A49E;border-radius:12px;padding:20px;text-align:center;margin:0 0 20px;">
                    <h2 style="letter-spacing:16px;color:#01A49E;font-size:42px;margin:0;font-weight:900;font-family:monospace;">${otp}</h2>
                </div>
                <p style="color:#9ca3af;font-size:13px;margin:0 0 8px;">&#x23F0; Valid for <strong>10 minutes</strong> only.</p>
                <p style="color:#d1d5db;font-size:11px;margin:0;">If you didn't request this, you can safely ignore this email.</p>
            </div>
            <div style="background:#f9fafb;padding:14px 24px;border-top:1px solid #e5e7eb;text-align:center;">
                <p style="font-size:11px;color:#9ca3af;margin:0;">&copy; ${new Date().getFullYear()} SwooTechMart. All rights reserved.</p>
            </div>
        </div>
    `
}

module.exports = SendOtp
