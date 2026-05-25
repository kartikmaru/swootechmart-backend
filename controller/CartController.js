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
                imageBaseUrl: "http://localhost:5000/category/"
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
            imageBaseUrl: "http://localhost:5000/product/"

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
            // quantity update
            existingItem.qty += Number(qty);
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


module.exports = { syncCart, addToCart }