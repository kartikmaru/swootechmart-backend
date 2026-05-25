const CartModel = require("../models/CartModel");
const orderModel = require("../models/OrderModel");
const ProductRouter = require("../routers/ProductRouter");
const { serverError, sendSuccess } = require("../Utils/Response");
const Razorpay = require('razorpay')
const crypto = require("crypto");

const create = async (req, res) => {
    try {

        var instance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_API,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const userId = req.user._id
        const { paymentMethod, address } = req.body

        const userCart = await CartModel.findOne({ userId })
            .populate({
                path: "items.productId",
                select: " _id final_price"
            });

        const productDetails = userCart.items.map((item) => {
            const { _id, final_price } = item.productId

            return {
                product_id: _id,
                qty: item.qty,
                price: final_price,
                total: (final_price * item.qty)
            }
        })

        const total_amount = productDetails.reduce((sum, item) => sum + item.total, sum = 0)

        const userOrder = await orderModel.create({

            user: userId,

            items: productDetails,

            shippingAddress: address,

            paymentMethod,

            totalAmount: total_amount,

            paymentStatus: "pending"

        })

        if (paymentMethod === "cod") {

            res.status(201).json({
                message: 'Order Placed Succesfully',
                success: true,
                order_id: userOrder._id
            })


        } else if (paymentMethod === "online") {
            var options = {
                amount: total_amount * 100,  // Amount is in currency subunits. 
                currency: "INR",
                receipt: "userOrder._id"
            };
            instance.orders.create(options, function (err, razorpayorder) {
                if (err) return sendSuccess(res, "Payment Failed")
                userOrder.razorpay_order_id = razorpayorder.id
                userOrder.paymentMethod == "online"
                userOrder.save()
                res.status(201).json({
                    message: "Order Created Successfully",
                    success: true,
                    orderId: userOrder._id,
                    payment_order_id: razorpayorder.id
                })
            });
        } else {
            serverError(res)
        }


    } catch (error) {
        console.log(error)
        return serverError(res)
    }
}

const verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;


        const order = await orderModel.findOne({ razorpay_order_id: razorpay_order_id })
        console.log(order, "order")

        // STEP 1: Create expected signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        // STEP 2: Compare signatures
        if (expectedSignature === razorpay_signature) {

            // Payment Verified
            // Yaha DB me order update karo (paid = true)
            order.razorpay_payment_id = razorpay_payment_id;
            order.paymentStatus = "paid";
            await order.save();


            return res.status(200).json({
                success: true,
                message: "Payment Verified Successfully"
            });


        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid Signature"
            });
        }

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


module.exports = { create, verifyPayment }