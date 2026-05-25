const CategoryRouter = require("express").Router()

const { CreateCategory, read, UpdateCategory, deleteCategory, readById, update } = require("../controller/CategoryController")

const fileUploader = require("express-fileupload")
const { protect, authorize } = require("../middleware/auth")
CategoryRouter.post("/create", protect, authorize("admin", "superAdmin"), fileUploader({ createParentPath: true }), CreateCategory)
CategoryRouter.get("/", read)
CategoryRouter.get("/:id", readById)
CategoryRouter.patch("/update-status/:id", protect, authorize("admin", "superAdmin"), UpdateCategory)
CategoryRouter.delete("/delete-category/:id", protect, authorize("admin", "superAdmin"), deleteCategory)
CategoryRouter.put("/update/:id", protect, authorize("admin", "superAdmin"), fileUploader({ createParentPath: true }), update)



module.exports = CategoryRouter