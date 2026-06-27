const CartModel  = require("../models/CartModel");
const orderModel = require("../models/OrderModel");
const { serverError } = require("../Utils/Response");
const Razorpay = require('razorpay')
const crypto   = require("crypto");

// ── Helper ────────────────────────────────────────────────────────────────────
function getRazorpay() {
    if (!process.env.RAZORPAY_KEY_API || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error('Razorpay credentials not configured in environment variables')
    }
    return new Razorpay({
        key_id:     process.env.RAZORPAY_KEY_API,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
}

// Build product details from validated cart items
function buildProductDetails(validItems) {
    return validItems.map(item => {
        const price = Math.round(Number(item.productId.final_price) * 100) / 100
        const qty   = Number(item.qty) || 1
        return {
            product_id: item.productId._id,
            qty,
            price,
            total: Math.round(price * qty * 100) / 100,
        }
    })
}

// Calculate total from product details
function calcTotal(productDetails) {
    return Math.round(productDetails.reduce((sum, i) => sum + i.total, 0) * 100) / 100
}

// ── POST /api/order/place ─────────────────────────────────────────────────────
// COD:    creates order in DB, clears cart → returns order_id
// Online: creates Razorpay order ONLY (no DB order yet) → returns payment_order_id
//         DB order is created in /verify AFTER signature check
const create = async (req, res) => {
    try {
        const userId = req.user._id
        const { paymentMethod, address } = req.body

        console.log('[Order/place]', { userId: userId.toString(), paymentMethod, hasAddress: !!address })

        if (!paymentMethod || !address) {
            return res.status(400).json({ success: false, message: 'Payment method and address are required' })
        }

        // Always fetch cart from DB — never trust frontend-sent totals
        const userCart = await CartModel.findOne({ userId })
            .populate({ path: 'items.productId', select: '_id final_price original_price name' })

        if (!userCart || !userCart.items?.length) {
            return res.status(400).json({ success: false, message: 'Cart is empty' })
        }

        const validItems = userCart.items.filter(i => i.productId && i.productId.final_price)
        if (!validItems.length) {
            return res.status(400).json({ success: false, message: 'No valid products in cart' })
        }

        const productDetails = buildProductDetails(validItems)
        const total_amount   = calcTotal(productDetails)

        console.log('[Order/place] Cart total (₹):', total_amount, '| Items:', productDetails.length)

        // ── COD ──────────────────────────────────────────────────────────────
        if (paymentMethod === 'cod') {
            const userOrder = await orderModel.create({
                user:            userId,
                items:           productDetails,
                shippingAddress: address,
                paymentMethod:   'cod',
                totalAmount:     total_amount,
                paymentStatus:   'pending',
                orderStatus:     'placed',
            })

            // Clear cart immediately for COD
            await CartModel.findOneAndUpdate({ userId }, { $set: { items: [] } })

            console.log('[Order/place] COD order created:', userOrder._id.toString())
            return res.status(201).json({
                success:  true,
                message:  'Order Placed Successfully',
                order_id: userOrder._id,
            })
        }

        // ── Online ────────────────────────────────────────────────────────────
        // IMPORTANT: Do NOT create a DB order yet.
        // We create DB order only in /verify, after Razorpay confirms payment.
        // This way, cancelled/abandoned payments leave NO orphan orders in DB.
        if (paymentMethod === 'online') {
            const instance      = getRazorpay()
            const amountInPaise = Math.round(total_amount * 100)   // must be integer paise

            console.log('[Order/place] Creating Razorpay order, amount (paise):', amountInPaise)

            const razorpayOrder = await new Promise((resolve, reject) => {
                instance.orders.create({
                    amount:   amountInPaise,
                    currency: 'INR',
                    // receipt is just a label for your reference — not the DB order ID
                    receipt:  `u_${userId.toString().slice(-6)}_${Date.now()}`,
                    notes: {
                        userId:        userId.toString(),
                        total_rupees:  total_amount.toString(),
                    }
                }, (err, order) => {
                    if (err) reject(err)
                    else resolve(order)
                })
            })

            console.log('[Order/place] Razorpay order ID:', razorpayOrder.id)

            // Pass address + productDetails back encrypted in the response so
            // verifyPayment can use them to create the DB order.
            // We use a simple approach: store them in a temp field in Razorpay notes
            // OR pass them from frontend back to /verify.
            // Simplest secure approach: store pending order data in a temporary
            // in-memory or short-lived DB record keyed by razorpay_order_id.
            // For now, frontend will resend address to /verify (validated there again).

            return res.status(201).json({
                success:          true,
                message:          'Razorpay order created — proceed to payment',
                payment_order_id: razorpayOrder.id,     // Razorpay order ID for checkout
                amount:           amountInPaise,          // paise — pass directly to Razorpay SDK
                currency:         'INR',
                // Return address back to frontend so it can send to /verify
                // This avoids re-fetching from profile
                address_ref:      address,
            })
        }

        return res.status(400).json({ success: false, message: 'Invalid payment method' })

    } catch (error) {
        console.error('[Order/place] Error:', error.message, error.stack)
        return serverError(res)
    }
}

// ── POST /api/order/verify ────────────────────────────────────────────────────
// Called AFTER Razorpay payment completes.
// 1. Verifies HMAC signature
// 2. Only on success: creates the DB order, marks paid, clears cart
// 3. On failure: returns error (no DB order created)
const verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            address,             // address passed from frontend (originally came from /place)
            paymentMethod,       // always 'online' here
        } = req.body

        const userId = req.user._id

        console.log('[Order/verify] Verifying payment:', { razorpay_order_id, razorpay_payment_id })

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Missing payment verification fields' })
        }

        // ── STEP 1: Verify signature ──────────────────────────────────────────
        const signatureBody = `${razorpay_order_id}|${razorpay_payment_id}`
        const expectedSig   = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(signatureBody)
            .digest('hex')

        const isValid = expectedSig === razorpay_signature
        console.log('[Order/verify] Signature valid:', isValid)

        if (!isValid) {
            console.error('[Order/verify] Signature mismatch — possible tampering')
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed — signature mismatch',
            })
        }

        // ── STEP 2: Signature OK → re-fetch cart from DB to build order ───────
        const userCart = await CartModel.findOne({ userId })
            .populate({ path: 'items.productId', select: '_id final_price original_price name' })

        if (!userCart || !userCart.items?.length) {
            // Cart was already cleared or is empty — check if order already exists for this payment
            const existingOrder = await orderModel.findOne({ razorpay_order_id })
            if (existingOrder) {
                console.warn('[Order/verify] Order already exists (duplicate verify call):', existingOrder._id.toString())
                return res.status(200).json({ success: true, message: 'Payment already verified', orderId: existingOrder._id })
            }
            return res.status(400).json({ success: false, message: 'Cart is empty — cannot create order' })
        }

        // Guard: duplicate verify call
        const existing = await orderModel.findOne({ razorpay_order_id })
        if (existing) {
            console.warn('[Order/verify] Duplicate call — order already exists:', existing._id.toString())
            return res.status(200).json({ success: true, message: 'Payment already verified', orderId: existing._id })
        }

        const validItems    = userCart.items.filter(i => i.productId && i.productId.final_price)
        const productDetails = buildProductDetails(validItems)
        const total_amount   = calcTotal(productDetails)

        // Address from request body (was returned by /place and re-sent by frontend)
        const shippingAddress = address || {}

        // ── STEP 3: Create DB order — NOW, only after signature verified ──────
        const userOrder = await orderModel.create({
            user:                userId,
            items:               productDetails,
            shippingAddress,
            paymentMethod:       'online',
            totalAmount:         total_amount,
            paymentStatus:       'paid',          // already verified — mark paid immediately
            orderStatus:         'placed',
            razorpay_order_id,
            razorpay_payment_id,
            paidAt:              new Date(),
        })

        console.log('[Order/verify] DB order created and marked paid:', userOrder._id.toString())

        // ── STEP 4: Clear cart ────────────────────────────────────────────────
        await CartModel.findOneAndUpdate({ userId }, { $set: { items: [] } })

        return res.status(200).json({
            success: true,
            message: 'Payment verified and order confirmed',
            orderId: userOrder._id,
        })

    } catch (error) {
        console.error('[Order/verify] Error:', error.message, error.stack)
        return res.status(500).json({ success: false, message: 'Verification error: ' + error.message })
    }
}

