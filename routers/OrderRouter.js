const { protect, authorize } = require("../middleware/auth")
const { create, verifyPayment } = require("../controller/OrderController")

const OrderRouter = require("express").Router()

OrderRouter.post("/place", protect, create)
OrderRouter.post("/verify", protect, verifyPayment);


module.exports = OrderRouter