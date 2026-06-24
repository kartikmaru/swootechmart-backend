const cartRouter = require("express").Router();

const { syncCart, addToCart, removeFromCart, updateCartQty, clearCart } = require("../controller/CartController.js");
const { protect } = require("../middleware/auth");

cartRouter.post("/sync",            protect, syncCart);
cartRouter.post("/add_to_cart",     protect, addToCart);
cartRouter.delete("/remove",        protect, removeFromCart);   // DELETE — remove one item
cartRouter.put("/update",           protect, updateCartQty);    // PUT — update item qty
cartRouter.delete("/clear",         protect, clearCart);        // DELETE — clear entire cart

module.exports = cartRouter;