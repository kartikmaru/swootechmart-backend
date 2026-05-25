require('dotenv').config()
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const app = express()
let cookieParser = require('cookie-parser')
app.use(express.json())
app.use(express.static("./public"))

app.use(cookieParser())

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));

app.use("/api/category", require("./routers/CategoryRouter"))
app.use("/api/brand", require("./routers/BrandRouter"))
app.use("/api/color", require("./routers/ColorRouter"))
app.use("/api/product", require("./routers/ProductRouter"))
app.use("/api/User", require("./routers/UserRouter"))
app.use("/api/cart", require("./routers/CartRounter"))
app.use("/api/order", require("./routers/OrderRouter"))

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