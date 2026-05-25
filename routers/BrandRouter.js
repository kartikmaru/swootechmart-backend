const BrandRouter = require("express").Router()


const { createBrand, readBrand, deleteBrand, readById, update } = require("../controller/BrandController")
const fileUploader = require("express-fileupload")
const { protect, authorize } = require("../middleware/auth")


BrandRouter.post("/create", protect, authorize("admin", "superAdmin"), fileUploader({ createParentPath: true }), createBrand)
BrandRouter.get("/", readBrand)
BrandRouter.delete("/delete-brand/:id", protect, authorize("admin", "superAdmin"), deleteBrand)
BrandRouter.get("/:id", readById)
BrandRouter.put("/update/:id", protect, authorize("admin", "superAdmin"), fileUploader({ createParentPath: true }), update)

module.exports = BrandRouter