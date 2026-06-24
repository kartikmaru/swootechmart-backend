// SendOtpMail.js — OTP email via Resend API
//
// ─── RESEND FREE PLAN RULES ───────────────────────────────────────────────────
//   • from:  MUST be 'onboarding@resend.dev' (until you verify a custom domain)
//   • to:    MUST be your Resend account's verified email
//            You CANNOT send to arbitrary user emails on the free plan
//
// ─── HOW TO FIX THE FREE PLAN RESTRICTION ────────────────────────────────────
//   OPTION A — Quick testing (no domain needed):
//     1. Go to resend.com → Audiences (or Settings → Email Addresses)
//     2. Add the user's email as a "Verified Email"
//     3. Resend will send a verification link to that email
//     4. Once verified, emails can be sent to it on free plan
//
//   OPTION B — Production (recommended):
//     1. resend.com → Domains → Add Domain → enter yourdomain.com
//     2. Add the 3 DNS records shown (MX, TXT, CNAME) to your domain registrar
//     3. Click "Verify" in Resend dashboard (takes 1–48 hours)
//     4. Change 'from' below to: 'SwooTechMart <noreply@yourdomain.com>'
//     5. Remove the OWNER_EMAIL workaround below
//
// ─── CURRENT WORKAROUND FOR FREE PLAN ────────────────────────────────────────
//   We send the OTP email to OWNER_EMAIL (your verified Resend account email)
//   instead of the actual user's email. The owner then manually shares the OTP.
//   OTP is also printed to console for development convenience.
// ─────────────────────────────────────────────────────────────────────────────

const { Resend } = require('resend')

const SendOtp = async (toEmail, otp) => {

    // Always print OTP to console — useful for dev and as last-resort fallback
    console.log(`[OTP] Code for ${toEmail}: ${otp}`)

    // Guard: API key not configured
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_your_api_key_here') {
        console.warn('[OTP] RESEND_API_KEY not set — email skipped, OTP logged above')
        return { success: false, devFallback: true, error: 'RESEND_API_KEY not configured' }
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    // ── Determine recipient ────────────────────────────────────────────────────
    // DOMAIN_VERIFIED = true  → can send to any email (production with custom domain)
    // DOMAIN_VERIFIED = false → free plan — send to OWNER_EMAIL only
    const domainVerified = process.env.RESEND_DOMAIN_VERIFIED === 'true'
    const ownerEmail     = process.env.OWNER_EMAIL || process.env.EMAIL_USER

    // Actual recipient: user's email if domain verified, else owner's verified email
    const actualRecipient = domainVerified ? toEmail : ownerEmail

    if (!domainVerified) {
        console.warn(`[OTP] Free plan mode — sending email to OWNER_EMAIL (${ownerEmail}) instead of user (${toEmail})`)
        console.warn('[OTP] Set RESEND_DOMAIN_VERIFIED=true after verifying your domain at resend.com/domains')
    }

    if (!actualRecipient) {
        console.error('[OTP] No recipient email — set OWNER_EMAIL in .env')
        return { success: false, error: 'No recipient configured' }
    }

    // ── From address ──────────────────────────────────────────────────────────
    // Free plan: must use onboarding@resend.dev
    // After domain verification: change to 'SwooTechMart <noreply@yourdomain.com>'
    const fromAddress = domainVerified
        ? (process.env.RESEND_FROM_EMAIL || 'SwooTechMart <noreply@yourdomain.com>')
        : 'SwooTechMart <onboarding@resend.dev>'

    try {
        console.log(`[OTP] Sending via Resend: from=${fromAddress} to=${actualRecipient}`)

        const { data, error } = await resend.emails.send({
            from:    fromAddress,
            to:      [actualRecipient],
            subject: domainVerified
                ? `Your OTP Code - SwooTechMart`
                : `[SwooTechMart] OTP for ${toEmail} is: ${otp}`,   // subject includes user email + OTP for owner reference
            html: buildOtpHtml(otp, toEmail, domainVerified),
        })

        if (error) {
            console.error('[OTP] Resend error:', JSON.stringify(error, null, 2))

            // Free plan restriction — still return success (OTP is in console)
            if (error.statusCode === 403 || error.name === 'validation_error') {
                console.log(`[OTP FALLBACK] Domain not verified. OTP for ${toEmail}: ${otp}`)
                return { success: true, devFallback: true }
            }

            return { success: false, error: error.message || JSON.stringify(error) }
        }

        console.log('[OTP] Email sent. Resend ID:', data?.id)
        return { success: true, id: data?.id }

    } catch (err) {
        console.error('[OTP] Exception:', err.message)
        // Return success in dev so registration flow isn't blocked
        return {
            success:     process.env.NODE_ENV !== 'production',
            devFallback: true,
            error:       err.message,
        }
    }
}

// ── HTML template ─────────────────────────────────────────────────────────────
function buildOtpHtml(otp, userEmail, domainVerified) {
    const note = !domainVerified
        ? `<p style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:10px 14px;font-size:12px;color:#856404;margin:0 0 16px;">
               <strong>Note (Dev/Testing):</strong> This OTP was requested by <strong>${userEmail}</strong>.
               Share it with them manually until domain verification is complete.
           </p>`
        : ''

    return `
        <div style="font-family:Arial,sans-serif;max-width:440px;margin:0 auto;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#01A49E,#059669);padding:24px;text-align:center;">
                <h1 style="color:white;margin:0;font-size:20px;font-weight:800;">SwooTechMart</h1>
                <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">Email Verification</p>
            </div>
            <div style="padding:28px 24px;">
                ${note}
                <p style="color:#374151;font-size:15px;margin:0 0 8px;">Hi there,</p>
                <p style="color:#6b7280;font-size:14px;margin:0 0 20px;line-height:1.6;">
                    Your One-Time Password (OTP) for SwooTechMart verification is:
                </p>
                <div style="background:#f0fafa;border:2px dashed #01A49E;border-radius:12px;padding:20px;text-align:center;margin:0 0 20px;">
                    <h2 style="letter-spacing:16px;color:#01A49E;font-size:42px;margin:0;font-weight:900;font-family:monospace;">${otp}</h2>
                </div>
                <p style="color:#9ca3af;font-size:13px;margin:0 0 8px;">&#x23F0; Valid for <strong>3 minutes</strong> only.</p>
                <p style="color:#d1d5db;font-size:11px;margin:0;">If you didn't request this, ignore this email.</p>
            </div>
            <div style="background:#f9fafb;padding:14px 24px;border-top:1px solid #e5e7eb;text-align:center;">
                <p style="font-size:11px;color:#9ca3af;margin:0;">&copy; ${new Date().getFullYear()} SwooTechMart. All rights reserved.</p>
            </div>
        </div>
    `
}

module.exports = SendOtp