// ── GET /api/order/my-orders ──────────────────────────────────────────────────
const getMyOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({ user: req.user._id })
            .populate({ path: 'items.product_id', select: 'name thumbnail slug' })
            .sort({ createdAt: -1 })
        return res.status(200).json({ success: true, data: orders, meta: { imageBaseUrl: '' } })
    } catch (error) {
        console.error('[getMyOrders] Error:', error.message, error.stack)
        return serverError(res)
    }
}

// ── GET /api/order/stats ──────────────────────────────────────────────────────
const getMyStats = async (req, res) => {
    try {
        const result = await orderModel.aggregate([
            { $match: { user: req.user._id, orderStatus: { $nin: ['cancelled'] } } },
            { $group: { _id: null, totalOrders: { $sum: 1 }, totalSpent: { $sum: '$totalAmount' } } }
        ])
        const stats = result[0] || { totalOrders: 0, totalSpent: 0 }
        return res.status(200).json({ success: true, data: { totalOrders: stats.totalOrders, totalSpent: stats.totalSpent } })
    } catch (error) {
        console.error('[getMyStats] Error:', error.message)
        return serverError(res)
    }
}

// ── GET /api/order/:id ────────────────────────────────────────────────────────
const getOrderById = async (req, res) => {
    try {
        const userId = req.user._id
        const order  = await orderModel.findById(req.params.id)
            .populate({ path: 'items.product_id', select: 'name thumbnail slug original_price final_price' })

        if (!order) return res.status(404).json({ success: false, msg: 'Order not found' })
        if (order.user.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, msg: 'Unauthorized' })
        }
        const imageBaseUrl = ''
        return res.status(200).json({ success: true, data: order, meta: { imageBaseUrl } })
    } catch (error) {
        console.error('[getOrderById] Error:', error.message, error.stack)
        return serverError(res)
    }
}

// ── PATCH /api/order/cancel/:id ───────────────────────────────────────────────
const cancelOrder = async (req, res) => {
    try {
        const userId = req.user._id
        const order  = await orderModel.findById(req.params.id)
        if (!order) return res.status(404).json({ success: false, msg: 'Order not found' })
        if (order.user.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, msg: 'Unauthorized' })
        }
        if (!['placed'].includes(order.orderStatus)) {
            const msgs = { confirmed: 'Already confirmed.', shipped: 'Already shipped.', delivered: 'Already delivered.', cancelled: 'Already cancelled.' }
            return res.status(400).json({ success: false, msg: msgs[order.orderStatus] || `Cannot cancel.` })
        }
        order.orderStatus = 'cancelled'
        if (order.paymentStatus === 'paid') order.paymentStatus = 'refund_pending'
        await order.save()
        return res.status(200).json({
            success: true,
            msg: 'Order cancelled',
            data: { _id: order._id, orderStatus: order.orderStatus, paymentStatus: order.paymentStatus }
        })
    } catch (error) {
        console.error('[cancelOrder] Error:', error.message, error.stack)
        return serverError(res)
    }
}

module.exports = { create, verifyPayment, getMyOrders, getMyStats, getOrderById, cancelOrder }
