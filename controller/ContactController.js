const { Resend } = require('resend')
const { serverError, sendSuccess, sendBadRequest } = require('../Utils/Response')

const sendContactEmail = async (req, res) => {
    try {
        const { name, email, subject, message } = req.body

        if (!name?.trim() || !email?.trim() || !message?.trim()) {
            return sendBadRequest(res, 'Name, email and message are required')
        }

        // Guard: API key not configured
        if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_your_api_key_here') {
            console.warn('[Contact] RESEND_API_KEY not configured — email not sent')
            console.log('[Contact FALLBACK] Contact from:', name, email, message)
            // Still return success so frontend doesn't show error to user
            return sendSuccess(res, null, {}, 'Message received (email notification pending setup)')
        }

        const resend = new Resend(process.env.RESEND_API_KEY)

        // Email to you (site owner) — contains user's message
        const { error: ownerError } = await resend.emails.send({
            from:    'SwooTechMart Contact <onboarding@resend.dev>',
            to:      [process.env.OWNER_EMAIL || process.env.EMAIL_USER],
            subject: `📬 New Contact Form: ${subject || 'General Inquiry'} — from ${name}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                    
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #01A49E, #059669); padding: 24px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 800;">📬 New Contact Message</h1>
                        <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 14px;">SwooTechMart Contact Form</p>
                    </div>

                    <!-- Body -->
                    <div style="padding: 28px 24px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; width: 30%;">
                                    <span style="font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">From</span>
                                </td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                                    <span style="font-size: 14px; color: #111827; font-weight: 700;">${name}</span>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                                    <span style="font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Email</span>
                                </td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                                    <a href="mailto:${email}" style="font-size: 14px; color: #01A49E; font-weight: 600; text-decoration: none;">${email}</a>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                                    <span style="font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Subject</span>
                                </td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                                    <span style="font-size: 14px; color: #111827;">${subject || 'General Inquiry'}</span>
                                </td>
                            </tr>
                        </table>

                        <!-- Message -->
                        <div style="margin-top: 20px;">
                            <p style="font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px;">Message</p>
                            <div style="background: #f9fafb; border-left: 4px solid #01A49E; border-radius: 4px; padding: 16px; font-size: 14px; color: #374151; line-height: 1.7; white-space: pre-wrap;">${message}</div>
                        </div>

                        <!-- Reply CTA -->
                        <div style="margin-top: 24px; text-align: center;">
                            <a href="mailto:${email}?subject=Re: ${subject || 'Your enquiry'}"
                               style="display: inline-block; background: linear-gradient(135deg, #01A49E, #059669); color: white; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none;">
                                Reply to ${name}
                            </a>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="background: #f9fafb; padding: 14px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="font-size: 11px; color: #9ca3af; margin: 0;">Sent via SwooTechMart Contact Form</p>
                    </div>
                </div>
            `,
        })

        if (ownerError) {
            console.error('[Contact] Resend owner email error:', JSON.stringify(ownerError, null, 2))
            return res.status(500).json({ success: false, message: 'Failed to send message. Please try again.' })
        }

        // Auto-reply to the user who submitted the form
        await resend.emails.send({
            from:    'SwooTechMart Support <onboarding@resend.dev>',
            to:      [email],
            subject: `We received your message — SwooTechMart`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #01A49E, #059669); padding: 24px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 800;">Thanks for reaching out! 👋</h1>
                    </div>
                    <div style="padding: 24px;">
                        <p style="font-size: 15px; color: #374151;">Hi <strong>${name}</strong>,</p>
                        <p style="font-size: 14px; color: #6b7280; line-height: 1.7;">
                            We've received your message and our team will get back to you within <strong>24 hours</strong>.
                        </p>
                        <div style="background: #f0fafa; border-radius: 8px; padding: 14px 16px; margin: 16px 0; font-size: 13px; color: #374151;">
                            <strong>Your message:</strong><br/>
                            <span style="color: #6b7280;">${message.substring(0, 200)}${message.length > 200 ? '…' : ''}</span>
                        </div>
                        <p style="font-size: 13px; color: #9ca3af;">— SwooTechMart Support Team</p>
                    </div>
                </div>
            `
        }).catch(() => {})   // auto-reply failure should not block success response

        return sendSuccess(res, null, {}, 'Message sent successfully')

    } catch (error) {
        console.error('[Contact] Error:', error.message)
        return serverError(res)
    }
}

module.exports = { sendContactEmail }
