const { create, read, deleteColor, Update_status } = require("../controller/ColorController")
const { protect, authorize } = require("../middleware/auth")

const ColorRouter = require("express").Router()

ColorRouter.post("/create", protect, authorize("admin", "superAdmin"), create)
ColorRouter.get("/", read)
ColorRouter.delete("/delete-color/:id", protect, authorize("admin", "superAdmin"), deleteColor)
ColorRouter.patch("/update-status/:id", protect, authorize("admin", "superAdmin"), Update_status)

module.exports = ColorRouter