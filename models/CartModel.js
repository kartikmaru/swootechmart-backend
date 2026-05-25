const mongoose = require("mongoose")

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    items: [
        {
            _id: false,
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "product"
            },
            qty: {
                type: Number,
                default: 1
            }
        }
    ]
}
)

const CartModel = mongoose.model("Cart", cartSchema)

module.exports = CartModel 