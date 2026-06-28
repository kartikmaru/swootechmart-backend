const CartModel  = require("../models/CartModel");
const orderModel = require("../models/OrderModel");
const { serverError } = require("../Utils/Response");
const Razorpay = require('razorpay')
const crypto   = require("crypto");

// ── Helper ────────────────────────────────────────────────────────────────────
// Support both RAZORPAY_KEY_API and RAZORPAY_KEY_ID (common naming variations)
function getRazorpay() {
    const key_id     = process.env.RAZORPAY_KEY_API || process.env.RAZORPAY_KEY_ID
    const key_secret = process.env.RAZORPAY_KEY_SECRET
    if (!key_id || !key_secret) {
        throw new Error(
            'Razorpay credentials not configured. ' +
            `KEY_API: ${!!process.env.RAZORPAY_KEY_API}, KEY_ID: ${!!process.env.RAZORPAY_KEY_ID}, KEY_SECRET: ${!!key_secret}`
        )
    }
    return new Razorpay({ key_id, key_secret })
}

// Build product details from validated cart items
// Maps populated cart items → OrderModel productDetailsSchema shape
function buildProductDetails(validItems) {
    return validItems.map(item => {
        // item.productId is the populated product document (guaranteed non-null by validItems filter)
        const price = Math.round(Number(item.productId.final_price) * 100) / 100
        const qty   = Number(item.qty) || 1
        return {
            product_id: item.productId._id,   // matches productDetailsSchema field name
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
        // ── Step 1: Auth & body extraction ───────────────────────────────────
        const userId = req.user?._id
        console.log('[Order/place] ▶ START', {
            userId:        userId?.toString() || 'UNDEFINED — auth failed',
            paymentMethod: req.body?.paymentMethod,
            hasAddress:    !!req.body?.address,
            bodyKeys:      Object.keys(req.body || {}),
        })

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authenticated — req.user missing' })
        }

        const { paymentMethod, address } = req.body

        if (!paymentMethod || !address) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields. paymentMethod: ${!!paymentMethod}, address: ${!!address}`,
            })
        }

        // ── Step 2: Sanitize address ──────────────────────────────────────────
        // MongoDB embedded doc sends back _id and other extra fields — strip them
        const shippingAddress = {
            fullName:    String(address.fullName    || address.name    || '').trim(),
            mobile:      String(address.mobile      || address.phone   || '').trim(),
            pincode:     String(address.pincode     || address.zip     || '').trim(),
            addressLine: String(address.addressLine || address.address || '').trim(),
            city:        String(address.city        || '').trim(),
            state:       String(address.state       || '').trim(),
            country:     String(address.country     || 'India').trim(),
        }

        console.log('[Order/place] shippingAddress:', shippingAddress)

        const missingFields = Object.entries(shippingAddress)
            .filter(([key, val]) => key !== 'country' && !val)
            .map(([key]) => key)

        if (missingFields.length > 0) {
            console.warn('[Order/place] Missing address fields:', missingFields)
            return res.status(400).json({
                success: false,
                message: `Address incomplete. Missing: ${missingFields.join(', ')}`,
            })
        }

        // ── Step 3: Fetch cart from DB ────────────────────────────────────────
        console.log('[Order/place] Fetching cart for userId:', userId.toString())
        const userCart = await CartModel.findOne({ userId })
            .populate({ path: 'items.productId', select: '_id final_price original_price name' })

        console.log('[Order/place] Cart found:', !!userCart, '| Items count:', userCart?.items?.length ?? 0)

        if (!userCart || !userCart.items?.length) {
            return res.status(400).json({
                success: false,
                message: 'Cart is empty. Please add items to cart before placing order.',
            })
        }

        // Filter out any items where product was deleted (populate returns null)
        const validItems = userCart.items.filter(
            i => i.productId && i.productId._id && i.productId.final_price
        )
        console.log('[Order/place] Valid items after filter:', validItems.length, '/', userCart.items.length)

        if (!validItems.length) {
            return res.status(400).json({
                success: false,
                message: 'No valid products in cart. Some products may have been removed.',
            })
        }

        // ── Step 4: Build order data ──────────────────────────────────────────
        const productDetails = buildProductDetails(validItems)
        const total_amount   = calcTotal(productDetails)

        console.log('[Order/place] Total ₹:', total_amount, '| Products:', productDetails.length)
        console.log('[Order/place] productDetails[0]:', productDetails[0])

        // ── COD ──────────────────────────────────────────────────────────────
        if (paymentMethod === 'cod') {
            const orderPayload = {
                user:          userId,
                items:         productDetails,
                shippingAddress,
                paymentMethod: 'cod',
                totalAmount:   total_amount,
                paymentStatus: 'pending',
                orderStatus:   'placed',
            }
            console.log('[Order/place] Creating COD order with payload:', JSON.stringify(orderPayload, null, 2))

            const userOrder = await orderModel.create(orderPayload)

            // Clear cart immediately for COD
            await CartModel.findOneAndUpdate({ userId }, { $set: { items: [] } })

            console.log('[Order/place] ✅ COD order created:', userOrder._id.toString())
            return res.status(201).json({
                success:  true,
                message:  'Order Placed Successfully',
                order_id: userOrder._id,
            })
        }

        // ── Online ────────────────────────────────────────────────────────────
        // IMPORTANT: Do NOT create a DB order yet.
        // DB order is created ONLY in /verify, after Razorpay confirms payment.
        // Cancelled/abandoned payments leave NO orphan orders in DB.
        if (paymentMethod === 'online') {
            console.log('[Order/place] Initializing Razorpay...')
            const instance      = getRazorpay()
            const amountInPaise = Math.round(total_amount * 100)   // must be integer paise

            console.log('[Order/place] Creating Razorpay order, amount (paise):', amountInPaise)

            const razorpayOrder = await new Promise((resolve, reject) => {
                instance.orders.create({
                    amount:   amountInPaise,
                    currency: 'INR',
                    receipt:  `u_${userId.toString().slice(-6)}_${Date.now()}`,
                    notes: {
                        userId:       userId.toString(),
                        total_rupees: total_amount.toString(),
                    }
                }, (err, order) => {
                    if (err) reject(err)
                    else resolve(order)
                })
            })

            console.log('[Order/place] ✅ Razorpay order created:', razorpayOrder.id)

            return res.status(201).json({
                success:          true,
                message:          'Razorpay order created — proceed to payment',
                payment_order_id: razorpayOrder.id,
                amount:           amountInPaise,
                currency:         'INR',
                address_ref:      shippingAddress,   // sanitized address echoed back for /verify
            })
        }

        return res.status(400).json({
            success: false,
            message: `Invalid paymentMethod: "${paymentMethod}". Must be "cod" or "online".`,
        })

    } catch (error) {
        // Log full error details so we can diagnose from Render logs
        console.error('[Order/place] ❌ CAUGHT ERROR:')
        console.error('  name:   ', error.name)
        console.error('  message:', error.message)
        if (error.name === 'ValidationError') {
            console.error('  Mongoose validation errors:')
            Object.entries(error.errors || {}).forEach(([field, err]) => {
                console.error(`    ${field}: ${err.message}`)
            })
        }
        console.error('  stack:  ', error.stack)
        return res.status(500).json({
            success: false,
            msg:     'Internal Server Error',
            // In development show actual error — in production keep it generic
            ...(process.env.NODE_ENV !== 'production' && { error: error.message }),
        })
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

        const userId = req.user?._id
        console.log('[Order/verify] ▶ START', {
            userId:            userId?.toString() || 'UNDEFINED',
            razorpay_order_id,
            razorpay_payment_id,
            hasAddress:        !!address,
        })

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Missing payment verification fields' })
        }

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

        const validItems     = userCart.items.filter(i => i.productId && i.productId._id && i.productId.final_price)
        const productDetails = buildProductDetails(validItems)
        const total_amount   = calcTotal(productDetails)

        // Address from request body — sanitize before saving
        const rawAddress = address || {}
        const shippingAddress = {
            fullName:    rawAddress.fullName    || '',
            mobile:      rawAddress.mobile      || '',
            pincode:     rawAddress.pincode     || '',
            addressLine: rawAddress.addressLine || '',
            city:        rawAddress.city        || '',
            state:       rawAddress.state       || '',
            country:     rawAddress.country     || 'India',
        }

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
        console.error('[Order/verify] ❌ CAUGHT ERROR:')
        console.error('  name:   ', error.name)
        console.error('  message:', error.message)
        if (error.name === 'ValidationError') {
            console.error('  Mongoose validation errors:')
            Object.entries(error.errors || {}).forEach(([field, err]) => {
                console.error(`    ${field}: ${err.message}`)
            })
        }
        console.error('  stack:  ', error.stack)
        return res.status(500).json({
            success: false,
            message: 'Verification error',
            ...(process.env.NODE_ENV !== 'production' && { error: error.message }),
        })
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
