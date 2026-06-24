// SendOtpMail.js — OTP email using Resend API
//
// FREE PLAN RULES (important):
//   1. from address MUST be 'onboarding@resend.dev' until you verify a custom domain
//   2. 'to' address MUST be your verified Resend account email (the one you signed up with)
//      — Free plan cannot send to arbitrary emails without domain verification
//   3. To send to any email: go to resend.com → Domains → Add & verify your domain
//      Then change 'from' to 'noreply@yourdomain.com'
//
// SETUP STEPS:
//   1. Go to resend.com/api-keys → Create API key → Copy it
//   2. Set RESEND_API_KEY in your .env file (replace 're_your_api_key_here')
//   3. Set OWNER_EMAIL to the email you registered on Resend (for free plan delivery)

const { Resend } = require('resend');

const SendOtp = async (toEmail, otp) => {
    // Check if API key is configured
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_your_api_key_here') {
        console.warn('[OTP] RESEND_API_KEY not set or is placeholder. OTP will only appear in console.')
        console.log(`[OTP FALLBACK] OTP for ${toEmail}: ${otp}`)
        return { success: false, error: 'RESEND_API_KEY not configured' }
    }

    try {
        const resend = new Resend(process.env.RESEND_API_KEY)

        console.log('[OTP] Sending OTP email to:', toEmail)

        const { data, error } = await resend.emails.send({
            // FREE PLAN: must use onboarding@resend.dev as from address
            // After domain verification: 'SwooTechMart <noreply@yourdomain.com>'
            from:    'SwooTechMart <onboarding@resend.dev>',

            // FREE PLAN LIMITATION: only delivers to your Resend verified email
            // For production, use your verified domain and remove this restriction
            to:      [toEmail],

            subject: 'Your OTP Code - SwooTechMart',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 440px; margin: 0 auto;
                            border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">

                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #01A49E, #059669); padding: 24px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 800;">
                            SwooTechMart
                        </h1>
                        <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 13px;">
                            Email Verification
                        </p>
                    </div>

                    <!-- Body -->
                    <div style="padding: 28px 24px;">
                        <p style="color: #374151; font-size: 15px; margin: 0 0 8px;">Hi there,</p>
                        <p style="color: #6b7280; font-size: 14px; margin: 0 0 20px; line-height: 1.6;">
                            Your One-Time Password (OTP) for SwooTechMart account verification is:
                        </p>

                        <!-- OTP Box -->
                        <div style="background: #f0fafa; border: 2px dashed #01A49E; border-radius: 12px;
                                    padding: 20px; text-align: center; margin: 0 0 20px;">
                            <h2 style="letter-spacing: 16px; color: #01A49E; font-size: 42px;
                                       margin: 0; font-weight: 900; font-family: monospace;">
                                ${otp}
                            </h2>
                        </div>

                        <p style="color: #9ca3af; font-size: 13px; margin: 0 0 8px;">
                            &#x23F0; Valid for <strong>3 minutes</strong> only.
                        </p>
                        <p style="color: #d1d5db; font-size: 11px; margin: 0;">
                            If you didn't request this, you can safely ignore this email.
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="background: #f9fafb; padding: 14px 24px; border-top: 1px solid #e5e7eb;
                                text-align: center;">
                        <p style="font-size: 11px; color: #9ca3af; margin: 0;">
                            &copy; ${new Date().getFullYear()} SwooTechMart. All rights reserved.
                        </p>
                    </div>
                </div>
            `,
        })

        if (error) {
            // Log the full error object for debugging
            console.error('[OTP] Resend API error:', JSON.stringify(error, null, 2))

            // Free plan: can only send to verified email
            if (error.statusCode === 403 || error.name === 'validation_error') {
                console.warn('[OTP] Resend free plan restriction — domain not verified.')
                console.log(`[OTP FALLBACK] OTP for ${toEmail}: ${otp}`)
                // In development, return success so registration doesn't fail
                if (process.env.NODE_ENV !== 'production') {
                    return { success: true, devFallback: true }
                }
            }

            return { success: false, error: error.message || JSON.stringify(error) }
        }

        console.log('[OTP] Email sent successfully. Resend ID:', data?.id)
        return { success: true, id: data?.id }

    } catch (err) {
        console.error('[OTP] Unexpected exception:', err.message, err.stack)
        // In development, print OTP to console as fallback so testing isn't blocked
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[OTP FALLBACK] OTP for ${toEmail}: ${otp}`)
            return { success: true, devFallback: true }
        }
        return { success: false, error: err.message }
    }
}

module.exports = SendOtp
