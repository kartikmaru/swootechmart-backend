const jwt  = require('jsonwebtoken');
const UserModel = require('../models/UserModel');

// ── protect middleware ────────────────────────────────────────────────────────
// Token reading priority:
//   1. httpOnly cookie 'jwt'       — works on same-origin and correctly-configured CORS
//   2. Authorization header        — fallback for cross-origin (Vercel → Render)
//      Accepts:  "Bearer <token>"  (standard)
//                "<token>"         (legacy plain token)
const protect = async (req, res, next) => {
    let token   = null
    let source  = null   // for debug logging

    // ── 1. Cookie ─────────────────────────────────────────────────────────────
    if (req.cookies?.jwt) {
        token  = req.cookies.jwt
        source = 'cookie'
    }

    // ── 2. Authorization header ───────────────────────────────────────────────
    if (!token && req.headers.authorization) {
        const authHeader = req.headers.authorization.trim()
        if (authHeader.startsWith('Bearer ')) {
            token  = authHeader.slice(7).trim()
            source = 'Bearer header'
        } else if (authHeader.length > 0) {
            token  = authHeader
            source = 'plain header'
        }
    }

    if (!token) {
        console.warn(`[Auth] No token — ${req.method} ${req.path}`)
        return res.status(401).json({
            success: false,
            msg: "Authentication required — no token provided",
        })
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY)
        const user    = await UserModel.findById(decoded.id).select("-password")

        if (!user) {
            return res.status(403).json({
                success: false,
                msg: "User account not found",
            })
        }

        req.user = user
        next()

    } catch (err) {
        // Distinguish between expired and malformed tokens for better UX
        const msg = err.name === 'TokenExpiredError'
            ? 'Session expired — please login again'
            : 'Invalid token — please login again'

        console.warn(`[Auth] Token invalid (${err.name}) via ${source} — ${req.method} ${req.path}`)

        return res.status(401).json({
            success: false,
            msg,
        })
    }
}

// ── authorize middleware ──────────────────────────────────────────────────────
function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(403).json({ success: false, msg: "User not found" })
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                msg: `Role '${req.user.role}' is not authorized to access this route`,
            })
        }
        next()
    }
}

module.exports = { protect, authorize }
