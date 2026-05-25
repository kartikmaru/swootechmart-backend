const ProductRouter = require("express").Router()

const { create, read, upload_image, updateProduct, readById, delete_image, deleteProduct } = require("../controller/ProductController")

const fileUploader = require("express-fileupload")
const { protect, authorize } = require("../middleware/auth")

ProductRouter.post("/create", protect, authorize("admin", "superAdmin"), fileUploader({ createParentPath: true }), create)
ProductRouter.get("/", read)
ProductRouter.delete("/delete-product/:id", protect, authorize("admin", "superAdmin"), deleteProduct)
ProductRouter.get("/:id", readById)
ProductRouter.patch("/update-status/:id", protect, authorize("admin", "superAdmin"), updateProduct)
ProductRouter.post("/add-images/:id", protect, authorize("admin", "superAdmin"), fileUploader({ createParentPath: true }), upload_image)
ProductRouter.put("/delete-image/:id", protect, authorize("admin", "superAdmin"), delete_image)


module.exports = ProductRouter