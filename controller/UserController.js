const ColouserModel = require("../models/ColorModel")
const UserModel = require("../models/UserModel")
const { sendConflict, sendBadRequest, sendSuccess, serverError, notFound } = require("../Utils/Response")
const Cryptr = require('cryptr');
const SendOtp = require("../Utils/SendOtpMail");
const generateToken = require("../Utils/generateToken");
const cryptr = new Cryptr(process.env.SECRET_KEY);


const Register = async (req, res) => {
    try {
        const { name, email, password } = req.body

        if (!name || !email || !password) {
            return sendBadRequest(res, "Name, Email and Password are required")
        }

        const existing = await UserModel.findOne({ email })
        if (existing) return sendConflict(res, "An account with this email already exists")

        const encryptedPassword = cryptr.encrypt(password)
        const otp       = Math.floor(100000 + Math.random() * 900000)
        const otpExpire = new Date(Date.now() + 10 * 60 * 1000)   // 10 minutes

        const NewUser = await UserModel.create({
            name,
            email,
            password: encryptedPassword,
            otp,
            otpExpire,
        })

        // Send OTP email (non-blocking — fire and forget, don't await)
        SendOtp(email, otp)

        // Return user details so frontend can redirect to OTP page
        // Note: cookie is NOT set here — only set after email is verified in verifyEmail
        return sendSuccess(res, {
            id:    NewUser._id,
            name:  NewUser.name,
            email: NewUser.email,
        }, {}, "Account created — please verify your email with the OTP sent")

    } catch (error) {
        serverError(res, error)
    }
}

const Login = async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return sendBadRequest(res, "Email and Password are required")
        }

        const user = await UserModel.findOne({ email })
        if (!user) return sendBadRequest(res, "User does not Exist")

        const decryptedPass = cryptr.decrypt(user.password)

        if (decryptedPass !== password) {
            return sendBadRequest(res, "Incorrect Password")
        }

        const token = generateToken(user._id)

        // Cross-origin cookie requirements:
        //   Production (Render HTTPS → Vercel): secure:true + sameSite:'None'
        //   sameSite:'None' REQUIRES secure:true — browsers block otherwise
        //   Development (localhost HTTP):        secure:false + sameSite:'Lax'
        const isProd = process.env.NODE_ENV === 'production'

        res.cookie('jwt', token, {
            maxAge:   30 * 24 * 60 * 60 * 1000,   // 30 days
            httpOnly: true,                          // inaccessible to JS — XSS protection
            secure:   isProd,                        // HTTPS only in production
            sameSite: isProd ? 'None' : 'Lax',      // cross-origin in prod
            path:     '/',                           // available for all routes
        })

        return sendSuccess(res, {
            id:    user._id,
            name:  user.name,
            email: user.email,
            role:  user.role,
            token,   // frontend stores in localStorage as Authorization header fallback
        }, {}, "Logged In Successfully")

    } catch (error) {
        serverError(res, error)
    }
}

const verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body

        const user = await UserModel.findOne({ email })
        if (!user) return notFound(res, "User Not Found")

        if (user.isVerified) {
            // Already verified — just log them in
            const token  = generateToken(user._id)
            const isProd = process.env.NODE_ENV === 'production'
            res.cookie('jwt', token, {
                maxAge: 30 * 24 * 60 * 60 * 1000,
                httpOnly: true, secure: isProd, sameSite: isProd ? 'None' : 'Lax', path: '/',
            })
            return sendSuccess(res, {
                id: user._id, name: user.name, email: user.email, role: user.role, token,
            }, {}, "Email already verified — logged in")
        }

        if (user.otp !== parseInt(otp)) {
            return sendBadRequest(res, "Invalid OTP — please check and try again")
        }

        if (user.otpExpire < Date.now()) {
            return sendBadRequest(res, "OTP has expired — please request a new one")
        }

        // Mark email as verified
        user.isVerified  = true
        user.otpExpire   = undefined
        user.otp         = undefined
        await user.save()

        // Auto-login: generate token + set cookie — same as Login
        const token  = generateToken(user._id)
        const isProd = process.env.NODE_ENV === 'production'

        res.cookie('jwt', token, {
            maxAge:   30 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure:   isProd,
            sameSite: isProd ? 'None' : 'Lax',
            path:     '/',
        })

        // Return token so frontend can save to localStorage (same pattern as Login)
        return sendSuccess(res, {
            id:    user._id,
            name:  user.name,
            email: user.email,
            role:  user.role,
            token,
        }, {}, "Email verified successfully — welcome!")

    } catch (error) {
        return serverError(res, error)
    }
}

