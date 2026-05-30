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

        const user = await UserModel.findOne({ email })
        if (user) return sendConflict(res, "User Already Exist")

        if (!name || !email || !password) {
            return sendBadRequest(res, "Name, Email and Password are required")
        }

        const encryptedPassword = cryptr.encrypt(password)
        const otp = Math.floor(100000 + Math.random() * 900000)
        const otpExpire = new Date(Date.now() + 3 * 60 * 1000)

        const NewUser = await UserModel.create({
            name,
            email,
            password: encryptedPassword,
            otp,
            otpExpire
        })

        sendSuccess(res, {
            id: NewUser._id,
            name: NewUser.name,
            email: NewUser.email
        }, {}, "User Created")

        SendOtp(email, otp)

    } catch (error) {
        serverError(res, error)
    }
}

const Login = async (req, res) => {
    try {
        const { email, password } = req.body

        const user = await UserModel.findOne({ email })
        if (!user && user.isVerified !== true) return sendConflict(res, "User does not Exist")

        if (!email || !password) {
            return sendBadRequest(res, "Email and Password are required")
        }

        const decryptedPass = cryptr.decrypt(user.password);

        if (decryptedPass !== password) {
            return sendBadRequest(res, "Incorrect Password")
        }
        const token = generateToken(user._id)

        const isProduction = process.env.NODE_ENV === 'production'

        res.cookie('jwt', token, {
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 Days
            httpOnly: true,
            secure: isProduction,           // true on HTTPS (Render), false on localhost
            sameSite: isProduction ? 'None' : 'Lax'  // None for cross-origin HTTPS, Lax for local
        });

        sendSuccess(res, {
            id: user._id,
            name: user.name,
            email: user.email
        }, {}, "User Loged In Successfully")

    } catch (error) {
        serverError(res, error)
    }
}

const verifyEmail = async (req, res) => {
    const { email, otp } = req.body
    const user = await UserModel.findOne({ email })
    if (!user) return notFound(res, "User Not Found")
    if (user.isVerified) {
        return sendBadRequest(res, "Email Already Varified")
    }
    if (user.otp !== parseInt(otp)) {
        return sendBadRequest(res, "Invalid OTP")
    }
    if (user.otpExpire < Date.now()) {
        return sendBadRequest(res, "Otp Expired")
    }
    user.isVerified = true
    user.otpExpire = undefined
    user.otp = undefined
    user.save()
    sendSuccess(res, "Email Verified Successfully")
}

const resetOtp = async (req, res) => {

    try {

        const { email } = req.body
        const user = await UserModel.findOne({ email })
        if (!user) {
            return notFound(res, "User Not Found")
        }
        const opt = Math.floor(100000 + Math.random() * 900000)
        user.otp = otp
        user.otpExpire = new Date(Date.now() + 3 * 60 * 1000)
        await user.save()
        const mail_response = await SendOtp(email, otp)
        return sendSuccess(res, "Otp Resended")

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
        res.clearCookie('jwt');
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


module.exports = { Register, verifyEmail, resetOtp, Login, getMe, logout, addAddresses, delete_addresses }