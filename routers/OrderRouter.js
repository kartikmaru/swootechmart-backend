const { protect, authorize } = require("../middleware/auth")
const { create, verifyPayment, getMyOrders, getMyStats, getOrderById, cancelOrder } = require("../controller/OrderController")

const OrderRouter = require("express").Router()

OrderRouter.post("/place",          protect, create)
OrderRouter.post("/verify",         protect, verifyPayment)
OrderRouter.get("/my-orders",       protect, getMyOrders)
OrderRouter.get("/stats",           protect, getMyStats)
OrderRouter.get("/:id",             protect, getOrderById)
OrderRouter.patch("/cancel/:id",    protect, cancelOrder)

module.exports = OrderRouter