const resetOtp = async (req, res) => {
    try {
        const { email } = req.body
        const user = await UserModel.findOne({ email })
        if (!user) return notFound(res, "User Not Found")

        const otp = Math.floor(100000 + Math.random() * 900000)
        user.otp       = otp
        user.otpExpire = new Date(Date.now() + 10 * 60 * 1000)
        await user.save()

        SendOtp(email, otp)
        return sendSuccess(res, null, {}, "OTP resent successfully")

    } catch (error) {
        return serverError(res, error)
    }
}
const getMe = async (req, res) => {

    try {

        res.status(200).json({
            msg: "User Find",
            success: true,
            user: req.user
        })

    } catch (error) {
        return serverError(res, error)
    }


}


const logout = (req, res) => {
    try {
        const isProd = process.env.NODE_ENV === 'production'

        // MUST mirror all options used when setting the cookie — otherwise browser won't clear it
        res.clearCookie('jwt', {
            httpOnly: true,
            secure:   isProd,
            sameSite: isProd ? 'None' : 'Lax',
            path:     '/',
        })
        return sendSuccess(res)
    } catch (error) {
        console.log(error)
        return serverError(res, error)
    }
}

const delete_addresses = async (req, res) => {
    try {

        const userId = req.user._id
        const { index } = req.body

        const user = await UserModel.findById(userId)

        if (!user) {
            return notFound(res, "User Not Found")
        }

        if (index < 0 || index >= user.addresses.length) {
            return sendBadRequest(res, "Invalid Address Index")
        }

        user.addresses.splice(index, 1)

        await user.save()

        return sendSuccess(
            res,
            user.addresses,
            {},
            "Address Deleted Successfully"
        )

    } catch (error) {
        return serverError(res, error)
    }
}

const addAddresses = async (req, res) => {
    try {
        const userId = req.user._id
        const address = req.body

        const user = await UserModel.findById(userId)

        if (!user) {
            return notFound(res, "User Not Found")
        }

        user.addresses.push(address)

        await user.save()

        return sendSuccess(
            res,
            user.addresses,
            {},
            "Address Added Successfully"
        )

    } catch (error) {
        console.log(error)
    }
}


// Admin-specific login — only allows admin and superAdmin roles
const AdminLogin = async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return sendBadRequest(res, "Email and Password are required")
        }

        const user = await UserModel.findOne({ email })
        if (!user) return sendBadRequest(res, "User does not Exist")

        // Role check BEFORE password — don't give timing info to attackers
        const allowedRoles = ['admin', 'superAdmin']
        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({
                success: false,
                msg: "Access denied — admin account required",
            })
        }

        const decryptedPass = cryptr.decrypt(user.password)
        if (decryptedPass !== password) {
            return sendBadRequest(res, "Incorrect Password")
        }

        const token  = generateToken(user._id)
        const isProd = process.env.NODE_ENV === 'production'

        res.cookie('jwt', token, {
            maxAge:   30 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure:   isProd,
            sameSite: isProd ? 'None' : 'Lax',
            path:     '/',
        })

        return sendSuccess(res, {
            id:    user._id,
            name:  user.name,
            email: user.email,
            role:  user.role,
            token,
        }, {}, "Admin Login Successful")

    } catch (error) {
        serverError(res, error)
    }
}

module.exports = { Register, verifyEmail, resetOtp, Login, AdminLogin, getMe, logout, addAddresses, delete_addresses }