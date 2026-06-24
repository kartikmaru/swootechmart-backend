const CartModel = require("../models/CartModel")
const UserModel = require("../models/UserModel")
const { sendSuccess, sendCreated, notFound, serverError, sendOk, deletedError, sendBadRequest, sendConflict } = require("../Utils/Response")


const syncCart = async (req, res) => {
    try {
        const userId = req.user._id;
        const parsedCart = JSON.parse(req.body.localCart) || {};
        const localCart = parsedCart.items || [];

        if (localCart.length === 0) {
            const userCart = await CartModel.findOne({ userId })
                .populate({
                    path: "items.productId",
                    select: "name _id original_price final_price discount price thumbnail stock"
                });

            return res.status(200).json({
                message: "Fetched cart from server",
                success: true,
                cart: userCart ? userCart.items : [],
                imageBaseUrl: (process.env.BACKEND_URL || "http://localhost:5000") + "/product/"
            });
        }

        let userCart = await CartModel.findOne({ userId })
            .populate({
                path: "items.productId",
                select: "name _id original_price final_price discount price thumbnail stock"
            });


        // If no cart → create new
        if (!userCart) {
            userCart = new CartModel({
                userId,
                items: []
            });
        }

        // console.log(userCart)

        // Merge local cart into DB cart
        localCart.forEach((cartItem) => {
            const { id, qty } = cartItem;
            const existingItem = userCart.items.find((item) => {

                const productId =
                    item.productId?._id?.toString() ||
                    item.productId?.toString();

                return productId === id;
            });

            if (existingItem) {
                existingItem.qty = Number(qty);
            } else {
                userCart.items.push({
                    productId: id,
                    qty: Number(qty)
                });
            }
        });

        await userCart.save();

        const populatedCart = await CartModel.findOne({ userId })
            .populate({
                path: "items.productId",
                select: "name _id original_price final_price discount price thumbnail stock"
            });


        res.status(200).json({
            message: "Cart synced successfully",
            success: true,
            cart: populatedCart,
            imageBaseUrl: (process.env.BACKEND_URL || "http://localhost:5000") + "/product/"

        });

    } catch (error) {
        console.log(error);
        return serverError(res);
    }
}

const addToCart = async (req, res) => {
    try {
        const userId = req.user._id;

        // frontend se ye data aayega
        const { productId, qty } = req.body;

        // cart find karo
        let userCart = await CartModel.findOne({ userId });

        // agar cart nahi hai to naya create karo
        if (!userCart) {
            userCart = new CartModel({
                userId,
                items: []
            });
        }

        // check product already exist karta hai ya nahi
        const existingItem = userCart.items.find(
            (item) => item.productId.toString() === productId
        );

        if (existingItem) {
            // Set qty directly — frontend already tracks qty state,
            // accumulating with += causes doubling on re-add
            existingItem.qty = Number(qty);
        } else {
            // new product add
            userCart.items.push({
                productId,
                qty: Number(qty)
            });
        }

        // save cart
        await userCart.save();

        // populated cart return
        const updatedCart = await CartModel.findOne({ userId })
            .populate({
                path: "items.productId",
                select:
                    "name _id original_price final_price discount price thumbnail stock"
            });

        return res.status(200).json({
            success: true,
            message: "Product added to cart",
            cart: updatedCart
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};


// ── DELETE /api/cart/remove — remove one product from cart ────────────────────
const removeFromCart = async (req, res) => {
    try {
        const userId    = req.user._id
        const productId = req.body.productId

        if (!productId) {
            return res.status(400).json({ success: false, message: 'productId is required' })
        }

        const userCart = await CartModel.findOne({ userId })
        if (!userCart) return res.status(404).json({ success: false, message: 'Cart not found' })

        const before = userCart.items.length
        userCart.items = userCart.items.filter(
            item => item.productId.toString() !== productId.toString()
        )

        if (userCart.items.length === before) {
            return res.status(404).json({ success: false, message: 'Item not found in cart' })
        }

        await userCart.save()
        return res.status(200).json({ success: true, message: 'Item removed from cart' })

    } catch (error) {
        console.error('[Cart/remove] Error:', error.message)
        return res.status(500).json({ success: false, message: 'Server Error' })
    }
}

// ── PUT /api/cart/update — update qty of one product ─────────────────────────
const updateCartQty = async (req, res) => {
    try {
        const userId    = req.user._id
        const { productId, qty } = req.body

        if (!productId || qty == null) {
            return res.status(400).json({ success: false, message: 'productId and qty are required' })
        }

        const userCart = await CartModel.findOne({ userId })
        if (!userCart) return res.status(404).json({ success: false, message: 'Cart not found' })

        const item = userCart.items.find(i => i.productId.toString() === productId.toString())

        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found in cart' })
        }

        const newQty = Number(qty)
        if (newQty <= 0) {
            // qty 0 or negative = remove item
            userCart.items = userCart.items.filter(i => i.productId.toString() !== productId.toString())
        } else {
            item.qty = newQty
        }

        await userCart.save()
        return res.status(200).json({ success: true, message: 'Cart updated' })

    } catch (error) {
        console.error('[Cart/update] Error:', error.message)
        return res.status(500).json({ success: false, message: 'Server Error' })
    }
}

// ── DELETE /api/cart/clear — clear entire cart ────────────────────────────────
const clearCart = async (req, res) => {
    try {
        const userId = req.user._id
        await CartModel.findOneAndUpdate({ userId }, { $set: { items: [] } })
        return res.status(200).json({ success: true, message: 'Cart cleared' })
    } catch (error) {
        console.error('[Cart/clear] Error:', error.message)
        return res.status(500).json({ success: false, message: 'Server Error' })
    }
}

module.exports = { syncCart, addToCart, removeFromCart, updateCartQty, clearCart }
