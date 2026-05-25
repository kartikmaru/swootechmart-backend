var jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');

const protect = async (req, res, next) => {
    let token = null
    if (req.cookies && req.cookies.jwt) {
        token = req.cookies.jwt
    }
    if (!token && req.headers.authorization) {
        token = req.headers.authorization
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            msg: "Token is missing"
        })
    }

    var decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = await UserModel.findById({ _id: decoded.id }).select("-password")

    if (!req.user) {
        return res.status(403).json({
            success: false,
            msg: "User Not Found"
        })
    }

    next()

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