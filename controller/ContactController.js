// ContactController.js — Contact form email via Brevo
const https = require('https')
const { serverError, sendSuccess, sendBadRequest } = require('../Utils/Response')

// ── Send email via Brevo API ──────────────────────────────────────────────────
function sendBrevoEmail({ to, subject, html }) {
    return new Promise((resolve, reject) => {
        if (!process.env.BREVO_API_KEY) {
            return reject(new Error('BREVO_API_KEY not configured'))
        }

        const payload = JSON.stringify({
            sender:      { name: 'SwooTechMart', email: process.env.SENDER_EMAIL },
            to:          [{ email: to }],
            subject,
            htmlContent: html,
        })

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
                res.on('data', (c) => { body += c })
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(true)
                    } else {
                        reject(new Error(`Brevo API ${res.statusCode}: ${body}`))
                    }
                })
            }
        )
        req.on('error', reject)
        req.write(payload)
        req.end()
    })
}

// ── POST /api/contact/send ────────────────────────────────────────────────────
const sendContactEmail = async (req, res) => {
    try {
        const { name, email, subject, message } = req.body

        if (!name?.trim() || !email?.trim() || !message?.trim()) {
            return sendBadRequest(res, 'Name, email and message are required')
        }

        const ownerEmail = process.env.OWNER_EMAIL || process.env.EMAIL_USER

        if (!process.env.BREVO_API_KEY || !ownerEmail) {
            console.warn('[Contact] BREVO_API_KEY or OWNER_EMAIL not set')
            console.log('[Contact FALLBACK]', { name, email, subject, message })
            return sendSuccess(res, null, {}, 'Message received — email delivery pending setup')
        }

        // Email to site owner
        await sendBrevoEmail({
            to:      ownerEmail,
            subject: `\uD83D\uDCEC New Contact: ${subject || 'General Inquiry'} — from ${name}`,
            html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                    <div style="background:linear-gradient(135deg,#01A49E,#059669);padding:24px;text-align:center;">
                        <h1 style="color:white;margin:0;font-size:22px;font-weight:800;">\uD83D\uDCEC New Contact Message</h1>
                        <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">SwooTechMart Contact Form</p>
                    </div>
                    <div style="padding:28px 24px;">
                        <table style="width:100%;border-collapse:collapse;">
                            <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;width:30%;font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;">From</td>
                                <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;font-weight:700;">${name}</td></tr>
                            <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;">Email</td>
                                <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;"><a href="mailto:${email}" style="font-size:14px;color:#01A49E;font-weight:600;">${email}</a></td></tr>
                            <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;">Subject</td>
                                <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;">${subject || 'General Inquiry'}</td></tr>
                        </table>
                        <div style="margin-top:20px;">
                            <p style="font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-bottom:10px;">Message</p>
                            <div style="background:#f9fafb;border-left:4px solid #01A49E;border-radius:4px;padding:16px;font-size:14px;color:#374151;line-height:1.7;white-space:pre-wrap;">${message}</div>
                        </div>
                        <div style="margin-top:24px;text-align:center;">
                            <a href="mailto:${email}?subject=Re: ${subject || 'Your enquiry'}"
                               style="display:inline-block;background:linear-gradient(135deg,#01A49E,#059669);color:white;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">
                                Reply to ${name}
                            </a>
                        </div>
                    </div>
                    <div style="background:#f9fafb;padding:14px 24px;text-align:center;border-top:1px solid #e5e7eb;">
                        <p style="font-size:11px;color:#9ca3af;margin:0;">Sent via SwooTechMart Contact Form</p>
                    </div>
                </div>
            `,
        })

        console.log('[Contact] Owner email sent via Brevo ✅')

        // Auto-reply to user (non-critical — don't fail if this fails)
        sendBrevoEmail({
            to:      email,
            subject: `We received your message — SwooTechMart`,
            html: `
                <div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                    <div style="background:linear-gradient(135deg,#01A49E,#059669);padding:24px;text-align:center;">
                        <h1 style="color:white;margin:0;font-size:20px;font-weight:800;">Thanks for reaching out! \uD83D\uDC4B</h1>
                    </div>
                    <div style="padding:24px;">
                        <p style="font-size:15px;color:#374151;">Hi <strong>${name}</strong>,</p>
                        <p style="font-size:14px;color:#6b7280;line-height:1.7;">We've received your message and our team will get back to you within <strong>24 hours</strong>.</p>
                        <div style="background:#f0fafa;border-radius:8px;padding:14px 16px;margin:16px 0;font-size:13px;color:#374151;">
                            <strong>Your message:</strong><br/>
                            <span style="color:#6b7280;">${message.substring(0, 200)}${message.length > 200 ? '…' : ''}</span>
                        </div>
                        <p style="font-size:13px;color:#9ca3af;">— SwooTechMart Support Team</p>
                    </div>
                </div>
            `,
        }).catch((e) => console.warn('[Contact] Auto-reply failed (non-critical):', e.message))

        return sendSuccess(res, null, {}, 'Message sent successfully')

    } catch (error) {
        console.error('[Contact] Error:', error.message)
        return serverError(res)
    }
}

module.exports = { sendContactEmail }
