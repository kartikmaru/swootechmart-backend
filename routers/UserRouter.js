const UserRouter = require("express").Router()

const {
    Register, verifyEmail, resetOtp,
    Login, AdminLogin,
    getMe, updateProfile, logout, addAddresses, delete_addresses
} = require("../controller/UserController")
const { protect, authorize } = require("../middleware/auth")

// ── Public routes ──────────────────────────────────────────────────────────────
UserRouter.post("/create",     Register)
UserRouter.post("/verify-otp", verifyEmail)
UserRouter.post("/reset-otp",  resetOtp)
UserRouter.post("/login",      Login)
UserRouter.post("/logout",     logout)

// ── Admin-only login (checks role before allowing in) ──────────────────────────
UserRouter.post("/admin-login", AdminLogin)

// ── Protected routes ───────────────────────────────────────────────────────────
UserRouter.get("/get",               protect, getMe)
UserRouter.put("/update-profile",    protect, updateProfile)
UserRouter.post("/addaddresses",     protect, addAddresses)
UserRouter.put("/deleteaddress",     protect, delete_addresses)

module.exports = UserRouter
