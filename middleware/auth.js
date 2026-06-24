var jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');

const protect = async (req, res, next) => {
    let token = null

    // 1st priority: httpOnly cookie (works on same-origin / correctly configured cross-origin)
    if (req.cookies && req.cookies.jwt) {
        token = req.cookies.jwt
    }

    // 2nd priority: Authorization header — supports both plain token and "Bearer <token>" format
    // This is the fallback for cross-origin deployments where cookies are blocked
    if (!token && req.headers.authorization) {
        const authHeader = req.headers.authorization
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.slice(7).trim()   // strip "Bearer " prefix
        } else {
            token = authHeader.trim()             // plain token (legacy support)
        }
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            msg: "Token is missing"
        })
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY)
        req.user = await UserModel.findById(decoded.id).select("-password")

        if (!req.user) {
            return res.status(403).json({
                success: false,
                msg: "User Not Found"
            })
        }

        next()
    } catch (err) {
        // jwt.verify throws on expired / malformed token — return clean 401 instead of crash
        return res.status(401).json({
            success: false,
            msg: "Invalid or expired token"
        })
    }
}

function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(403).json({
                success: false,
                msg: "User Not Found"
            })
        }

        if (!roles.includes(req.user.role)) {
            return res.status(402).json({
                success: false,
                msg: "Not Authorized"
            })
        }

        next()
    }
}

module.exports = { protect, authorize }
