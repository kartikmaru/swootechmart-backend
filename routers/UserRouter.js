const UserRouter = require("express").Router()

const {
    Register, verifyEmail, resetOtp,
    Login, AdminLogin,
    getMe, updateProfile, changePassword, logout, addAddresses, delete_addresses
} = require("../controller/UserController")
const { protect } = require("../middleware/auth")

UserRouter.post("/create",           Register)
UserRouter.post("/verify-otp",       verifyEmail)
UserRouter.post("/reset-otp",        resetOtp)
UserRouter.post("/login",            Login)
UserRouter.post("/logout",           logout)
UserRouter.post("/admin-login",      AdminLogin)

UserRouter.get("/get",               protect, getMe)
UserRouter.put("/update-profile",    protect, updateProfile)
UserRouter.patch("/change-password", protect, changePassword)
UserRouter.post("/addaddresses",     protect, addAddresses)
UserRouter.put("/deleteaddress",     protect, delete_addresses)

module.exports = UserRouter
