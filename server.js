require('dotenv').config()
const express      = require("express")
const mongoose     = require("mongoose")
const cors         = require("cors")
const cookieParser = require('cookie-parser')

const app = express()

// ── CORS must come FIRST — before body parsers and routes ─────────────────────
// This ensures OPTIONS preflight requests are handled before any middleware
// processes the request body or tries to parse cookies
const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL,      // production Vercel URL  e.g. https://swootechmart-frontend-cufw.vercel.app
    process.env.FRONTEND_URL_ALT,  // optional second frontend URL
].filter(Boolean)

console.log('[CORS] Allowed origins:', ALLOWED_ORIGINS)

app.use(cors({
    origin: function (origin, callback) {
        // Allow server-to-server calls (no Origin header) and known frontend origins
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            return callback(null, true)
        }
        console.warn('[CORS] Blocked origin:', origin)
        callback(new Error(`CORS: origin '${origin}' not allowed`))
    },
    credentials:    true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cookie'],
    exposedHeaders: ['Authorization', 'Set-Cookie'],
    methods:        ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    preflightContinue:   false,
    optionsSuccessStatus: 204,
}))

// Handle OPTIONS preflight using regex — avoids bare '*' which breaks path-to-regexp v8 (Node 24)
// app.use(cors()) above already handles OPTIONS when preflightContinue is false,
// but this explicit handler ensures preflight works for all paths on stricter hosts
app.options(/\/.*/, cors())

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(express.static("./public"))
app.use(cookieParser())

// ── Health check — Render uses this to keep the service alive ────────────────
app.get('/health', (req, res) => {
    res.status(200).json({
        status:      'ok',
        environment: process.env.NODE_ENV || 'development',
        timestamp:   new Date().toISOString(),
        uptime:      `${Math.floor(process.uptime())}s`,
        frontend:    process.env.FRONTEND_URL || '(not set)',
    })
})

// Root ping
app.get('/', (req, res) => {
    res.send('SwooTechMart backend is running')
})

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/category", require("./routers/CategoryRouter"))
app.use("/api/brand",    require("./routers/BrandRouter"))
app.use("/api/color",    require("./routers/ColorRouter"))
app.use("/api/product",  require("./routers/ProductRouter"))
app.use("/api/User",     require("./routers/UserRouter"))
app.use("/api/cart",     require("./routers/CartRounter"))
app.use("/api/order",    require("./routers/OrderRouter"))
app.use("/api/contact",  require("./routers/ContactRouter"))

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` })
})

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    // Surface CORS errors clearly
    if (err.message && err.message.startsWith('CORS:')) {
        return res.status(403).json({ success: false, message: err.message })
    }
    console.error('[Server] Unhandled error:', err.message)
    res.status(500).json({ success: false, message: 'Internal server error' })
})

// ── Database + Start ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000   // Render auto-sets PORT; 5000 for local

mongoose.connect(process.env.MONGODB_URL)
    .then(() => {
        console.log('[DB] Connected to MongoDB')
        app.listen(PORT, () => {
            console.log(`[Server] Running on port ${PORT} | ENV: ${process.env.NODE_ENV || 'development'}`)
            console.log(`[Server] FRONTEND_URL: ${process.env.FRONTEND_URL || '(not set — set this on Render)'}`)
        })
    })
    .catch(err => {
        console.error('[DB] Connection failed:', err.message)
        process.exit(1)
    })
