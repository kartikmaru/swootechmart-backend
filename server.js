require('dotenv').config()
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const app = express()
let cookieParser = require('cookie-parser')
app.use(express.json())
app.get("/",(req,res)=>{
    res.send("backend is running")
})
app.use(express.static("./public"))
app.use(cookieParser())


// Allowed origins: localhost dev + production Vercel frontend
const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL,          // e.g. https://swootechmart-frontend-cufw.vercel.app
].filter(Boolean);                     // remove undefined if FRONTEND_URL not set

app.use(cors({
    origin: function (origin, callback) {
        // Allow server-to-server requests (no origin) and known origins
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true)
        } else {
            callback(new Error(`CORS blocked: ${origin}`))
        }
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
}));

app.use("/api/category", require("./routers/CategoryRouter"))
app.use("/api/brand", require("./routers/BrandRouter"))
app.use("/api/color", require("./routers/ColorRouter"))
app.use("/api/product", require("./routers/ProductRouter"))
app.use("/api/User", require("./routers/UserRouter"))
app.use("/api/cart", require("./routers/CartRounter"))
app.use("/api/order", require("./routers/OrderRouter"))
app.use("/api/contact", require("./routers/ContactRouter"))

mongoose.connect(process.env.MONGODB_URL).then(
    (res) => {
        console.log("Database Connected")

        app.listen(
            5000,
            () => {
                console.log("Server Started")
            }
        )
    }
).catch(
    (error) => {
        console.log("Database not connected")
        console.log(error)
    }
)