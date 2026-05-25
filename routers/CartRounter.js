const cartRouter = require("express").Router();

const { syncCart, addToCart } = require("../controller/CartController.js");
const { protect } = require("../middleware/auth");
cartRouter.post("/sync", protect, syncCart);
cartRouter.post("/add_to_cart", protect, addToCart);

module.exports = cartRouter;