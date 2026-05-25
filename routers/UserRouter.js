const UserRouter = require("express").Router()

const { Register, verifyEmail, resetOtp, Login, getMe, logout, addAddresses, delete_addresses } = require("../controller/UserController")
const { protect } = require("../middleware/auth")

UserRouter.post("/create", Register)
UserRouter.post("/verify-otp", verifyEmail)
UserRouter.post("/reset-otp", resetOtp)
UserRouter.post("/login", Login)
UserRouter.get("/get", protect, getMe)
UserRouter.post("/logout", logout)
UserRouter.post("/addaddresses", protect, addAddresses)
UserRouter.put("/deleteaddress", protect, delete_addresses)



module.exports = UserRouter